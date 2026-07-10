package com.example.StockFolio.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "distribution_events",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_distribution_event_identity",
                columnNames = {"instrument_key", "ex_dividend_date", "payment_date", "amount_per_share", "distribution_type"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistributionEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "instrument_key", nullable = false, length = 80)
    private String instrumentKey;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(name = "instrument_name", length = 150)
    private String instrumentName;

    @Column(length = 20)
    private String market;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(name = "declaration_date")
    private LocalDate declarationDate;

    @Column(name = "ex_dividend_date")
    private LocalDate exDividendDate;

    @Column(name = "record_date")
    private LocalDate recordDate;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "amount_per_share", nullable = false, precision = 19, scale = 6)
    private BigDecimal amountPerShare;

    @Enumerated(EnumType.STRING)
    @Column(name = "distribution_type", nullable = false, length = 30)
    @Builder.Default
    private DistributionType distributionType = DistributionType.REGULAR;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_status", nullable = false, length = 20)
    @Builder.Default
    private DistributionEventStatus eventStatus = DistributionEventStatus.ESTIMATED;

    @Enumerated(EnumType.STRING)
    @Column(name = "estimate_method", nullable = false, length = 40)
    @Builder.Default
    private EstimateMethod estimateMethod = EstimateMethod.UNAVAILABLE;

    @Enumerated(EnumType.STRING)
    @Column(name = "estimate_confidence", nullable = false, length = 20)
    @Builder.Default
    private EstimateConfidence estimateConfidence = EstimateConfidence.UNAVAILABLE;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_status", nullable = false, length = 20)
    @Builder.Default
    private DataStatus dataStatus = DataStatus.UNAVAILABLE;

    @Column(name = "income_amount", precision = 19, scale = 6)
    private BigDecimal incomeAmount;

    @Column(name = "capital_gain_amount", precision = 19, scale = 6)
    private BigDecimal capitalGainAmount;

    @Column(name = "return_of_capital_amount", precision = 19, scale = 6)
    private BigDecimal returnOfCapitalAmount;

    @Column(name = "raw_amount_per_share", precision = 19, scale = 6)
    private BigDecimal rawAmountPerShare;

    @Column(name = "split_adjusted_amount_per_share", precision = 19, scale = 6)
    private BigDecimal splitAdjustedAmountPerShare;

    @Column(length = 80)
    private String provider;

    @Column(name = "source_updated_at")
    private Instant sourceUpdatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
