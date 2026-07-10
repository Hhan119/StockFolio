package com.example.StockFolio.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.example.StockFolio.entity.DataStatus;
import com.example.StockFolio.entity.Dividend.DividendFrequency;
import com.example.StockFolio.entity.DistributionEventStatus;
import com.example.StockFolio.entity.DistributionType;
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

public class DividendDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotNull
        private DividendFrequency frequency;

        @NotNull @DecimalMin("0.0001")
        private BigDecimal dividendPerShare;

        @DecimalMin("0.0")
        private BigDecimal amountReceived;

        private LocalDate exDividendDate;
        private LocalDate paymentDate;

        @Min(1) @Max(12)
        private Integer paymentMonth;

        @Size(max = 500)
        private String memo;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private Long stockId;
        private String stockTicker;
        private String stockName;
        private Integer stockQuantity;
        private DividendFrequency frequency;
        private BigDecimal dividendPerShare;
        private BigDecimal totalDividend;
        private BigDecimal amountReceived;
        private LocalDate exDividendDate;
        private LocalDate paymentDate;
        private Integer paymentMonth;
        private String memo;
        private LocalDateTime createdAt;
        private DistributionEventStatus distributionEventStatus;
        private DistributionType distributionType;
        private EstimateMethod estimateMethod;
        private EstimateConfidence estimateConfidence;
        private DataStatus dataStatus;
        private String provider;
        private java.time.Instant dataAsOf;
        private Boolean isDateEstimated;
        private Boolean isAmountEstimated;
        private String message;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MonthlySummary {
        private int month;
        private String monthName;
        private BigDecimal estimatedTotal;
        private BigDecimal receivedTotal;
        private int dividendCount;
        private List<Response> items;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AnnualSummary {
        private BigDecimal annualEstimated;
        private BigDecimal monthlyAverage;
        private BigDecimal totalReceived;
        private int dividendStockCount;
        private List<MonthlySummary> monthly;
    }
}
