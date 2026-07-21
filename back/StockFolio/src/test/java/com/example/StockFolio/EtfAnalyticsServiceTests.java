package com.example.StockFolio;

import com.example.StockFolio.dto.EtfAnalyticsDto;
import com.example.StockFolio.dto.MarketDto;
import com.example.StockFolio.service.EtfAnalyticsService;
import com.example.StockFolio.service.MarketDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EtfAnalyticsServiceTests {

    @Mock
    private MarketDataService marketDataService;

    private EtfAnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new EtfAnalyticsService(marketDataService);
    }

    @Test
    void standardizesClassificationDistributionAndDataQuality() {
        when(marketDataService.instrumentSnapshot("US", "JEPI")).thenReturn(snapshot(
                "US", "JEPI", "JPMorgan Equity Premium Income Covered Call ETF",
                monthlyDividends("JEPI"),
                List.of(holding("MSFT", 12), holding("AMZN", 8))
        ));

        EtfAnalyticsDto.StandardizedEtf result = service.getEtf("US", "JEPI");

        assertThat(result.classification().coveredCall()).isTrue();
        assertThat(result.classification().distributionFrequency()).isEqualTo("MONTHLY");
        assertThat(result.classification().peerGroup()).isEqualTo("US_COVERED_CALL");
        assertThat(result.metrics().paymentCountTtm()).isGreaterThanOrEqualTo(10);
        assertThat(result.metrics().distributionCagrThreeYear()).isNotNull();
        assertThat(result.dataQuality().status()).isEqualTo("ANALYZABLE");
        assertThat(result.snapshot().sources()).contains("test-provider");
    }

    @Test
    void comparesHoldingOverlapWithoutInventingMissingRiskMetrics() {
        when(marketDataService.instrumentSnapshot(anyString(), anyString())).thenAnswer(invocation -> {
            String ticker = invocation.getArgument(1);
            return "AAA".equals(ticker)
                    ? snapshot("US", "AAA", "Alpha ETF", monthlyDividends("AAA"), List.of(holding("MSFT", 60), holding("AAPL", 40)))
                    : snapshot("US", "BBB", "Beta ETF", monthlyDividends("BBB"), List.of(holding("MSFT", 20), holding("NVDA", 80)));
        });

        EtfAnalyticsDto.CompareResponse result = service.compare(List.of("AAA", "BBB"));

        assertThat(result.items()).hasSize(2);
        assertThat(result.overlaps()).hasSize(1);
        assertThat(result.overlaps().get(0).overlapPercent()).isEqualByComparingTo("20.00");
        assertThat(result.items().get(0).metrics().sharpeRatio()).isNull();
    }

    private MarketDto.InstrumentSnapshot snapshot(
            String market,
            String ticker,
            String name,
            List<MarketDto.DividendEvent> dividends,
            List<MarketDto.EtfHolding> holdings
    ) {
        MarketDto.Quote quote = new MarketDto.Quote(
                market, ticker, name, "USD", bd(100), bd(99), bd(1.01), "$10B",
                null, null, bd(4), "test-provider"
        );
        MarketDto.EtfProfile profile = new MarketDto.EtfProfile(
                market, ticker, name, "USD", "NYSE Arca", "Test Provider", "Equity",
                "Test Index", "Covered call dividend strategy", "2020-01-01", bd(100), bd(1_000_000_000),
                bd(0.35), bd(1), bd(2), bd(8), bd(20), null, bd(5), bd(5), holdings.size(), "test-provider"
        );
        return new MarketDto.InstrumentSnapshot(
                market, ticker, name, true, quote, profile, holdings, dividends, List.of(),
                Instant.parse("2026-07-21T00:00:00Z"), List.of("test-provider")
        );
    }

    private List<MarketDto.DividendEvent> monthlyDividends(String ticker) {
        List<MarketDto.DividendEvent> events = new ArrayList<>();
        for (int year = 2023; year <= 2026; year++) {
            int months = year == 2026 ? 7 : 12;
            BigDecimal amount = BigDecimal.valueOf(0.20 + (year - 2023) * 0.02);
            for (int month = 1; month <= months; month++) {
                events.add(new MarketDto.DividendEvent(
                        "US", ticker, "USD", LocalDate.of(year, month, 10), LocalDate.of(year, month, 20), amount, "test-provider"
                ));
            }
        }
        return events;
    }

    private MarketDto.EtfHolding holding(String ticker, double weight) {
        return new MarketDto.EtfHolding(ticker, ticker, bd(weight), null, null, "test-provider");
    }

    private BigDecimal bd(double value) {
        return BigDecimal.valueOf(value);
    }
}
