package com.example.StockFolio.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dividends")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Dividend {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private Stock stock;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DividendFrequency frequency;

    @Column(name = "dividend_per_share", nullable = false, precision = 12, scale = 4)
    private BigDecimal dividendPerShare;

    @Column(name = "amount_received", precision = 12, scale = 2)
    private BigDecimal amountReceived;

    @Column(name = "ex_dividend_date")
    private LocalDate exDividendDate;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "payment_month")
    private Integer paymentMonth;

    @Column(length = 500)
    private String memo;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum DividendFrequency {
        MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL, SPECIAL
    }
}