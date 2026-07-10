package com.example.StockFolio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.example.StockFolio.entity.DataStatus;
import com.example.StockFolio.entity.DistributionEventStatus;
import com.example.StockFolio.entity.DistributionFrequency;
import com.example.StockFolio.entity.DistributionType;
import com.example.StockFolio.entity.DistributionVolatility;
import com.example.StockFolio.entity.EstimateConfidence;
import com.example.StockFolio.entity.EstimateMethod;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class DistributionDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProfileRequest {
        @NotNull
        private DistributionFrequency declaredFrequency;
        private DistributionFrequency observedFrequency;
        private Integer paymentsLast12Months;
        private EstimateConfidence frequencyConfidence;
        private LocalDate lastDistributionDate;
        private LocalDate nextEstimatedExDividendDate;
        private LocalDate nextEstimatedPaymentDate;
        @Size(max = 80)
        private String source;
        private DataStatus dataStatus;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EventRequest {
        private LocalDate declarationDate;
        private LocalDate exDividendDate;
        private LocalDate recordDate;
        private LocalDate paymentDate;

        @NotNull @DecimalMin("0.000001")
        private BigDecimal amountPerShare;

        @Size(max = 10)
        private String currency;
        private DistributionType distributionType;
        private DistributionEventStatus eventStatus;
        private EstimateMethod estimateMethod;
        private EstimateConfidence estimateConfidence;
        private DataStatus dataStatus;
        private BigDecimal incomeAmount;
        private BigDecimal capitalGainAmount;
        private BigDecimal returnOfCapitalAmount;
        private BigDecimal rawAmountPerShare;
        private BigDecimal splitAdjustedAmountPerShare;
        @Size(max = 80)
        private String provider;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ManualDistributionRequest {
        private DistributionFrequency frequency;
        private DistributionEventStatus eventStatus;
        private LocalDate declarationDate;
        private LocalDate exDividendDate;
        private LocalDate recordDate;
        private LocalDate paymentDate;

        @NotNull @DecimalMin("0.000001")
        private BigDecimal amountPerShare;

        @Size(max = 10)
        private String currency;
        private DistributionType distributionType;
        private EstimateMethod estimateMethod;
        private EstimateConfidence estimateConfidence;

        @Min(0) @Max(100)
        private BigDecimal withholdingTaxRate;

        @Size(max = 500)
        private String memo;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProfileResponse {
        private Long id;
        private String instrumentKey;
        private String ticker;
        private String instrumentName;
        private String market;
        private String currency;
        private DistributionFrequency declaredFrequency;
        private DistributionFrequency observedFrequency;
        private Integer paymentsLast12Months;
        private EstimateConfidence frequencyConfidence;
        private LocalDate lastDistributionDate;
        private LocalDate nextEstimatedExDividendDate;
        private LocalDate nextEstimatedPaymentDate;
        private String source;
        private DataStatus dataStatus;
        private Instant sourceUpdatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EventResponse {
        private Long distributionEventId;
        private String instrumentKey;
        private String ticker;
        private String instrumentName;
        private LocalDate declarationDate;
        private LocalDate exDividendDate;
        private LocalDate recordDate;
        private LocalDate paymentDate;
        private BigDecimal amountPerShare;
        private String currency;
        private DistributionType distributionType;
        private DistributionEventStatus eventStatus;
        private EstimateMethod estimateMethod;
        private EstimateConfidence estimateConfidence;
        private DataStatus dataStatus;
        private BigDecimal incomeAmount;
        private BigDecimal capitalGainAmount;
        private BigDecimal returnOfCapitalAmount;
        private BigDecimal rawAmountPerShare;
        private BigDecimal splitAdjustedAmountPerShare;
        private String provider;
        private Instant sourceUpdatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class HoldingDistributionSummaryResponse {
        private Long holdingId;
        private String instrumentKey;
        private String ticker;
        private String instrumentName;
        private Integer quantity;
        private DistributionFrequency declaredFrequency;
        private DistributionFrequency observedFrequency;
        private Integer paymentsLast12Months;
        private BigDecimal latestAmountPerShare;
        private LocalDate latestPaymentDate;
        private BigDecimal trailingTwelveMonthsAmountPerShare;
        private BigDecimal estimatedAnnualGrossAmount;
        private BigDecimal estimatedAnnualNetAmount;
        private BigDecimal nextEstimatedAmountPerShare;
        private LocalDate nextExDividendDate;
        private LocalDate nextPaymentDate;
        private DistributionEventStatus nextEventStatus;
        private EstimateMethod estimateMethod;
        private EstimateConfidence estimateConfidence;
        private DistributionVolatility distributionVolatility;
        private String currency;
        private Instant dataAsOf;
        private String provider;
        private DataStatus dataStatus;
        private Boolean coveredCallLike;
        private Boolean specialDistributionIncluded;
        private String message;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PortfolioDistributionSummaryResponse {
        private Long portfolioId;
        private BigDecimal estimatedAnnualGrossAmount;
        private BigDecimal estimatedAnnualNetAmount;
        private BigDecimal trailingTwelveMonthsAmountPerShareTotal;
        private int holdingCount;
        private int availableHoldingCount;
        private Instant dataAsOf;
        private String message;
        private List<HoldingDistributionSummaryResponse> holdings;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CalendarEventResponse {
        private Long distributionEventId;
        private Long holdingId;
        private String instrumentKey;
        private String ticker;
        private String instrumentName;
        private LocalDate exDividendDate;
        private LocalDate recordDate;
        private LocalDate paymentDate;
        private BigDecimal amountPerShare;
        private Integer eligibleQuantity;
        private BigDecimal estimatedGrossAmount;
        private BigDecimal estimatedNetAmount;
        private DistributionEventStatus eventStatus;
        private DistributionType distributionType;
        private DistributionFrequency observedFrequency;
        private EstimateMethod estimateMethod;
        private EstimateConfidence estimateConfidence;
        private String currency;
        private Boolean isDateEstimated;
        private Boolean isAmountEstimated;
        private Boolean coveredCallLike;
        private DataStatus dataStatus;
        private Instant dataAsOf;
        private String provider;
    }
}
