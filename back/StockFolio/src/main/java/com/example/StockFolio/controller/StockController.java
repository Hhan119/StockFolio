package com.example.StockFolio.controller;

import com.example.StockFolio.dto.MarketDto;
import com.example.StockFolio.dto.StockDto;
import com.example.StockFolio.service.MarketDataService;
import com.example.StockFolio.service.StockService;
import com.example.StockFolio.service.UserDetail;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
    private final MarketDataService marketDataService;

    @GetMapping("/stocks/search")
    public List<MarketDto.SearchResult> search(@org.springframework.web.bind.annotation.RequestParam String keyword) {
        String normalized = keyword == null ? "" : keyword.trim();
        String market = normalized.matches("\\d{6}") || normalized.matches(".*[가-힣].*") ? "KR" : "US";
        return marketDataService.search(market, keyword);
    }

    @GetMapping("/stocks/{ticker}")
    public MarketDto.StockDetail detail(@PathVariable String ticker) {
        return marketDataService.detail(ticker);
    }

    @GetMapping("/portfolios/{portfolioId}/stocks")
    public List<StockDto.Response> list(@PathVariable Long portfolioId, @AuthenticationPrincipal UserDetail user) {
        return stockService.getStocks(portfolioId, user.getId());
    }

    @PostMapping("/portfolios/{portfolioId}/stocks")
    @ResponseStatus(HttpStatus.CREATED)
    public StockDto.Response create(@PathVariable Long portfolioId,
                                    @Valid @RequestBody StockDto.Request request,
                                    @AuthenticationPrincipal UserDetail user) {
        return stockService.addStock(portfolioId, request, user.getId());
    }

    @PutMapping("/stocks/{stockId}")
    public StockDto.Response update(@PathVariable Long stockId,
                                    @Valid @RequestBody StockDto.Request request,
                                    @AuthenticationPrincipal UserDetail user) {
        return stockService.updateStock(stockId, request, user.getId());
    }

    @PatchMapping("/stocks/{stockId}/price")
    public StockDto.Response updatePrice(@PathVariable Long stockId,
                                         @Valid @RequestBody PriceRequest request,
                                         @AuthenticationPrincipal UserDetail user) {
        return stockService.updateCurrentPrice(stockId, request.getCurrentPrice(), user.getId());
    }

    @DeleteMapping("/stocks/{stockId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long stockId, @AuthenticationPrincipal UserDetail user) {
        stockService.deleteStock(stockId, user.getId());
    }

    @Getter
    @Setter
    public static class PriceRequest {
        private BigDecimal currentPrice;
    }
}
