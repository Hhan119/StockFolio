package com.example.StockFolio.entity;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "distribution_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistributionProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "instrument_key", nullable = false, unique = true, length = 80)
    private String instrumentKey;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(name = "instrument_name", length = 150)
    private String instrumentName;

    @Column(length = 20)
    private String market;

    @Column(length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "declared_frequency", nullable = false, length = 20)
    @Builder.Default
    private DistributionFrequency declaredFrequency = DistributionFrequency.UNKNOWN;

    @Enumerated(EnumType.STRING)
    @Column(name = "observed_frequency", nullable = false, length = 20)
    @Builder.Default
    private DistributionFrequency observedFrequency = DistributionFrequency.UNKNOWN;

    @Column(name = "payments_last_12_months")
    @Builder.Default
    private Integer paymentsLast12Months = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency_confidence", nullable = false, length = 20)
    @Builder.Default
    private EstimateConfidence frequencyConfidence = EstimateConfidence.UNAVAILABLE;

    @Column(name = "last_distribution_date")
    private LocalDate lastDistributionDate;

    @Column(name = "next_estimated_ex_dividend_date")
    private LocalDate nextEstimatedExDividendDate;

    @Column(name = "next_estimated_payment_date")
    private LocalDate nextEstimatedPaymentDate;

    @Column(length = 80)
    private String source;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_status", nullable = false, length = 20)
    @Builder.Default
    private DataStatus dataStatus = DataStatus.UNAVAILABLE;

    @Column(name = "source_updated_at")
    private Instant sourceUpdatedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
