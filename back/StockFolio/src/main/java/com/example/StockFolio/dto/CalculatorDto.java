package com.example.StockFolio.dto;

import java.math.BigDecimal;

public class CalculatorDto {

    public record EtfDividendRequest(
            BigDecimal shares,
            BigDecimal price,
            BigDecimal dividendPerShare,
            BigDecimal paymentsPerYear,
            BigDecimal taxRate
    ) {}

    public record EtfDividendResponse(
            BigDecimal investedAmount,
            BigDecimal annualDividendBeforeTax,
            BigDecimal annualDividendAfterTax,
            BigDecimal monthlyDividendAfterTax,
            BigDecimal dividendYield
    ) {}

    public record FireRequest(
            BigDecimal currentAssets,
            BigDecimal annualExpenses,
            BigDecimal annualSavings,
            BigDecimal expectedReturnRate,
            BigDecimal withdrawalRate
    ) {}

    public record FireResponse(
            BigDecimal targetAssets,
            Integer yearsToFire,
            BigDecimal projectedAssets
    ) {}

    public record RetirementRequest(
            Integer currentAge,
            Integer retirementAge,
            BigDecimal currentSavings,
            BigDecimal monthlyContribution,
            BigDecimal annualReturnRate
    ) {}

    public record RetirementResponse(
            Integer years,
            BigDecimal totalContributions,
            BigDecimal projectedAssets
    ) {}

    public record DcaRequest(
            BigDecimal initialInvestment,
            BigDecimal monthlyContribution,
            Integer years,
            BigDecimal annualReturnRate
    ) {}

    public record DcaResponse(
            BigDecimal totalContributions,
            BigDecimal futureValue,
            BigDecimal estimatedProfit
    ) {}

    public record AveragePriceRequest(
            BigDecimal currentQuantity,
            BigDecimal currentAveragePrice,
            BigDecimal additionalQuantity,
            BigDecimal additionalPrice
    ) {}

    public record AveragePriceResponse(
            BigDecimal totalQuantity,
            BigDecimal totalInvestment,
            BigDecimal averagePrice,
            BigDecimal additionalInvestment
    ) {}
}
