package com.example.StockFolio.controller;

import com.example.StockFolio.dto.EtfAnalyticsDto;
import com.example.StockFolio.dto.MarketDto;
import com.example.StockFolio.service.EtfAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/etfs")
@RequiredArgsConstructor
public class EtfAnalyticsController {

    private final EtfAnalyticsService etfAnalyticsService;

    @GetMapping("/search")
    public List<MarketDto.EtfSearchResult> search(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "ALL") String market,
            @RequestParam(defaultValue = "60") int limit
    ) {
        return etfAnalyticsService.search(keyword, market, Math.max(1, Math.min(limit, 100)));
    }

    @GetMapping("/compare")
    public EtfAnalyticsDto.CompareResponse compare(@RequestParam String tickers) {
        List<String> values = Arrays.stream(tickers.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
        return etfAnalyticsService.compare(values);
    }

    @GetMapping("/rankings/{kind}")
    public EtfAnalyticsDto.RankingResponse ranking(
            @PathVariable String kind,
            @RequestParam(defaultValue = "ALL") String market,
            @RequestParam(defaultValue = "false") boolean excludeCoveredCall
    ) {
        return etfAnalyticsService.ranking(kind, market, excludeCoveredCall);
    }

    @GetMapping("/methodology")
    public EtfAnalyticsDto.MethodologyResponse methodology() {
        return etfAnalyticsService.methodology();
    }

    @PostMapping("/model-portfolios/simulate")
    public EtfAnalyticsDto.ModelPortfolioResponse modelPortfolio(@RequestBody(required = false) EtfAnalyticsDto.ModelPortfolioRequest request) {
        return etfAnalyticsService.modelPortfolio(request);
    }

    @GetMapping("/{ticker}")
    public EtfAnalyticsDto.StandardizedEtf detail(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "AUTO") String market
    ) {
        return etfAnalyticsService.getEtf(market, ticker);
    }
}
