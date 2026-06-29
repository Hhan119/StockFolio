package com.example.StockFolio.controller;

import com.example.StockFolio.dto.PortfolioDto;
import com.example.StockFolio.service.PortfolioService;
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
@RequestMapping("/api/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    @GetMapping
    public List<PortfolioDto.Summary> list(@AuthenticationPrincipal UserDetail user) {
        return portfolioService.getAllPortfolios(user.getId());
    }

    @GetMapping("/{id}")
    public PortfolioDto.Response get(@PathVariable Long id, @AuthenticationPrincipal UserDetail user) {
        return portfolioService.getPortfolio(id, user.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PortfolioDto.Response create(@Valid @RequestBody PortfolioDto.Request request,
                                        @AuthenticationPrincipal UserDetail user) {
        return portfolioService.createPortfolio(request, user.getId());
    }

    @PutMapping("/{id}")
    public PortfolioDto.Response update(@PathVariable Long id,
                                        @Valid @RequestBody PortfolioDto.Request request,
                                        @AuthenticationPrincipal UserDetail user) {
        return portfolioService.updatePortfolio(id, request, user.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal UserDetail user) {
        portfolioService.deletePortfolio(id, user.getId());
    }
}
