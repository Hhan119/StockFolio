package com.example.StockFolio.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.example.StockFolio.dto.DistributionDto;
import com.example.StockFolio.entity.DataStatus;
import com.example.StockFolio.entity.DistributionEventStatus;
import com.example.StockFolio.entity.DistributionFrequency;
import com.example.StockFolio.entity.DistributionType;
import com.example.StockFolio.entity.EstimateConfidence;
import com.example.StockFolio.entity.EstimateMethod;
import com.example.StockFolio.util.DistributionInstrumentKeys;

@Component
public class MockDistributionDataProvider implements DistributionDataProvider {

    private static final Set<String> MONTHLY_TICKERS = Set.of(
            "JEPI", "JEPQ", "QYLD", "RYLD", "XYLD", "DGRW", "DIVO", "DIA", "O",
            "TLT", "IEF", "SHY", "BND", "AGG", "HYG", "LQD", "NVDY", "TSLY", "CONY", "MSTY"
    );

    @Override
    public Optional<DistributionDto.ProfileResponse> getDistributionProfile(String instrumentKey) {
        String ticker = DistributionInstrumentKeys.tickerFromKey(instrumentKey);
        DistributionFrequency frequency = MONTHLY_TICKERS.contains(ticker)
                ? DistributionFrequency.MONTHLY
                : DistributionFrequency.UNKNOWN;
        if (frequency == DistributionFrequency.UNKNOWN) return Optional.empty();

        return Optional.of(DistributionDto.ProfileResponse.builder()
                .instrumentKey(instrumentKey)
                .ticker(ticker)
                .declaredFrequency(frequency)
                .observedFrequency(frequency)
                .paymentsLast12Months(frequency == DistributionFrequency.MONTHLY ? 12 : 0)
                .frequencyConfidence(EstimateConfidence.LOW)
                .source("mock-provider")
                .dataStatus(DataStatus.MOCK)
                .sourceUpdatedAt(Instant.now())
                .build());
    }

    @Override
    public List<DistributionDto.EventResponse> getDistributionHistory(String instrumentKey) {
        return List.of();
    }

    @Override
    public List<DistributionDto.EventResponse> getDeclaredDistributions(String instrumentKey) {
        return List.of();
    }

    @Override
    public List<DistributionDto.EventResponse> getUpcomingDistributions(String instrumentKey) {
        String ticker = DistributionInstrumentKeys.tickerFromKey(instrumentKey);
        if (!MONTHLY_TICKERS.contains(ticker)) return List.of();
        return List.of(DistributionDto.EventResponse.builder()
                .instrumentKey(instrumentKey)
                .ticker(ticker)
                .amountPerShare(BigDecimal.ZERO)
                .distributionType(DistributionType.REGULAR)
                .eventStatus(DistributionEventStatus.ESTIMATED)
                .estimateMethod(EstimateMethod.UNAVAILABLE)
                .estimateConfidence(EstimateConfidence.UNAVAILABLE)
                .dataStatus(DataStatus.MOCK)
                .provider("mock-provider")
                .sourceUpdatedAt(Instant.now())
                .build());
    }
}
