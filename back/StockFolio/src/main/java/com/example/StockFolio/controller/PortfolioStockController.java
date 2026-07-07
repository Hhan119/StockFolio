package com.example.StockFolio.controller;

import com.example.StockFolio.dto.PortfolioDto;
import com.example.StockFolio.dto.StockDto;
import com.example.StockFolio.service.DividendService;
import com.example.StockFolio.service.PortfolioService;
import com.example.StockFolio.service.StockService;
import com.example.StockFolio.service.UserDetail;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioStockController {

    private final PortfolioService portfolioService;
    private final StockService stockService;
    private final DividendService dividendService;

    @PostMapping("/stocks")
    @ResponseStatus(HttpStatus.CREATED)
    public StockDto.Response addStock(@Valid @RequestBody AddPortfolioStockRequest request,
                                      @AuthenticationPrincipal UserDetail user) {
        Long portfolioId = request.getPortfolioId();
        if (portfolioId == null) {
            var portfolios = portfolioService.getAllPortfolios(user.getId());
            if (portfolios.isEmpty()) {
                portfolioId = portfolioService.createPortfolio(
                        PortfolioDto.Request.builder()
                                .name("Main Portfolio")
                                .description("Default holdings")
                                .initialCapital(BigDecimal.ZERO)
                                .build(),
                        user.getId()
                ).getId();
            } else {
                portfolioId = portfolios.get(0).getId();
            }
        }

        StockDto.Request stockRequest = StockDto.Request.builder()
                .ticker(request.getTicker())
                .name(request.getName() != null ? request.getName() : request.getTicker())
                .quantity(request.getQuantity())
                .avgPrice(request.getAveragePrice())
                .currentPrice(request.getCurrentPrice() != null ? request.getCurrentPrice() : request.getAveragePrice())
                .purchaseDate(LocalDate.now())
                .sector(request.getSector())
                .currency(request.getCurrency())
                .memo(request.getMemo())
                .build();
        StockDto.Response savedStock = stockService.addStock(portfolioId, stockRequest, user.getId());
        try {
            dividendService.addAutoDividendIfAvailable(savedStock.getId(), user.getId());
        } catch (Exception ignored) {
            // Stock registration should not fail when dividend data cannot be inferred.
        }
        return savedStock;
    }

    @Getter
    @Setter
    public static class AddPortfolioStockRequest {
        private Long portfolioId;
        private String ticker;
        private String name;
        private Integer quantity;
        private BigDecimal averagePrice;
        private BigDecimal currentPrice;
        private String sector;
        private String currency;
        private String memo;
    }
}
