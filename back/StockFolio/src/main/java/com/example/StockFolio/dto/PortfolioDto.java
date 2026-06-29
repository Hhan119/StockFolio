package com.example.StockFolio.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class PortfolioDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotBlank(message = "포트폴리오 이름은 필수입니다")
        @Size(max = 100)
        private String name;

        @Size(max = 500)
        private String description;

        @DecimalMin("0.0")
        private BigDecimal initialCapital;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String description;
        private BigDecimal initialCapital;
        private BigDecimal totalValue;
        private BigDecimal totalCost;
        private BigDecimal totalProfitLoss;
        private Double totalProfitLossRate;
        private int stockCount;
        private List<StockDto.Response> stocks;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Summary {
        private Long id;
        private String name;
        private String description;
        private BigDecimal totalValue;
        private BigDecimal totalCost;
        private BigDecimal totalProfitLoss;
        private Double totalProfitLossRate;
        private int stockCount;
        private LocalDateTime updatedAt;
    }
}