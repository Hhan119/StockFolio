package com.example.StockFolio.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;

public class MarketDto {

    public record SearchResult(
            String market,
            String ticker,
            String name,
            String currency,
            String exchange,
            BigDecimal currentPrice,
            Boolean dividendAvailable,
            String source
    ) {}

    public record Quote(
            String market,
            String ticker,
            String name,
            String currency,
            BigDecimal currentPrice,
            BigDecimal previousClose,
            BigDecimal changeRate,
            String marketCap,
            BigDecimal per,
            BigDecimal pbr,
            BigDecimal dividendYield,
            String source
    ) {}

    public record StockDetail(
            String ticker,
            String name,
            String market,
            BigDecimal currentPrice,
            BigDecimal changeRate,
            String marketCap,
            BigDecimal per,
            BigDecimal pbr,
            BigDecimal dividendYield
    ) {}

    public record DividendEvent(
            String market,
            String ticker,
            String currency,
            LocalDate exDividendDate,
            LocalDate paymentDate,
            BigDecimal amountPerShare,
            String source
    ) {}

    public record EtfSearchResult(
            String market,
            String ticker,
            String name,
            String currency,
            String exchange,
            BigDecimal currentPrice,
            BigDecimal changeRate,
            BigDecimal nav,
            BigDecimal aum,
            Boolean dividendAvailable,
            String source
    ) {}

    public record EtfProfile(
            String market,
            String ticker,
            String name,
            String currency,
            String exchange,
            String provider,
            String assetClass,
            String indexName,
            String description,
            String inceptionDate,
            BigDecimal nav,
            BigDecimal aum,
            BigDecimal expenseRatio,
            BigDecimal returnOneMonth,
            BigDecimal returnThreeMonth,
            BigDecimal returnOneYear,
            BigDecimal returnThreeYear,
            BigDecimal returnFiveYear,
            BigDecimal dividendYieldTtm,
            BigDecimal dividendPerShareTtm,
            Integer holdingsCount,
            String source
    ) {}

    public record EtfHolding(
            String ticker,
            String name,
            BigDecimal weight,
            BigDecimal shares,
            BigDecimal marketValue,
            String source
    ) {}

    public record FinancialPeriod(
            String fiscalYear,
            String period,
            String currency,
            BigDecimal revenue,
            BigDecimal operatingIncome,
            BigDecimal netIncome,
            BigDecimal totalAssets,
            BigDecimal totalLiabilities,
            BigDecimal totalEquity,
            BigDecimal operatingCashFlow,
            String source
    ) {}

    public record InstrumentSnapshot(
            String market,
            String ticker,
            String name,
            boolean etf,
            Quote quote,
            EtfProfile etfProfile,
            List<EtfHolding> holdings,
            List<DividendEvent> dividends,
            List<FinancialPeriod> financials,
            Instant asOf,
            List<String> sources
    ) {}
}
