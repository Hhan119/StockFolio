package com.example.StockFolio.controller;

import com.example.StockFolio.dto.MarketDto;
import com.example.StockFolio.service.MarketDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketDataController {

    private final MarketDataService marketDataService;

    @GetMapping("/search")
    public List<MarketDto.SearchResult> search(@RequestParam(defaultValue = "US") String market,
                                               @RequestParam String keyword) {
        return marketDataService.search(market, keyword);
    }

    @GetMapping("/quote")
    public MarketDto.Quote quote(@RequestParam(defaultValue = "US") String market,
                                 @RequestParam String ticker) {
        return marketDataService.quote(market, ticker);
    }

    @GetMapping("/etfs/top")
    public List<MarketDto.SearchResult> topEtfs(@RequestParam(defaultValue = "ALL") String market,
                                                @RequestParam(defaultValue = "5") int limit) {
        return marketDataService.topEtfs(market, limit);
    }

    @GetMapping("/etfs/search")
    public List<MarketDto.EtfSearchResult> searchEtfs(
            @RequestParam(defaultValue = "ALL") String market,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "60") int limit
    ) {
        return marketDataService.searchEtfs(market, keyword, limit);
    }

    @GetMapping("/instruments/{ticker}")
    public MarketDto.InstrumentSnapshot instrument(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "AUTO") String market
    ) {
        return marketDataService.instrumentSnapshot(market, ticker);
    }
}
