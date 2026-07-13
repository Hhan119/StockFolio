package com.example.StockFolio;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.StockFolio.dto.DistributionDto;
import com.example.StockFolio.entity.DataStatus;
import com.example.StockFolio.entity.DistributionEvent;
import com.example.StockFolio.entity.DistributionEventStatus;
import com.example.StockFolio.entity.DistributionFrequency;
import com.example.StockFolio.entity.DistributionProfile;
import com.example.StockFolio.entity.DistributionType;
import com.example.StockFolio.entity.EstimateConfidence;
import com.example.StockFolio.entity.EstimateMethod;
import com.example.StockFolio.entity.Portfolio;
import com.example.StockFolio.entity.Stock;
import com.example.StockFolio.entity.User;
import com.example.StockFolio.repository.DistributionEventRepository;
import com.example.StockFolio.repository.DistributionProfileRepository;
import com.example.StockFolio.repository.PortfolioRepository;
import com.example.StockFolio.repository.StockRepository;
import com.example.StockFolio.repository.UserRepository;
import com.example.StockFolio.service.DistributionCalculationService;
import com.example.StockFolio.util.DistributionInstrumentKeys;

@SpringBootTest
@Transactional
class DistributionCalculationServiceTests {

    @Autowired
    private DistributionCalculationService distributionCalculationService;

    @Autowired
    private DistributionEventRepository eventRepository;

    @Autowired
    private DistributionProfileRepository profileRepository;

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void calculatesTrailingTwelveMonthAnnualGrossFromActualRegularEvents() {
        Stock stock = saveHolding("SCHD", "Schwab US Dividend Equity ETF", 100, "USD");
        saveProfile(stock, DistributionFrequency.QUARTERLY);
        saveEvent(stock, "0.20", LocalDate.now().minusMonths(9), DistributionType.REGULAR);
        saveEvent(stock, "0.22", LocalDate.now().minusMonths(6), DistributionType.REGULAR);
        saveEvent(stock, "0.24", LocalDate.now().minusMonths(3), DistributionType.REGULAR);
        saveEvent(stock, "0.26", LocalDate.now().minusDays(5), DistributionType.REGULAR);

        DistributionDto.PortfolioDistributionSummaryResponse summary =
                distributionCalculationService.getPortfolioSummary(stock.getPortfolio().getId(), stock.getPortfolio().getUser().getId(), false);

        assertThat(summary.getHoldings()).hasSize(1);
        DistributionDto.HoldingDistributionSummaryResponse holding = summary.getHoldings().get(0);
        assertThat(holding.getLatestAmountPerShare()).isEqualByComparingTo("0.260000");
        assertThat(holding.getTrailingTwelveMonthsAmountPerShare()).isEqualByComparingTo("0.920000");
        assertThat(holding.getEstimatedAnnualGrossAmount()).isEqualByComparingTo("92.00");
    }

    @Test
    void excludesSpecialDistributionsByDefaultAndIncludesThemWhenRequested() {
        Stock stock = saveHolding("MOCK", "Mock Dividend ETF", 10, "USD");
        saveProfile(stock, DistributionFrequency.QUARTERLY);
        saveEvent(stock, "1.00", LocalDate.now().minusMonths(3), DistributionType.REGULAR);
        saveEvent(stock, "5.00", LocalDate.now().minusMonths(2), DistributionType.SPECIAL);

        DistributionDto.PortfolioDistributionSummaryResponse regularOnly =
                distributionCalculationService.getPortfolioSummary(stock.getPortfolio().getId(), stock.getPortfolio().getUser().getId(), false);
        DistributionDto.PortfolioDistributionSummaryResponse withSpecial =
                distributionCalculationService.getPortfolioSummary(stock.getPortfolio().getId(), stock.getPortfolio().getUser().getId(), true);

        assertThat(regularOnly.getHoldings().get(0).getEstimatedAnnualGrossAmount()).isEqualByComparingTo("10.00");
        assertThat(withSpecial.getHoldings().get(0).getEstimatedAnnualGrossAmount()).isEqualByComparingTo("60.00");
        assertThat(withSpecial.getHoldings().get(0).getSpecialDistributionIncluded()).isTrue();
    }

    @Test
    void returnsUnavailableInsteadOfZeroWhenDistributionDataIsMissing() {
        Stock stock = saveHolding("NOPE", "No Distribution Stock", 3, "USD");

        DistributionDto.HoldingDistributionSummaryResponse summary =
                distributionCalculationService.getHoldingSummary(stock.getId(), stock.getPortfolio().getUser().getId(), false);

        assertThat(summary.getEstimatedAnnualGrossAmount()).isNull();
        assertThat(summary.getNextEstimatedAmountPerShare()).isNull();
        assertThat(summary.getDataStatus()).isEqualTo(DataStatus.UNAVAILABLE);
        assertThat(summary.getMessage()).contains("0원으로 표시하지 않습니다");
    }

