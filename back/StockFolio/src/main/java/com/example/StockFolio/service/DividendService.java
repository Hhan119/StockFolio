package com.example.StockFolio.service;

import com.example.StockFolio.dto.DividendDto;
import com.example.StockFolio.dto.MarketDto;
import com.example.StockFolio.entity.Dividend;
import com.example.StockFolio.entity.Dividend.DividendFrequency;
import com.example.StockFolio.entity.Stock;
import com.example.StockFolio.repository.DividendRepository;
import com.example.StockFolio.repository.StockRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DividendService {

    private final DividendRepository dividendRepository;
    private final StockRepository stockRepository;
    private final MarketDataService marketDataService;

    public List<DividendDto.Response> getByPortfolio(Long portfolioId, Long userId) {
        return dividendRepository.findByPortfolioIdAndUserId(portfolioId, userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DividendDto.Response addDividend(Long stockId, DividendDto.Request request, Long userId) {
        Stock stock = stockRepository.findByIdAndUserId(stockId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + stockId));
        Dividend dividend = Dividend.builder()
                .stock(stock)
                .frequency(request.getFrequency())
                .dividendPerShare(request.getDividendPerShare())
                .amountReceived(resolveReceivedAmount(stock, request))
                .exDividendDate(request.getExDividendDate())
                .paymentDate(request.getPaymentDate())
                .paymentMonth(resolvePaymentMonth(request))
                .memo(request.getMemo())
                .build();
        return toResponse(dividendRepository.save(dividend));
    }

    @Transactional
    public DividendDto.Response addAutoDividendIfAvailable(Long stockId, Long userId) {
        if (dividendRepository.existsByStockId(stockId)) {
            return null;
        }

        Stock stock = stockRepository.findByIdAndUserId(stockId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + stockId));
        AutoDividendEstimate estimate = estimateDividend(stock);
        if (!estimate.available()) {
            return null;
        }

        Dividend dividend = Dividend.builder()
                .stock(stock)
                .frequency(estimate.frequency())
                .dividendPerShare(estimate.dividendPerShare())
                .amountReceived(estimate.dividendPerShare()
                        .multiply(BigDecimal.valueOf(stock.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP))
                .paymentMonth(estimate.paymentMonth())
                .memo("자동 배당 추정: " + estimate.source())
                .build();
        return toResponse(dividendRepository.save(dividend));
    }

    @Transactional
    public DividendDto.Response updateDividend(Long dividendId, DividendDto.Request request, Long userId) {
        Dividend dividend = dividendRepository.findByIdAndUserId(dividendId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Dividend not found: " + dividendId));
        dividend.setFrequency(request.getFrequency());
        dividend.setDividendPerShare(request.getDividendPerShare());
        dividend.setAmountReceived(resolveReceivedAmount(dividend.getStock(), request));
        dividend.setExDividendDate(request.getExDividendDate());
        dividend.setPaymentDate(request.getPaymentDate());
        dividend.setPaymentMonth(resolvePaymentMonth(request));
        dividend.setMemo(request.getMemo());
        return toResponse(dividend);
    }

    @Transactional
    public void deleteDividend(Long dividendId, Long userId) {
        Dividend dividend = dividendRepository.findByIdAndUserId(dividendId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Dividend not found: " + dividendId));
        dividendRepository.delete(dividend);
    }

    public DividendDto.AnnualSummary getAnnualSummary(Long portfolioId, Long userId) {
        List<DividendDto.Response> items = getByPortfolio(portfolioId, userId);
        List<DividendDto.MonthlySummary> monthly = new ArrayList<>();

        for (int month = 1; month <= 12; month++) {
            int currentMonth = month;
            List<DividendDto.Response> monthItems = items.stream()
                    .filter(item -> occursInMonth(item, currentMonth))
                    .toList();
            BigDecimal estimated = monthItems.stream()
                    .map(DividendDto.Response::getTotalDividend)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal received = monthItems.stream()
                    .map(item -> item.getAmountReceived() != null ? item.getAmountReceived() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            monthly.add(DividendDto.MonthlySummary.builder()
                    .month(month)
                    .monthName(Month.of(month).name())
                    .estimatedTotal(estimated)
                    .receivedTotal(received)
                    .dividendCount(monthItems.size())
                    .items(monthItems)
                    .build());
        }

        BigDecimal annualEstimated = monthly.stream()
                .map(DividendDto.MonthlySummary::getEstimatedTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalReceived = monthly.stream()
                .map(DividendDto.MonthlySummary::getReceivedTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int dividendStockCount = (int) items.stream().map(DividendDto.Response::getStockId).distinct().count();

        return DividendDto.AnnualSummary.builder()
                .annualEstimated(annualEstimated)
                .monthlyAverage(annualEstimated.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP))
                .totalReceived(totalReceived)
                .dividendStockCount(dividendStockCount)
                .monthly(monthly)
                .build();
    }

    private DividendDto.Response toResponse(Dividend dividend) {
        Stock stock = dividend.getStock();
        BigDecimal totalDividend = dividend.getDividendPerShare()
                .multiply(BigDecimal.valueOf(stock.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);

        return DividendDto.Response.builder()
                .id(dividend.getId())
                .stockId(stock.getId())
                .stockTicker(stock.getTicker())
                .stockName(stock.getName())
                .stockQuantity(stock.getQuantity())
                .frequency(dividend.getFrequency())
                .dividendPerShare(dividend.getDividendPerShare())
                .totalDividend(totalDividend)
                .amountReceived(dividend.getAmountReceived())
                .exDividendDate(dividend.getExDividendDate())
                .paymentDate(dividend.getPaymentDate())
                .paymentMonth(dividend.getPaymentMonth())
                .memo(dividend.getMemo())
                .createdAt(dividend.getCreatedAt())
                .build();
    }

    private BigDecimal resolveReceivedAmount(Stock stock, DividendDto.Request request) {
        if (request.getAmountReceived() != null) {
            return request.getAmountReceived();
        }
        return request.getDividendPerShare()
                .multiply(BigDecimal.valueOf(stock.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Integer resolvePaymentMonth(DividendDto.Request request) {
        if (request.getPaymentMonth() != null) {
            return request.getPaymentMonth();
        }
        return request.getPaymentDate() != null ? request.getPaymentDate().getMonthValue() : null;
    }

    private boolean occursInMonth(DividendDto.Response item, int month) {
        if (item.getPaymentMonth() == null) {
            return false;
        }

        int startMonth = item.getPaymentMonth();
        return switch (item.getFrequency()) {
            case MONTHLY -> true;
            case QUARTERLY -> Math.floorMod(month - startMonth, 3) == 0;
            case SEMI_ANNUAL -> Math.floorMod(month - startMonth, 6) == 0;
            case ANNUAL, SPECIAL -> month == startMonth;
        };
    }

    private AutoDividendEstimate estimateDividend(Stock stock) {
        String market = inferMarket(stock);
        String ticker = stock.getTicker() == null ? "" : stock.getTicker().trim().toUpperCase();
        String name = stock.getName() == null ? "" : stock.getName();

        MarketDto.Quote quote = marketDataService.quote(market, ticker);
        BigDecimal dividendYield = quote != null && quote.dividendYield() != null ? quote.dividendYield() : BigDecimal.ZERO;
        BigDecimal dividendPerShare = knownDividendPerShare(ticker);
        boolean hasKnownDividend = dividendPerShare.compareTo(BigDecimal.ZERO) > 0;
        DividendFrequency frequency = inferFrequency(market, ticker, name, hasKnownDividend ? BigDecimal.ONE : dividendYield);
        if (frequency == null || (!hasKnownDividend && dividendYield.compareTo(BigDecimal.ZERO) <= 0)) {
            return AutoDividendEstimate.none();
        }

        if (dividendPerShare.compareTo(BigDecimal.ZERO) <= 0 && quote != null && quote.currentPrice() != null) {
            BigDecimal annualDividend = quote.currentPrice()
                    .multiply(dividendYield)
                    .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
            dividendPerShare = annualDividend.divide(BigDecimal.valueOf(paymentsPerYear(frequency)), 4, RoundingMode.HALF_UP);
        }

        if (dividendPerShare.compareTo(BigDecimal.ZERO) <= 0) {
            return AutoDividendEstimate.none();
        }

        return new AutoDividendEstimate(
                true,
                frequency,
                dividendPerShare,
                inferPaymentMonth(market, ticker, frequency),
                quote != null ? quote.source() : "local-rule"
        );
    }

    private DividendFrequency inferFrequency(String market, String ticker, String name, BigDecimal dividendYield) {
        if (dividendYield == null || dividendYield.compareTo(BigDecimal.ZERO) <= 0) return null;
        if (isMonthlyDividend(ticker, name)) return DividendFrequency.MONTHLY;
        if (isSemiAnnualDividend(ticker, name)) return DividendFrequency.SEMI_ANNUAL;
        if ("US".equals(market)) return DividendFrequency.QUARTERLY;
        if (List.of("005930", "005935", "000660").contains(ticker)) return DividendFrequency.QUARTERLY;
        return DividendFrequency.ANNUAL;
    }

    private boolean isMonthlyDividend(String ticker, String name) {
        String upperName = name.toUpperCase();
        return List.of("O", "JEPI", "JEPQ", "QYLD", "RYLD", "XYLD", "MAIN", "STAG").contains(ticker)
                || name.contains("월배당")
                || upperName.contains("MONTHLY");
    }

    private boolean isSemiAnnualDividend(String ticker, String name) {
        String upperName = name.toUpperCase();
        return upperName.contains("SEMI")
                || name.contains("반기")
                || List.of("005380", "000270").contains(ticker);
    }

    private int paymentsPerYear(DividendFrequency frequency) {
        return switch (frequency) {
            case MONTHLY -> 12;
            case QUARTERLY -> 4;
            case SEMI_ANNUAL -> 2;
            case ANNUAL, SPECIAL -> 1;
        };
    }

    private Integer inferPaymentMonth(String market, String ticker, DividendFrequency frequency) {
        if (frequency == DividendFrequency.MONTHLY) return 1;
        if (List.of("005930", "005935", "000660").contains(ticker)) return 4;
        if ("AAPL".equals(ticker)) return 2;
        if ("SCHD".equals(ticker)) return 3;
        if (frequency == DividendFrequency.SEMI_ANNUAL) return "KR".equals(market) ? 6 : 3;
        if (frequency == DividendFrequency.QUARTERLY) return "KR".equals(market) ? 4 : 3;
        return "KR".equals(market) ? 4 : 12;
    }

    private BigDecimal knownDividendPerShare(String ticker) {
        return switch (ticker) {
            case "005930", "005935" -> BigDecimal.valueOf(361);
            case "000660" -> BigDecimal.valueOf(300);
            case "AAPL" -> BigDecimal.valueOf(0.26);
            case "SCHD" -> BigDecimal.valueOf(0.82);
            case "JEPI" -> BigDecimal.valueOf(0.40);
            case "JEPQ" -> BigDecimal.valueOf(0.45);
            case "O" -> BigDecimal.valueOf(0.27);
            default -> BigDecimal.ZERO;
        };
    }

    private String inferMarket(Stock stock) {
        String ticker = stock.getTicker() == null ? "" : stock.getTicker().trim().toUpperCase();
        if ("KRW".equalsIgnoreCase(stock.getCurrency()) || ticker.matches("\\d{5}[0-9A-Z]")) return "KR";
        return "US";
    }

    private record AutoDividendEstimate(
            boolean available,
            DividendFrequency frequency,
            BigDecimal dividendPerShare,
            Integer paymentMonth,
            String source
    ) {
        private static AutoDividendEstimate none() {
            return new AutoDividendEstimate(false, null, BigDecimal.ZERO, null, "none");
        }
    }
}
