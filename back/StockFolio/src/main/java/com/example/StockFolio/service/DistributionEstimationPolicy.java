package com.example.StockFolio.service;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

import com.example.StockFolio.entity.DistributionFrequency;
import com.example.StockFolio.entity.DistributionVolatility;
import com.example.StockFolio.entity.EstimateConfidence;

@Component
public class DistributionEstimationPolicy {

    private static final BigDecimal STABLE_VOLATILITY_LIMIT = new BigDecimal("0.10");
    private static final BigDecimal MODERATE_VOLATILITY_LIMIT = new BigDecimal("0.25");

    public int recentSampleSize(DistributionFrequency frequency) {
        if (frequency == null) return 4;
        return switch (frequency) {
            case MONTHLY -> 6;
            case QUARTERLY, SEMIANNUAL -> 4;
            case ANNUAL -> 3;
            case IRREGULAR, NONE, UNKNOWN -> 4;
        };
    }

    public DistributionVolatility classifyVolatility(BigDecimal coefficientOfVariation) {
        if (coefficientOfVariation == null) return DistributionVolatility.UNAVAILABLE;
        if (coefficientOfVariation.compareTo(STABLE_VOLATILITY_LIMIT) < 0) return DistributionVolatility.STABLE;
        if (coefficientOfVariation.compareTo(MODERATE_VOLATILITY_LIMIT) < 0) return DistributionVolatility.MODERATE;
        return DistributionVolatility.HIGH;
    }

    public EstimateConfidence confidence(int actualEventCount, DistributionFrequency frequency, DistributionVolatility volatility, boolean coveredCallLike) {
        if (actualEventCount <= 0) return EstimateConfidence.UNAVAILABLE;
        if (coveredCallLike || frequency == DistributionFrequency.IRREGULAR || volatility == DistributionVolatility.HIGH) {
            return EstimateConfidence.LOW;
        }
        if (actualEventCount >= 12 && volatility == DistributionVolatility.STABLE) return EstimateConfidence.HIGH;
        if (actualEventCount >= 4 && volatility != DistributionVolatility.HIGH) return EstimateConfidence.MEDIUM;
        return EstimateConfidence.LOW;
    }
}
