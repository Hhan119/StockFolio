package com.example.StockFolio.dto;

import java.math.BigDecimal;

public class MarketDto {

    public record SearchResult(
            String market,
            String ticker,
            String name,
            String currency,
            String exchange,
            BigDecimal currentPrice,
            Boolean dividendAvailable
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
}
