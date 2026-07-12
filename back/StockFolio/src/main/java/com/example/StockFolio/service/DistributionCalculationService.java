package com.example.StockFolio.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.StockFolio.dto.DistributionDto;
import com.example.StockFolio.dto.DividendDto;
import com.example.StockFolio.dto.MarketDto;
import com.example.StockFolio.entity.DataStatus;
import com.example.StockFolio.entity.DistributionEvent;
import com.example.StockFolio.entity.DistributionEventStatus;
import com.example.StockFolio.entity.DistributionFrequency;
import com.example.StockFolio.entity.DistributionProfile;
import com.example.StockFolio.entity.DistributionType;
import com.example.StockFolio.entity.DistributionVolatility;
import com.example.StockFolio.entity.Dividend;
import com.example.StockFolio.entity.EstimateConfidence;
import com.example.StockFolio.entity.EstimateMethod;
import com.example.StockFolio.entity.Stock;
import com.example.StockFolio.repository.DistributionEventRepository;
import com.example.StockFolio.repository.DistributionProfileRepository;
import com.example.StockFolio.repository.DividendRepository;
import com.example.StockFolio.repository.StockRepository;
import com.example.StockFolio.util.DistributionInstrumentKeys;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DistributionCalculationService {

    private static final String MARKET_ESTIMATE_PROVIDER = "market-yield-estimate";

    private static final Set<DistributionEventStatus> ACTUAL_STATUSES = Set.of(
            DistributionEventStatus.PAID,
            DistributionEventStatus.CONFIRMED,
            DistributionEventStatus.DECLARED
    );
    private static final Set<DistributionEventStatus> EXCLUDED_STATUSES = Set.of(
            DistributionEventStatus.CANCELLED
    );

    private final DistributionEventRepository eventRepository;
    private final DistributionProfileRepository profileRepository;
    private final DividendRepository dividendRepository;
    private final StockRepository stockRepository;
    private final DistributionEstimationPolicy policy;
    private final MarketDataService marketDataService;

    @Transactional
    public DistributionDto.PortfolioDistributionSummaryResponse getPortfolioSummary(Long portfolioId, Long userId, boolean includeSpecial) {
        migrateLegacyDividends(portfolioId, userId);
        List<Stock> stocks = stockRepository.findByPortfolioIdAndUserId(portfolioId, userId);
        stocks.forEach(this::seedDistributionForStock);
        List<DistributionDto.HoldingDistributionSummaryResponse> holdings = stocks.stream()
                .map(stock -> summarizeStock(stock, includeSpecial))
                .toList();

        BigDecimal annualGross = holdings.stream()
                .map(DistributionDto.HoldingDistributionSummaryResponse::getEstimatedAnnualGrossAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal annualNet = holdings.stream()
                .map(DistributionDto.HoldingDistributionSummaryResponse::getEstimatedAnnualNetAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal ttmPerShareTotal = holdings.stream()
                .map(DistributionDto.HoldingDistributionSummaryResponse::getTrailingTwelveMonthsAmountPerShare)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int availableCount = (int) holdings.stream()
                .filter(item -> item.getEstimatedAnnualGrossAmount() != null)
                .count();

        return DistributionDto.PortfolioDistributionSummaryResponse.builder()
                .portfolioId(portfolioId)
                .estimatedAnnualGrossAmount(annualGross)
                .estimatedAnnualNetAmount(annualNet.compareTo(BigDecimal.ZERO) > 0 ? annualNet : null)
                .trailingTwelveMonthsAmountPerShareTotal(ttmPerShareTotal)
                .holdingCount(holdings.size())
                .availableHoldingCount(availableCount)
                .dataAsOf(Instant.now())
                .message("현재 보유 수량 기준 예상 분배금입니다. 과거 실제 수령액은 거래내역 등록 시 계산할 수 있습니다.")
                .holdings(holdings)
                .build();
    }

    @Transactional
    public List<DistributionDto.CalendarEventResponse> getPortfolioCalendar(Long portfolioId, Long userId, LocalDate from, LocalDate to, boolean includeSpecial) {
        migrateLegacyDividends(portfolioId, userId);
        LocalDate start = from != null ? from : LocalDate.now().withDayOfYear(1);
        LocalDate end = to != null ? to : LocalDate.now().withMonth(12).withDayOfMonth(31);
        List<DistributionDto.CalendarEventResponse> result = new ArrayList<>();

        List<Stock> stocks = stockRepository.findByPortfolioIdAndUserId(portfolioId, userId);
        stocks.forEach(this::seedDistributionForStock);
        for (Stock stock : stocks) {
            DistributionDto.HoldingDistributionSummaryResponse summary = summarizeStock(stock, includeSpecial);
            if (summary.getNextEstimatedAmountPerShare() == null) continue;
            List<LocalDate> paymentDates = projectedPaymentDates(summary, start, end);
            for (LocalDate paymentDate : paymentDates) {
                BigDecimal gross = summary.getNextEstimatedAmountPerShare()
                        .multiply(BigDecimal.valueOf(stock.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP);
                result.add(DistributionDto.CalendarEventResponse.builder()
                        .distributionEventId(null)
                        .holdingId(stock.getId())
                        .instrumentKey(summary.getInstrumentKey())
                        .ticker(stock.getTicker())
                        .instrumentName(stock.getName())
                        .exDividendDate(paymentDate.minusDays(7))
                        .paymentDate(paymentDate)
                        .amountPerShare(summary.getNextEstimatedAmountPerShare())
                        .eligibleQuantity(stock.getQuantity())
                        .estimatedGrossAmount(gross)
                        .estimatedNetAmount(null)
                        .eventStatus(summary.getNextEventStatus())
                        .distributionType(DistributionType.REGULAR)
                        .observedFrequency(summary.getObservedFrequency())
                        .estimateMethod(summary.getEstimateMethod())
                        .estimateConfidence(summary.getEstimateConfidence())
                        .currency(summary.getCurrency())
                        .isDateEstimated(true)
                        .isAmountEstimated(summary.getNextEventStatus() == DistributionEventStatus.ESTIMATED)
                        .coveredCallLike(summary.getCoveredCallLike())
                        .dataStatus(summary.getDataStatus())
                        .dataAsOf(summary.getDataAsOf())
                        .provider(summary.getProvider())
                        .build());
            }
        }

        return result.stream()
                .sorted(Comparator.comparing(DistributionDto.CalendarEventResponse::getPaymentDate)
                        .thenComparing(DistributionDto.CalendarEventResponse::getTicker))
                .toList();
    }

    @Transactional
    public DistributionDto.HoldingDistributionSummaryResponse getHoldingSummary(Long holdingId, Long userId, boolean includeSpecial) {
        Stock stock = stockRepository.findByIdAndUserId(holdingId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + holdingId));
        migrateLegacyDividends(stock.getPortfolio().getId(), userId);
        seedDistributionForStock(stock);
        return summarizeStock(stock, includeSpecial);
    }

    public List<DistributionDto.EventResponse> listInstrumentEvents(
            String instrumentId,
            LocalDate from,
            LocalDate to,
            DistributionEventStatus status,
            DistributionType distributionType,
            boolean includeSpecial,
            String currency
    ) {
        String key = resolveInstrumentKey(instrumentId);
        return eventRepository.findByInstrumentKey(key).stream()
                .filter(event -> !EXCLUDED_STATUSES.contains(event.getEventStatus()))
                .filter(event -> includeSpecial || event.getDistributionType() != DistributionType.SPECIAL)
                .filter(event -> status == null || event.getEventStatus() == status)
                .filter(event -> distributionType == null || event.getDistributionType() == distributionType)
                .filter(event -> currency == null || currency.isBlank() || currency.equalsIgnoreCase(event.getCurrency()))
                .filter(event -> isInRange(eventDate(event), from, to))
                .sorted(eventComparator().reversed())
                .map(this::toEventResponse)
                .toList();
    }

    public Optional<DistributionDto.EventResponse> latestInstrumentEvent(String instrumentId) {
        String key = resolveInstrumentKey(instrumentId);
        return sortedEvents(eventRepository.findByInstrumentKey(key), false).stream()
                .filter(event -> event.getAmountPerShare() != null)
                .findFirst()
                .map(this::toEventResponse);
    }

    public Optional<DistributionDto.ProfileResponse> getInstrumentProfile(String instrumentId) {
        String key = resolveInstrumentKey(instrumentId);
        return profileRepository.findByInstrumentKey(key).map(this::toProfileResponse);
    }

    @Transactional
    public void seedDistributionForHolding(Long holdingId, Long userId) {
        Stock stock = stockRepository.findByIdAndUserId(holdingId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + holdingId));
        seedDistributionForStock(stock);
    }

    @Transactional
    public void seedDistributionForStock(Stock stock) {
        if (stock == null || stock.getTicker() == null || stock.getTicker().isBlank()) return;

        String key = DistributionInstrumentKeys.from(stock);
        List<DistributionEvent> events = eventRepository.findByInstrumentKey(key);
        if (hasTrustedDistributionData(events)) return;

        MarketDto.Quote quote = fetchQuote(stock);
        if (quote != null && quote.source() != null && quote.source().startsWith("fallback")) {
            quote = null;
        }
        BigDecimal dividendYield = quote != null && quote.dividendYield() != null ? quote.dividendYield() : BigDecimal.ZERO;
        DistributionFrequency frequency = inferFrequencyFromQuote(stock, dividendYield);
        DataStatus profileStatus = dividendYield.compareTo(BigDecimal.ZERO) > 0 ? DataStatus.ESTIMATED : DataStatus.UNAVAILABLE;
        DistributionProfile profile = ensureProfile(
                stock,
                frequency,
                profileStatus,
                quote != null ? quote.source() : "local-inference"
        );

        BigDecimal currentPrice = quote != null && quote.currentPrice() != null && quote.currentPrice().compareTo(BigDecimal.ZERO) > 0
                ? quote.currentPrice()
                : stock.getCurrentPrice();
        int payments = paymentsPerYear(frequency);
        if (currentPrice == null || currentPrice.compareTo(BigDecimal.ZERO) <= 0 || dividendYield.compareTo(BigDecimal.ZERO) <= 0 || payments <= 0) {
            return;
        }

        BigDecimal annualAmountPerShare = currentPrice
                .multiply(dividendYield)
                .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
        BigDecimal amountPerShare = annualAmountPerShare
                .divide(BigDecimal.valueOf(payments), 6, RoundingMode.HALF_UP);
        if (amountPerShare.compareTo(BigDecimal.ZERO) <= 0) return;

        LocalDate paymentDate = nextPaymentDate(profile, events);
        if (paymentDate == null) paymentDate = LocalDate.now().plusMonths(1).withDayOfMonth(15);

        DistributionEvent event = DistributionEvent.builder()
                .instrumentKey(profile.getInstrumentKey())
                .ticker(stock.getTicker())
                .instrumentName(stock.getName())
                .market(inferMarket(stock))
                .currency(normalizeCurrency(stock.getCurrency()))
                .exDividendDate(paymentDate.minusDays(7))
                .paymentDate(paymentDate)
                .amountPerShare(amountPerShare)
                .distributionType(DistributionType.REGULAR)
                .eventStatus(DistributionEventStatus.ESTIMATED)
                .estimateMethod(EstimateMethod.TRAILING_TWELVE_MONTHS)
                .estimateConfidence(EstimateConfidence.LOW)
                .dataStatus(DataStatus.ESTIMATED)
                .rawAmountPerShare(amountPerShare)
                .provider((quote != null ? quote.source() : "market") + ":" + MARKET_ESTIMATE_PROVIDER)
                .sourceUpdatedAt(Instant.now())
                .build();
        upsertMarketEstimateEvent(event);
    }

    @Transactional
    public DistributionDto.EventResponse createManualDistribution(Long holdingId, DistributionDto.ManualDistributionRequest request, Long userId) {
        Stock stock = stockRepository.findByIdAndUserId(holdingId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + holdingId));
        DistributionProfile profile = ensureProfile(stock, request.getFrequency(), DataStatus.USER_ENTERED, "user-manual");
        DistributionEvent event = buildEventFromManualRequest(stock, request, profile.getInstrumentKey());
        return toEventResponse(saveIfAbsent(event));
    }

    @Transactional
    public DistributionDto.EventResponse createAdminDistribution(String instrumentId, DistributionDto.EventRequest request) {
        String key = normalizeInstrumentId(instrumentId, request.getCurrency());
        DistributionEvent event = DistributionEvent.builder()
                .instrumentKey(key)
                .ticker(DistributionInstrumentKeys.tickerFromKey(key))
                .currency(normalizeCurrency(request.getCurrency()))
                .declarationDate(request.getDeclarationDate())
                .exDividendDate(request.getExDividendDate())
                .recordDate(request.getRecordDate())
                .paymentDate(request.getPaymentDate())
                .amountPerShare(request.getAmountPerShare())
                .distributionType(defaultValue(request.getDistributionType(), DistributionType.REGULAR))
                .eventStatus(defaultValue(request.getEventStatus(), DistributionEventStatus.ESTIMATED))
                .estimateMethod(defaultValue(request.getEstimateMethod(), EstimateMethod.MANUAL))
                .estimateConfidence(defaultValue(request.getEstimateConfidence(), EstimateConfidence.LOW))
                .dataStatus(defaultValue(request.getDataStatus(), DataStatus.USER_ENTERED))
                .incomeAmount(request.getIncomeAmount())
                .capitalGainAmount(request.getCapitalGainAmount())
                .returnOfCapitalAmount(request.getReturnOfCapitalAmount())
                .rawAmountPerShare(request.getRawAmountPerShare() != null ? request.getRawAmountPerShare() : request.getAmountPerShare())
                .splitAdjustedAmountPerShare(request.getSplitAdjustedAmountPerShare())
                .provider(request.getProvider() != null ? request.getProvider() : "admin")
                .sourceUpdatedAt(Instant.now())
                .build();
        return toEventResponse(saveIfAbsent(event));
    }

    @Transactional
    public DistributionDto.EventResponse updateAdminDistribution(Long eventId, DistributionDto.EventRequest request) {
        DistributionEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Distribution event not found: " + eventId));
        event.setDeclarationDate(request.getDeclarationDate());
        event.setExDividendDate(request.getExDividendDate());
        event.setRecordDate(request.getRecordDate());
        event.setPaymentDate(request.getPaymentDate());
        event.setAmountPerShare(request.getAmountPerShare());
        event.setCurrency(normalizeCurrency(request.getCurrency()));
        event.setDistributionType(defaultValue(request.getDistributionType(), event.getDistributionType()));
        event.setEventStatus(defaultValue(request.getEventStatus(), event.getEventStatus()));
        event.setEstimateMethod(defaultValue(request.getEstimateMethod(), event.getEstimateMethod()));
        event.setEstimateConfidence(defaultValue(request.getEstimateConfidence(), event.getEstimateConfidence()));
        event.setDataStatus(defaultValue(request.getDataStatus(), event.getDataStatus()));
        event.setIncomeAmount(request.getIncomeAmount());
        event.setCapitalGainAmount(request.getCapitalGainAmount());
        event.setReturnOfCapitalAmount(request.getReturnOfCapitalAmount());
        event.setRawAmountPerShare(request.getRawAmountPerShare());
        event.setSplitAdjustedAmountPerShare(request.getSplitAdjustedAmountPerShare());
        event.setProvider(request.getProvider());
        event.setSourceUpdatedAt(Instant.now());
        return toEventResponse(event);
    }

    @Transactional
    public DistributionDto.ProfileResponse upsertAdminProfile(String instrumentId, DistributionDto.ProfileRequest request) {
        String key = normalizeInstrumentId(instrumentId, null);
        DistributionProfile profile = profileRepository.findByInstrumentKey(key)
                .orElseGet(() -> DistributionProfile.builder()
                        .instrumentKey(key)
                        .ticker(DistributionInstrumentKeys.tickerFromKey(key))
                        .currency(currencyFromKey(key))
                        .build());
        profile.setDeclaredFrequency(defaultValue(request.getDeclaredFrequency(), DistributionFrequency.UNKNOWN));
        profile.setObservedFrequency(defaultValue(request.getObservedFrequency(), request.getDeclaredFrequency()));
        profile.setPaymentsLast12Months(request.getPaymentsLast12Months() != null ? request.getPaymentsLast12Months() : 0);
        profile.setFrequencyConfidence(defaultValue(request.getFrequencyConfidence(), EstimateConfidence.UNAVAILABLE));
        profile.setLastDistributionDate(request.getLastDistributionDate());
        profile.setNextEstimatedExDividendDate(request.getNextEstimatedExDividendDate());
        profile.setNextEstimatedPaymentDate(request.getNextEstimatedPaymentDate());
        profile.setSource(request.getSource() != null ? request.getSource() : "admin");
        profile.setDataStatus(defaultValue(request.getDataStatus(), DataStatus.USER_ENTERED));
        profile.setSourceUpdatedAt(Instant.now());
        return toProfileResponse(profileRepository.save(profile));
    }

    @Transactional
    public DividendDto.AnnualSummary getLegacyAnnualSummary(Long portfolioId, Long userId) {
        DistributionDto.PortfolioDistributionSummaryResponse summary = getPortfolioSummary(portfolioId, userId, false);
        List<DistributionDto.CalendarEventResponse> calendar = getPortfolioCalendar(
                portfolioId,
                userId,
                LocalDate.now().withDayOfYear(1),
                LocalDate.now().withMonth(12).withDayOfMonth(31),
                false
        );
        Map<Integer, List<DistributionDto.CalendarEventResponse>> byMonth = calendar.stream()
                .collect(Collectors.groupingBy(event -> event.getPaymentDate().getMonthValue()));

        List<DividendDto.MonthlySummary> monthly = new ArrayList<>();
        for (int month = 1; month <= 12; month++) {
            List<DividendDto.Response> items = byMonth.getOrDefault(month, List.of()).stream()
                    .map(this::toLegacyDividendResponse)
                    .toList();
            BigDecimal estimated = items.stream()
                    .map(DividendDto.Response::getTotalDividend)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            monthly.add(DividendDto.MonthlySummary.builder()
                    .month(month)
                    .monthName(Month.of(month).name())
                    .estimatedTotal(estimated)
                    .receivedTotal(BigDecimal.ZERO)
                    .dividendCount(items.size())
                    .items(items)
                    .build());
        }

        BigDecimal annualEstimated = monthly.stream()
                .map(DividendDto.MonthlySummary::getEstimatedTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return DividendDto.AnnualSummary.builder()
                .annualEstimated(annualEstimated)
                .monthlyAverage(annualEstimated.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP))
                .totalReceived(BigDecimal.ZERO)
                .dividendStockCount(summary.getAvailableHoldingCount())
                .monthly(monthly)
                .build();
    }

    public DistributionDto.HoldingDistributionSummaryResponse summarizeStock(Stock stock, boolean includeSpecial) {
        String key = DistributionInstrumentKeys.from(stock);
        DistributionProfile profile = profileRepository.findByInstrumentKey(key)
                .orElseGet(() -> inferredProfile(stock, key));
        List<DistributionEvent> events = sortedEvents(eventRepository.findByInstrumentKey(key), includeSpecial);
        List<DistributionEvent> usableEvents = events.stream()
                .filter(event -> event.getAmountPerShare() != null)
                .toList();
        List<DistributionEvent> regularEvents = usableEvents.stream()
                .filter(event -> includeSpecial || event.getDistributionType() != DistributionType.SPECIAL)
                .toList();
        DistributionEvent latest = regularEvents.stream().findFirst().orElse(null);
        BigDecimal ttmPerShare = trailingTwelveMonthsPerShare(regularEvents, profile);
        BigDecimal annualGross = ttmPerShare != null
                ? ttmPerShare.multiply(BigDecimal.valueOf(stock.getQuantity())).setScale(2, RoundingMode.HALF_UP)
                : null;
        Projection projection = nextProjection(regularEvents, profile);
        BigDecimal volatilityValue = coefficientOfVariation(regularEvents);
        DistributionVolatility volatility = policy.classifyVolatility(volatilityValue);
        boolean coveredCallLike = isCoveredCallLike(stock);
        EstimateConfidence confidence = projection.confidence() != EstimateConfidence.UNAVAILABLE
                ? projection.confidence()
                : policy.confidence(actualEventCount(regularEvents), profile.getObservedFrequency(), volatility, coveredCallLike);

        return DistributionDto.HoldingDistributionSummaryResponse.builder()
                .holdingId(stock.getId())
                .instrumentKey(key)
                .ticker(stock.getTicker())
                .instrumentName(stock.getName())
                .quantity(stock.getQuantity())
                .declaredFrequency(profile.getDeclaredFrequency())
                .observedFrequency(profile.getObservedFrequency())
                .paymentsLast12Months(profile.getPaymentsLast12Months())
                .latestAmountPerShare(latest != null ? latest.getAmountPerShare() : null)
                .latestPaymentDate(latest != null ? latest.getPaymentDate() : null)
                .trailingTwelveMonthsAmountPerShare(ttmPerShare)
                .estimatedAnnualGrossAmount(annualGross)
                .estimatedAnnualNetAmount(null)
                .nextEstimatedAmountPerShare(projection.amountPerShare())
                .nextExDividendDate(projection.exDividendDate())
                .nextPaymentDate(projection.paymentDate())
                .nextEventStatus(projection.status())
                .estimateMethod(projection.method())
                .estimateConfidence(confidence)
                .distributionVolatility(volatility)
                .currency(normalizeCurrency(stock.getCurrency()))
                .dataAsOf(Instant.now())
                .provider(latest != null ? latest.getProvider() : profile.getSource())
                .dataStatus(latest != null ? latest.getDataStatus() : profile.getDataStatus())
                .coveredCallLike(coveredCallLike)
                .specialDistributionIncluded(includeSpecial && usableEvents.stream().anyMatch(event -> event.getDistributionType() == DistributionType.SPECIAL))
                .message(annualGross == null
                        ? "분배금 이력이 부족하여 0원으로 표시하지 않습니다."
                        : "최근 12개월 지급 이력 기준 예상이며 현재 보유 수량을 사용합니다.")
                .build();
    }

    private BigDecimal trailingTwelveMonthsPerShare(List<DistributionEvent> events, DistributionProfile profile) {
        LocalDate threshold = LocalDate.now().minusMonths(12);
        BigDecimal actualSum = events.stream()
                .filter(event -> ACTUAL_STATUSES.contains(event.getEventStatus()))
                .filter(event -> eventDate(event) != null && !eventDate(event).isBefore(threshold))
                .map(DistributionEvent::getAmountPerShare)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (actualSum.compareTo(BigDecimal.ZERO) > 0) {
            return actualSum.setScale(6, RoundingMode.HALF_UP);
        }

        Optional<DistributionEvent> marketEstimate = events.stream()
                .filter(this::isMarketYieldEstimate)
                .filter(event -> event.getAmountPerShare() != null && event.getAmountPerShare().compareTo(BigDecimal.ZERO) > 0)
                .findFirst();
        int payments = paymentsPerYear(profile.getObservedFrequency());
        if (marketEstimate.isPresent() && payments > 0) {
            return marketEstimate.get().getAmountPerShare()
                    .multiply(BigDecimal.valueOf(payments))
                    .setScale(6, RoundingMode.HALF_UP);
        }

        BigDecimal referenceAmount = median(events.stream()
                .limit(policy.recentSampleSize(profile.getObservedFrequency()))
                .map(DistributionEvent::getAmountPerShare)
                .filter(Objects::nonNull)
                .toList());
        if (referenceAmount == null || profile.getObservedFrequency() == DistributionFrequency.IRREGULAR) return null;
        if (payments <= 0) return null;
        return referenceAmount.multiply(BigDecimal.valueOf(payments)).setScale(6, RoundingMode.HALF_UP);
    }

    private boolean hasTrustedDistributionData(List<DistributionEvent> events) {
        return events.stream()
                .anyMatch(event -> event.getDataStatus() == DataStatus.ACTUAL
                        || ACTUAL_STATUSES.contains(event.getEventStatus())
                        || (event.getDataStatus() == DataStatus.USER_ENTERED && !isLegacyDividend(event)));
    }

    private MarketDto.Quote fetchQuote(Stock stock) {
        try {
            return marketDataService.quote(inferMarket(stock), stock.getTicker());
        } catch (Exception ignored) {
            return null;
        }
    }

    private DistributionFrequency inferFrequencyFromQuote(Stock stock, BigDecimal dividendYield) {
        DistributionFrequency frequency = inferFrequencyFromName(stock.getTicker(), stock.getName());
        if (frequency != DistributionFrequency.UNKNOWN) return frequency;
        if (dividendYield == null || dividendYield.compareTo(BigDecimal.ZERO) <= 0) return DistributionFrequency.UNKNOWN;

        String market = inferMarket(stock);
        String ticker = stock.getTicker() == null ? "" : stock.getTicker().trim().toUpperCase(Locale.ROOT);
        if (List.of("005930", "005935", "000660").contains(ticker)) return DistributionFrequency.QUARTERLY;
        if ("US".equals(market)) return DistributionFrequency.QUARTERLY;
        return DistributionFrequency.ANNUAL;
    }

    private DistributionEvent upsertMarketEstimateEvent(DistributionEvent event) {
        Optional<DistributionEvent> existing = eventRepository.findByInstrumentKey(event.getInstrumentKey()).stream()
                .filter(this::isMarketYieldEstimate)
                .max(eventComparator());
        if (existing.isEmpty()) return saveIfAbsent(event);

        DistributionEvent target = existing.get();
        target.setInstrumentName(event.getInstrumentName());
        target.setMarket(event.getMarket());
        target.setCurrency(event.getCurrency());
        target.setExDividendDate(event.getExDividendDate());
        target.setPaymentDate(event.getPaymentDate());
        target.setAmountPerShare(event.getAmountPerShare());
        target.setDistributionType(event.getDistributionType());
        target.setEventStatus(event.getEventStatus());
        target.setEstimateMethod(event.getEstimateMethod());
        target.setEstimateConfidence(event.getEstimateConfidence());
        target.setDataStatus(event.getDataStatus());
        target.setRawAmountPerShare(event.getRawAmountPerShare());
        target.setProvider(event.getProvider());
        target.setSourceUpdatedAt(event.getSourceUpdatedAt());
        return target;
    }

    private boolean isMarketYieldEstimate(DistributionEvent event) {
        return event.getProvider() != null && event.getProvider().contains(MARKET_ESTIMATE_PROVIDER);
    }

    private boolean isLegacyDividend(DistributionEvent event) {
        return "legacy-dividend".equals(event.getProvider());
    }

    private Projection nextProjection(List<DistributionEvent> events, DistributionProfile profile) {
        LocalDate today = LocalDate.now();
        Optional<DistributionEvent> declared = events.stream()
                .filter(event -> event.getAmountPerShare() != null)
                .filter(event -> event.getPaymentDate() == null || !event.getPaymentDate().isBefore(today))
                .filter(event -> event.getEventStatus() == DistributionEventStatus.DECLARED || event.getEventStatus() == DistributionEventStatus.CONFIRMED)
                .findFirst();
        if (declared.isPresent()) {
            DistributionEvent event = declared.get();
            return new Projection(
                    event.getAmountPerShare(),
                    event.getExDividendDate(),
                    event.getPaymentDate(),
                    event.getEventStatus(),
                    EstimateMethod.DECLARED_AMOUNT,
                    EstimateConfidence.HIGH
            );
        }

        if (profile.getObservedFrequency() == DistributionFrequency.IRREGULAR || profile.getObservedFrequency() == DistributionFrequency.NONE) {
            return Projection.unavailable();
        }

        LocalDate nextPaymentDate = nextPaymentDate(profile, events);
        BigDecimal seasonalMedian = sameSeasonMedian(events, nextPaymentDate);
        if (seasonalMedian != null) {
            return new Projection(
                    seasonalMedian,
                    nextPaymentDate != null ? nextPaymentDate.minusDays(7) : null,
                    nextPaymentDate,
                    DistributionEventStatus.ESTIMATED,
                    EstimateMethod.SAME_SEASON_MEDIAN,
                    EstimateConfidence.MEDIUM
            );
        }

        BigDecimal recentMedian = median(events.stream()
                .limit(policy.recentSampleSize(profile.getObservedFrequency()))
                .map(DistributionEvent::getAmountPerShare)
                .filter(Objects::nonNull)
                .toList());
        if (recentMedian == null) return Projection.unavailable();
        return new Projection(
                recentMedian,
                nextPaymentDate != null ? nextPaymentDate.minusDays(7) : null,
                nextPaymentDate,
                DistributionEventStatus.ESTIMATED,
                EstimateMethod.RECENT_MEDIAN,
                EstimateConfidence.LOW
        );
    }

    private BigDecimal sameSeasonMedian(List<DistributionEvent> events, LocalDate nextPaymentDate) {
        if (nextPaymentDate == null) return null;
        List<BigDecimal> amounts = events.stream()
                .filter(event -> eventDate(event) != null)
                .filter(event -> Math.abs(eventDate(event).getMonthValue() - nextPaymentDate.getMonthValue()) <= 1)
                .map(DistributionEvent::getAmountPerShare)
                .filter(Objects::nonNull)
                .toList();
        return amounts.size() >= 2 ? median(amounts) : null;
    }

    private BigDecimal coefficientOfVariation(List<DistributionEvent> events) {
        List<BigDecimal> amounts = events.stream()
                .filter(event -> ACTUAL_STATUSES.contains(event.getEventStatus()) || event.getDataStatus() == DataStatus.USER_ENTERED)
                .map(DistributionEvent::getAmountPerShare)
                .filter(Objects::nonNull)
                .filter(amount -> amount.compareTo(BigDecimal.ZERO) > 0)
                .toList();
        if (amounts.size() < 2) return null;
        BigDecimal average = amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(amounts.size()), 10, RoundingMode.HALF_UP);
        if (average.compareTo(BigDecimal.ZERO) == 0) return null;
        BigDecimal variance = amounts.stream()
                .map(amount -> amount.subtract(average).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(amounts.size()), 10, RoundingMode.HALF_UP);
        BigDecimal standardDeviation = BigDecimal.valueOf(Math.sqrt(variance.doubleValue())).setScale(10, RoundingMode.HALF_UP);
        return standardDeviation.divide(average, 6, RoundingMode.HALF_UP);
    }

    private BigDecimal median(List<BigDecimal> values) {
        if (values == null || values.isEmpty()) return null;
        List<BigDecimal> sorted = values.stream().sorted().toList();
        int middle = sorted.size() / 2;
        if (sorted.size() % 2 == 1) return sorted.get(middle).setScale(6, RoundingMode.HALF_UP);
        return sorted.get(middle - 1).add(sorted.get(middle))
                .divide(BigDecimal.valueOf(2), 6, RoundingMode.HALF_UP);
    }

    private List<LocalDate> projectedPaymentDates(DistributionDto.HoldingDistributionSummaryResponse summary, LocalDate from, LocalDate to) {
        DistributionFrequency frequency = summary.getObservedFrequency() != DistributionFrequency.UNKNOWN
                ? summary.getObservedFrequency()
                : summary.getDeclaredFrequency();
        if (frequency == DistributionFrequency.NONE || frequency == DistributionFrequency.IRREGULAR || frequency == DistributionFrequency.UNKNOWN) {
            return summary.getNextPaymentDate() != null && isInRange(summary.getNextPaymentDate(), from, to)
                    ? List.of(summary.getNextPaymentDate())
                    : List.of();
        }

        int interval = switch (frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMIANNUAL -> 6;
            case ANNUAL -> 12;
            case IRREGULAR, NONE, UNKNOWN -> 0;
        };
        if (interval <= 0) return List.of();

        int baseMonth = summary.getNextPaymentDate() != null ? summary.getNextPaymentDate().getMonthValue() : defaultBaseMonth(frequency);
        List<LocalDate> dates = new ArrayList<>();
        for (int year = from.getYear(); year <= to.getYear(); year++) {
            for (int month = 1; month <= 12; month++) {
                if (Math.floorMod(month - baseMonth, interval) != 0) continue;
                YearMonth ym = YearMonth.of(year, month);
                LocalDate paymentDate = ym.atDay(Math.min(15, ym.lengthOfMonth()));
                if (isInRange(paymentDate, from, to)) dates.add(paymentDate);
            }
        }
        return dates;
    }

    private LocalDate nextPaymentDate(DistributionProfile profile, List<DistributionEvent> events) {
        if (profile.getNextEstimatedPaymentDate() != null) return profile.getNextEstimatedPaymentDate();
        LocalDate latest = events.stream()
                .map(this::eventDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);
        DistributionFrequency frequency = profile.getObservedFrequency();
        int interval = switch (frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMIANNUAL -> 6;
            case ANNUAL -> 12;
            case IRREGULAR, NONE, UNKNOWN -> 0;
        };
        if (interval == 0) return null;
        if (latest != null) {
            LocalDate candidate = latest.plusMonths(interval);
            while (candidate.isBefore(LocalDate.now())) {
                candidate = candidate.plusMonths(interval);
            }
            return candidate;
        }
        int baseMonth = defaultBaseMonth(frequency);
        LocalDate candidate = YearMonth.of(LocalDate.now().getYear(), baseMonth).atDay(15);
        while (candidate.isBefore(LocalDate.now())) candidate = candidate.plusMonths(interval);
        return candidate;
    }

    private int defaultBaseMonth(DistributionFrequency frequency) {
        return switch (frequency) {
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMIANNUAL -> 6;
            case ANNUAL -> 12;
            case IRREGULAR, NONE, UNKNOWN -> 12;
        };
    }

    @Transactional
    protected void migrateLegacyDividends(Long portfolioId, Long userId) {
        List<Dividend> dividends = dividendRepository.findByPortfolioIdAndUserId(portfolioId, userId);
        for (Dividend dividend : dividends) {
            Stock stock = dividend.getStock();
            DistributionFrequency frequency = mapLegacyFrequency(dividend.getFrequency());
            DistributionProfile profile = ensureProfile(stock, frequency, legacyDataStatus(dividend), "legacy-dividend");
            DistributionEvent event = DistributionEvent.builder()
                    .instrumentKey(profile.getInstrumentKey())
                    .ticker(stock.getTicker())
                    .instrumentName(stock.getName())
                    .market(inferMarket(stock))
                    .currency(normalizeCurrency(stock.getCurrency()))
                    .exDividendDate(dividend.getExDividendDate())
                    .paymentDate(resolveLegacyPaymentDate(dividend))
                    .amountPerShare(dividend.getDividendPerShare())
                    .distributionType(dividend.getFrequency() == Dividend.DividendFrequency.SPECIAL ? DistributionType.SPECIAL : DistributionType.REGULAR)
                    .eventStatus(DistributionEventStatus.ESTIMATED)
                    .estimateMethod(EstimateMethod.MANUAL)
                    .estimateConfidence(EstimateConfidence.LOW)
                    .dataStatus(legacyDataStatus(dividend))
                    .rawAmountPerShare(dividend.getDividendPerShare())
                    .provider("legacy-dividend")
                    .sourceUpdatedAt(Instant.now())
                    .build();
            saveIfAbsent(event);
        }
    }

    private DistributionProfile ensureProfile(Stock stock, DistributionFrequency frequency, DataStatus dataStatus, String source) {
        String key = DistributionInstrumentKeys.from(stock);
        DistributionProfile profile = profileRepository.findByInstrumentKey(key)
                .orElseGet(() -> DistributionProfile.builder()
                        .instrumentKey(key)
                        .ticker(stock.getTicker())
                        .instrumentName(stock.getName())
                        .market(inferMarket(stock))
                        .currency(normalizeCurrency(stock.getCurrency()))
                        .build());
        if (frequency != null && frequency != DistributionFrequency.UNKNOWN) {
            profile.setDeclaredFrequency(frequency);
            profile.setObservedFrequency(frequency);
            profile.setPaymentsLast12Months(paymentsPerYear(frequency));
            profile.setFrequencyConfidence(EstimateConfidence.LOW);
        }
        profile.setSource(source);
        profile.setDataStatus(dataStatus);
        profile.setSourceUpdatedAt(Instant.now());
        return profileRepository.save(profile);
    }

    private DistributionProfile inferredProfile(Stock stock, String key) {
        DistributionFrequency frequency = inferFrequencyFromName(stock.getTicker(), stock.getName());
        return DistributionProfile.builder()
                .instrumentKey(key)
                .ticker(stock.getTicker())
                .instrumentName(stock.getName())
                .market(inferMarket(stock))
                .currency(normalizeCurrency(stock.getCurrency()))
                .declaredFrequency(frequency)
                .observedFrequency(frequency)
                .paymentsLast12Months(0)
                .frequencyConfidence(frequency == DistributionFrequency.UNKNOWN ? EstimateConfidence.UNAVAILABLE : EstimateConfidence.LOW)
                .source("local-inference")
                .dataStatus(frequency == DistributionFrequency.UNKNOWN ? DataStatus.UNAVAILABLE : DataStatus.ESTIMATED)
                .sourceUpdatedAt(Instant.now())
                .build();
    }

    private DistributionEvent buildEventFromManualRequest(Stock stock, DistributionDto.ManualDistributionRequest request, String key) {
        return DistributionEvent.builder()
                .instrumentKey(key)
                .ticker(stock.getTicker())
                .instrumentName(stock.getName())
                .market(inferMarket(stock))
                .currency(normalizeCurrency(request.getCurrency() != null ? request.getCurrency() : stock.getCurrency()))
                .declarationDate(request.getDeclarationDate())
                .exDividendDate(request.getExDividendDate())
                .recordDate(request.getRecordDate())
                .paymentDate(request.getPaymentDate())
                .amountPerShare(request.getAmountPerShare())
                .distributionType(defaultValue(request.getDistributionType(), DistributionType.REGULAR))
                .eventStatus(defaultValue(request.getEventStatus(), DistributionEventStatus.ESTIMATED))
                .estimateMethod(defaultValue(request.getEstimateMethod(), EstimateMethod.MANUAL))
                .estimateConfidence(defaultValue(request.getEstimateConfidence(), EstimateConfidence.LOW))
                .dataStatus(DataStatus.USER_ENTERED)
                .rawAmountPerShare(request.getAmountPerShare())
                .provider("user-manual")
                .sourceUpdatedAt(Instant.now())
                .build();
    }

    private DistributionEvent saveIfAbsent(DistributionEvent event) {
        boolean exists = eventRepository.existsByInstrumentKeyAndExDividendDateAndPaymentDateAndAmountPerShareAndDistributionType(
                event.getInstrumentKey(),
                event.getExDividendDate(),
                event.getPaymentDate(),
                event.getAmountPerShare(),
                event.getDistributionType()
        );
        return exists ? eventRepository.findByInstrumentKey(event.getInstrumentKey()).stream()
                .filter(existing -> Objects.equals(existing.getExDividendDate(), event.getExDividendDate()))
                .filter(existing -> Objects.equals(existing.getPaymentDate(), event.getPaymentDate()))
                .filter(existing -> existing.getAmountPerShare().compareTo(event.getAmountPerShare()) == 0)
                .filter(existing -> existing.getDistributionType() == event.getDistributionType())
                .findFirst()
                .orElse(event)
                : eventRepository.save(event);
    }

    private DividendDto.Response toLegacyDividendResponse(DistributionDto.CalendarEventResponse event) {
        return DividendDto.Response.builder()
                .id(event.getDistributionEventId())
                .stockId(event.getHoldingId())
                .stockTicker(event.getTicker())
                .stockName(event.getInstrumentName())
                .stockQuantity(event.getEligibleQuantity())
                .frequency(mapLegacyFrequency(event.getObservedFrequency(), event.getDistributionType()))
                .dividendPerShare(event.getAmountPerShare())
                .totalDividend(event.getEstimatedGrossAmount())
                .amountReceived(null)
                .exDividendDate(event.getExDividendDate())
                .paymentDate(event.getPaymentDate())
                .paymentMonth(event.getPaymentDate() != null ? event.getPaymentDate().getMonthValue() : null)
                .distributionEventStatus(event.getEventStatus())
                .distributionType(event.getDistributionType())
                .estimateMethod(event.getEstimateMethod())
                .estimateConfidence(event.getEstimateConfidence())
                .dataStatus(event.getDataStatus())
                .provider(event.getProvider())
                .dataAsOf(event.getDataAsOf())
                .isDateEstimated(event.getIsDateEstimated())
                .isAmountEstimated(event.getIsAmountEstimated())
                .message("현재 보유 수량 기준 예상 분배금")
                .build();
    }

    private Dividend.DividendFrequency mapLegacyFrequency(DistributionFrequency frequency, DistributionType distributionType) {
        if (distributionType == DistributionType.SPECIAL) return Dividend.DividendFrequency.SPECIAL;
        if (frequency == null) return Dividend.DividendFrequency.ANNUAL;
        return switch (frequency) {
            case MONTHLY -> Dividend.DividendFrequency.MONTHLY;
            case QUARTERLY -> Dividend.DividendFrequency.QUARTERLY;
            case SEMIANNUAL -> Dividend.DividendFrequency.SEMI_ANNUAL;
            case ANNUAL, IRREGULAR, NONE, UNKNOWN -> Dividend.DividendFrequency.ANNUAL;
        };
    }

    private DistributionDto.EventResponse toEventResponse(DistributionEvent event) {
        return DistributionDto.EventResponse.builder()
                .distributionEventId(event.getId())
                .instrumentKey(event.getInstrumentKey())
                .ticker(event.getTicker())
                .instrumentName(event.getInstrumentName())
                .declarationDate(event.getDeclarationDate())
                .exDividendDate(event.getExDividendDate())
                .recordDate(event.getRecordDate())
                .paymentDate(event.getPaymentDate())
                .amountPerShare(event.getAmountPerShare())
                .currency(event.getCurrency())
                .distributionType(event.getDistributionType())
                .eventStatus(event.getEventStatus())
                .estimateMethod(event.getEstimateMethod())
                .estimateConfidence(event.getEstimateConfidence())
                .dataStatus(event.getDataStatus())
                .incomeAmount(event.getIncomeAmount())
                .capitalGainAmount(event.getCapitalGainAmount())
                .returnOfCapitalAmount(event.getReturnOfCapitalAmount())
                .rawAmountPerShare(event.getRawAmountPerShare())
                .splitAdjustedAmountPerShare(event.getSplitAdjustedAmountPerShare())
                .provider(event.getProvider())
                .sourceUpdatedAt(event.getSourceUpdatedAt())
                .build();
    }

    private DistributionDto.ProfileResponse toProfileResponse(DistributionProfile profile) {
        return DistributionDto.ProfileResponse.builder()
                .id(profile.getId())
                .instrumentKey(profile.getInstrumentKey())
                .ticker(profile.getTicker())
                .instrumentName(profile.getInstrumentName())
                .market(profile.getMarket())
                .currency(profile.getCurrency())
                .declaredFrequency(profile.getDeclaredFrequency())
                .observedFrequency(profile.getObservedFrequency())
                .paymentsLast12Months(profile.getPaymentsLast12Months())
                .frequencyConfidence(profile.getFrequencyConfidence())
                .lastDistributionDate(profile.getLastDistributionDate())
                .nextEstimatedExDividendDate(profile.getNextEstimatedExDividendDate())
                .nextEstimatedPaymentDate(profile.getNextEstimatedPaymentDate())
                .source(profile.getSource())
                .dataStatus(profile.getDataStatus())
                .sourceUpdatedAt(profile.getSourceUpdatedAt())
                .build();
    }

    private List<DistributionEvent> sortedEvents(List<DistributionEvent> events, boolean includeSpecial) {
        return events.stream()
                .filter(event -> !EXCLUDED_STATUSES.contains(event.getEventStatus()))
                .filter(event -> includeSpecial || event.getDistributionType() != DistributionType.SPECIAL)
                .sorted(eventComparator().reversed())
                .toList();
    }

    private Comparator<DistributionEvent> eventComparator() {
        return Comparator.comparing((DistributionEvent event) -> Optional.ofNullable(eventDate(event)).orElse(LocalDate.MIN))
                .thenComparing(DistributionEvent::getId, Comparator.nullsFirst(Long::compareTo));
    }

    private LocalDate eventDate(DistributionEvent event) {
        return event.getPaymentDate() != null ? event.getPaymentDate() : event.getExDividendDate();
    }

    private boolean isInRange(LocalDate date, LocalDate from, LocalDate to) {
        if (date == null) return false;
        if (from != null && date.isBefore(from)) return false;
        return to == null || !date.isAfter(to);
    }

    private int actualEventCount(List<DistributionEvent> events) {
        return (int) events.stream().filter(event -> ACTUAL_STATUSES.contains(event.getEventStatus())).count();
    }

    private int paymentsPerYear(DistributionFrequency frequency) {
        if (frequency == null) return 0;
        return switch (frequency) {
            case MONTHLY -> 12;
            case QUARTERLY -> 4;
            case SEMIANNUAL -> 2;
            case ANNUAL -> 1;
            case IRREGULAR, NONE, UNKNOWN -> 0;
        };
    }

    private DistributionFrequency mapLegacyFrequency(Dividend.DividendFrequency frequency) {
        if (frequency == null) return DistributionFrequency.UNKNOWN;
        return switch (frequency) {
            case MONTHLY -> DistributionFrequency.MONTHLY;
            case QUARTERLY -> DistributionFrequency.QUARTERLY;
            case SEMI_ANNUAL -> DistributionFrequency.SEMIANNUAL;
            case ANNUAL -> DistributionFrequency.ANNUAL;
            case SPECIAL -> DistributionFrequency.IRREGULAR;
        };
    }

    private LocalDate resolveLegacyPaymentDate(Dividend dividend) {
        if (dividend.getPaymentDate() != null) return dividend.getPaymentDate();
        Integer month = dividend.getPaymentMonth();
        if (month == null || month < 1 || month > 12) month = defaultBaseMonth(mapLegacyFrequency(dividend.getFrequency()));
        return YearMonth.of(LocalDate.now().getYear(), month).atDay(15);
    }

    private DataStatus legacyDataStatus(Dividend dividend) {
        String memo = dividend.getMemo() == null ? "" : dividend.getMemo().toLowerCase(Locale.ROOT);
        return memo.contains("auto") || memo.contains("mock") || memo.contains("추정") ? DataStatus.MOCK : DataStatus.USER_ENTERED;
    }

    private DistributionFrequency inferFrequencyFromName(String ticker, String name) {
        String normalizedTicker = ticker == null ? "" : ticker.trim().toUpperCase();
        String normalizedName = name == null ? "" : name.toUpperCase(Locale.ROOT);
        if (List.of(
                "NVDY", "TSLY", "CONY", "MSTY", "YMAX", "YMAG", "FEPI", "AIPI", "SPYI", "QQQI", "JEPY", "QQQY",
                "XDTE", "QDTE", "RDTE", "BIL", "SGOV", "USFR"
        ).contains(normalizedTicker)
                || normalizedName.contains("PREMIUM INCOME")
                || normalizedName.contains("YIELDMAX")
                || normalizedName.contains("월배당")
                || normalizedName.contains("월분배")
                || normalizedName.contains("매월")
                || normalizedName.contains("커버드콜")) {
            return DistributionFrequency.MONTHLY;
        }
        if (normalizedName.contains("반기") || normalizedName.contains("SEMI")) {
            return DistributionFrequency.SEMIANNUAL;
        }
        if (List.of("DGRO", "NOBL", "SDY", "IVV", "SPLG", "VIG", "VUG", "IWM", "VNQ", "EFA", "EEM", "005930", "005935", "000660").contains(normalizedTicker)
                || normalizedName.contains("분기")
                || normalizedName.contains("QUARTERLY")) {
            return DistributionFrequency.QUARTERLY;
        }
        if (List.of("JEPI", "JEPQ", "QYLD", "RYLD", "XYLD", "DIA", "O", "TLT", "IEF", "SHY", "BND", "AGG", "HYG", "LQD").contains(normalizedTicker)
                || normalizedName.contains("MONTHLY")
                || normalizedName.contains("COVERED CALL")
                || normalizedName.contains("월배당")
                || normalizedName.contains("커버드콜")) {
            return DistributionFrequency.MONTHLY;
        }
        if (List.of("SCHD", "VOO", "SPY", "VTI", "QQQ", "QQQM", "VYM", "HDV", "AAPL").contains(normalizedTicker)) {
            return DistributionFrequency.QUARTERLY;
        }
        return DistributionFrequency.UNKNOWN;
    }

    private boolean isCoveredCallLike(Stock stock) {
        String text = ((stock.getTicker() == null ? "" : stock.getTicker()) + " " + (stock.getName() == null ? "" : stock.getName()))
                .toUpperCase(Locale.ROOT);
        return text.contains("COVERED CALL")
                || text.contains("YIELDMAX")
                || text.contains("PREMIUM INCOME")
                || text.contains("커버드콜")
                || List.of("JEPI", "JEPQ", "QYLD", "RYLD", "XYLD", "NVDY", "TSLY", "CONY", "MSTY").contains(stock.getTicker());
    }

    private String resolveInstrumentKey(String instrumentId) {
        if (instrumentId == null || instrumentId.isBlank()) return "UNKNOWN:KRW";
        String normalized = instrumentId.trim().toUpperCase();
        if (normalized.contains(":")) return normalized;
        return profileRepository.findByTickerIgnoreCase(normalized).stream()
                .findFirst()
                .map(DistributionProfile::getInstrumentKey)
                .orElseGet(() -> eventRepository.findByTickerIgnoreCase(normalized).stream()
                        .findFirst()
                        .map(DistributionEvent::getInstrumentKey)
                        .orElse(normalizeInstrumentId(normalized, null)));
    }

    private String normalizeInstrumentId(String instrumentId, String currency) {
        if (instrumentId == null || instrumentId.isBlank()) return DistributionInstrumentKeys.from("UNKNOWN", currency);
        if (instrumentId.contains(":")) return instrumentId.trim().toUpperCase();
        return DistributionInstrumentKeys.from(instrumentId, currency);
    }

    private String currencyFromKey(String key) {
        if (key == null || !key.contains(":")) return "KRW";
        return key.substring(key.indexOf(':') + 1);
    }

    private String normalizeCurrency(String currency) {
        return currency == null || currency.isBlank() ? "KRW" : currency.trim().toUpperCase();
    }

    private String inferMarket(Stock stock) {
        String ticker = stock.getTicker() == null ? "" : stock.getTicker().trim().toUpperCase();
        if ("KRW".equalsIgnoreCase(stock.getCurrency()) || ticker.matches("\\d{5}[0-9A-Z]")) return "KR";
        return "US";
    }

    private <T> T defaultValue(T value, T defaultValue) {
        return value != null ? value : defaultValue;
    }

    private record Projection(
            BigDecimal amountPerShare,
            LocalDate exDividendDate,
            LocalDate paymentDate,
            DistributionEventStatus status,
            EstimateMethod method,
            EstimateConfidence confidence
    ) {
        private static Projection unavailable() {
            return new Projection(null, null, null, DistributionEventStatus.ESTIMATED, EstimateMethod.UNAVAILABLE, EstimateConfidence.UNAVAILABLE);
        }
    }
}
