package com.example.StockFolio.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class StockDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotBlank @Size(max = 20)
        private String ticker;

        @NotBlank @Size(max = 100)
        private String name;

        @NotNull @Min(1)
        private Integer quantity;

        @NotNull @DecimalMin("0.01")
        private BigDecimal avgPrice;

        @DecimalMin("0.0")
        private BigDecimal currentPrice;

        private LocalDate purchaseDate;

        @Size(max = 50)
        private String sector;

        @Size(max = 10)
        private String currency;

        @Size(max = 1000)
        private String memo;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private Long portfolioId;
        private String ticker;
        private String name;
        private Integer quantity;
        private BigDecimal avgPrice;
        private BigDecimal currentPrice;
        private BigDecimal totalCost;
        private BigDecimal totalValue;
        private BigDecimal profitLoss;
        private Double profitLossRate;
        private LocalDate purchaseDate;
        private String sector;
        private String currency;
        private String memo;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}