    @Test
    void usesLatestMarketHistoryOrEstimateForKoreanCoveredCallEtf() {
        Stock stock = saveHolding("475720", "TIGER 미국테크TOP10+10%프리미엄", 10, "KRW");
        stock.setCurrentPrice(new BigDecimal("10000"));
        stockRepository.save(stock);

        DistributionDto.HoldingDistributionSummaryResponse summary =
                distributionCalculationService.getHoldingSummary(stock.getId(), stock.getPortfolio().getUser().getId(), false);

        assertThat(summary.getObservedFrequency()).isEqualTo(DistributionFrequency.MONTHLY);
        assertThat(summary.getDataStatus()).isIn(DataStatus.ACTUAL, DataStatus.ESTIMATED);
        assertThat(summary.getLatestAmountPerShare()).isGreaterThan(BigDecimal.ZERO);
        assertThat(summary.getEstimatedAnnualGrossAmount()).isGreaterThan(BigDecimal.ZERO);
        assertThat(summary.getProvider()).doesNotContain("mock");
    }

    @Test
    void usesLatestMarketHistoryOrEstimateForKoreanBroadMarketEtf() {
        Stock stock = saveHolding("360750", "TIGER 미국S&P500", 8, "KRW");
        stock.setCurrentPrice(new BigDecimal("20000"));
        stockRepository.save(stock);

        DistributionDto.HoldingDistributionSummaryResponse summary =
                distributionCalculationService.getHoldingSummary(stock.getId(), stock.getPortfolio().getUser().getId(), false);

        assertThat(summary.getObservedFrequency()).isEqualTo(DistributionFrequency.QUARTERLY);
        assertThat(summary.getDataStatus()).isIn(DataStatus.ACTUAL, DataStatus.ESTIMATED);
        assertThat(summary.getLatestAmountPerShare()).isGreaterThan(BigDecimal.ZERO);
        assertThat(summary.getEstimatedAnnualGrossAmount()).isGreaterThan(BigDecimal.ZERO);
        assertThat(summary.getProvider()).doesNotContain("mock");
    }

    private Stock saveHolding(String ticker, String name, int quantity, String currency) {
        User user = userRepository.save(User.builder()
                .username("user-" + ticker + "-" + System.nanoTime())
                .password("password")
                .email(ticker.toLowerCase() + "@stockfolio.test")
                .build());
        Portfolio portfolio = portfolioRepository.save(Portfolio.builder()
                .user(user)
                .name("Test Portfolio")
                .build());
        return stockRepository.save(Stock.builder()
                .portfolio(portfolio)
                .ticker(ticker)
                .name(name)
                .quantity(quantity)
                .avgPrice(BigDecimal.TEN)
                .currentPrice(BigDecimal.TEN)
                .currency(currency)
                .build());
    }

    private void saveProfile(Stock stock, DistributionFrequency frequency) {
        profileRepository.save(DistributionProfile.builder()
                .instrumentKey(DistributionInstrumentKeys.from(stock))
                .ticker(stock.getTicker())
                .instrumentName(stock.getName())
                .currency(stock.getCurrency())
                .declaredFrequency(frequency)
                .observedFrequency(frequency)
                .paymentsLast12Months(4)
                .frequencyConfidence(EstimateConfidence.MEDIUM)
                .source("test")
                .dataStatus(DataStatus.ACTUAL)
                .sourceUpdatedAt(Instant.now())
                .build());
    }

    private void saveEvent(Stock stock, String amount, LocalDate paymentDate, DistributionType distributionType) {
        eventRepository.save(DistributionEvent.builder()
                .instrumentKey(DistributionInstrumentKeys.from(stock))
                .ticker(stock.getTicker())
                .instrumentName(stock.getName())
                .currency(stock.getCurrency())
                .paymentDate(paymentDate)
                .amountPerShare(new BigDecimal(amount))
                .distributionType(distributionType)
                .eventStatus(DistributionEventStatus.PAID)
                .estimateMethod(EstimateMethod.DECLARED_AMOUNT)
                .estimateConfidence(EstimateConfidence.HIGH)
                .dataStatus(DataStatus.ACTUAL)
                .provider("test")
                .sourceUpdatedAt(Instant.now())
                .build());
    }
}
