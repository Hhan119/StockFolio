package com.example.StockFolio.controller;

import com.example.StockFolio.dto.DividendDto;
import com.example.StockFolio.service.DividendService;
import com.example.StockFolio.service.UserDetail;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DividendController {

    private final DividendService dividendService;

    @GetMapping("/portfolios/{portfolioId}/dividends")
    public List<DividendDto.Response> list(@PathVariable Long portfolioId,
                                           @AuthenticationPrincipal UserDetail user) {
        return dividendService.getByPortfolio(portfolioId, user.getId());
    }

    @GetMapping("/portfolios/{portfolioId}/dividends/summary")
    public DividendDto.AnnualSummary summary(@PathVariable Long portfolioId,
                                             @AuthenticationPrincipal UserDetail user) {
        return dividendService.getAnnualSummary(portfolioId, user.getId());
    }

    @PostMapping("/stocks/{stockId}/dividends")
    @ResponseStatus(HttpStatus.CREATED)
    public DividendDto.Response create(@PathVariable Long stockId,
                                       @Valid @RequestBody DividendDto.Request request,
                                       @AuthenticationPrincipal UserDetail user) {
        return dividendService.addDividend(stockId, request, user.getId());
    }

    @PutMapping("/dividends/{dividendId}")
    public DividendDto.Response update(@PathVariable Long dividendId,
                                       @Valid @RequestBody DividendDto.Request request,
                                       @AuthenticationPrincipal UserDetail user) {
        return dividendService.updateDividend(dividendId, request, user.getId());
    }

    @DeleteMapping("/dividends/{dividendId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long dividendId, @AuthenticationPrincipal UserDetail user) {
        dividendService.deleteDividend(dividendId, user.getId());
    }
}
