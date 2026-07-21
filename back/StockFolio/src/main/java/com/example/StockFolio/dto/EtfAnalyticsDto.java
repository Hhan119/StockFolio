package com.example.StockFolio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class EtfAnalyticsDto {

    public record Classification(
            String listingCountry,
            String assetType,
            List<String> strategies,
            String distributionFrequency,
            String fxExposure,
            String peerGroup,
            String riskLevel,
            boolean leveraged,
            boolean inverse,
            boolean singleStock,
            boolean coveredCall
    ) {}

    public record Metrics(
            BigDecimal currentPrice,
            BigDecimal ttmDistributionYield,
            BigDecimal ttmDistributionAmount,
            Integer paymentCountTtm,
            BigDecimal distributionVolatility,
            BigDecimal distributionCagrThreeYear,
            BigDecimal distributionCagrFiveYear,
            Integer consecutiveGrowthYears,
            BigDecimal returnOneMonth,
            BigDecimal returnThreeMonth,
            BigDecimal returnOneYear,
            BigDecimal returnThreeYear,
            BigDecimal returnFiveYear,
            BigDecimal expenseRatio,
            BigDecimal aum,
            BigDecimal navPremiumDiscount,
            Integer holdingsCount,
            BigDecimal topTenConcentration,
            BigDecimal volatility,
            BigDecimal maxDrawdown,
            BigDecimal beta,
            BigDecimal sharpeRatio,
            BigDecimal sortinoRatio
    ) {}

    public record DataQuality(
            int score,
            String status,
            List<String> missingFields,
            Instant asOf,
            List<String> sources
    ) {}

    public record RuleAnalysis(
            String status,
            Integer incomeScore,
            Integer growthScore,
            Integer costScore,
            Integer diversificationScore,
            Integer riskScore,
            List<String> strengths,
            List<String> cautions,
            List<String> checks
    ) {}

    public record StandardizedEtf(
            String market,
            String ticker,
            String name,
            String currency,
            Classification classification,
            Metrics metrics,
            DataQuality dataQuality,
            RuleAnalysis analysis,
            MarketDto.InstrumentSnapshot snapshot
    ) {}

    public record RankingScore(
            BigDecimal overall,
            BigDecimal performance,
            BigDecimal risk,
            BigDecimal cost,
            BigDecimal liquidity,
            BigDecimal distribution,
            BigDecimal diversification,
            BigDecimal dataQuality,
            BigDecimal penalty
    ) {}

    public record RankingItem(
            int rank,
            int peerRank,
            StandardizedEtf etf,
            RankingScore score,
            List<String> reasons,
            List<String> cautions
    ) {}

    public record RankingGroup(
            String peerGroup,
            String label,
            List<RankingItem> items
    ) {}

    public record RankingResponse(
            String kind,
            String title,
            String description,
            String methodologyVersion,
            Instant calculatedAt,
            List<RankingGroup> groups,
            Map<String, Integer> weights,
            List<String> eligibility,
            List<String> limitations
    ) {}

    public record HoldingOverlap(
            String leftTicker,
            String rightTicker,
            BigDecimal overlapPercent,
            String status,
            List<String> commonHoldings
    ) {}

    public record CompareResponse(
            List<StandardizedEtf> items,
            List<HoldingOverlap> overlaps,
            List<String> observations,
            Instant asOf
    ) {}

    public record MethodologyResponse(
            String version,
            Instant updatedAt,
            Map<String, Map<String, Integer>> rankingWeights,
            List<String> classificationRules,
            List<String> scoringRules,
            List<String> dataQualityRules,
            List<String> sourcePriority,
            List<String> limitations
    ) {}

    public record ModelPortfolioRequest(
            String riskLevel,
            String objective
    ) {}

    public record ModelAllocation(
            String assetClass,
            String label,
            int targetWeight,
            List<String> candidateTickers,
            String reason
    ) {}

    public record ModelPortfolioResponse(
            String riskLevel,
            String objective,
            String title,
            List<ModelAllocation> allocations,
            List<String> constraints,
            List<String> rebalanceRules,
            List<String> notices
    ) {}
}
