package com.example.StockFolio.controller;

import com.example.StockFolio.dto.CalculatorDto;
import com.example.StockFolio.service.CalculatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calculators")
@RequiredArgsConstructor
public class CalculatorController {

    private final CalculatorService calculatorService;

    @PostMapping("/etf-dividend")
    public CalculatorDto.EtfDividendResponse etfDividend(@RequestBody CalculatorDto.EtfDividendRequest request) {
        return calculatorService.calculateEtfDividend(request);
    }

    @PostMapping("/fire")
    public CalculatorDto.FireResponse fire(@RequestBody CalculatorDto.FireRequest request) {
        return calculatorService.calculateFire(request);
    }

    @PostMapping("/retirement")
    public CalculatorDto.RetirementResponse retirement(@RequestBody CalculatorDto.RetirementRequest request) {
        return calculatorService.calculateRetirement(request);
    }

    @PostMapping("/dca")
    public CalculatorDto.DcaResponse dca(@RequestBody CalculatorDto.DcaRequest request) {
        return calculatorService.calculateDca(request);
    }

    @PostMapping("/average-price")
    public CalculatorDto.AveragePriceResponse averagePrice(@RequestBody CalculatorDto.AveragePriceRequest request) {
        return calculatorService.calculateAveragePrice(request);
    }
}
