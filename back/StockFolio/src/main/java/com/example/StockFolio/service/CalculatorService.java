package com.example.StockFolio.service;

import com.example.StockFolio.dto.CalculatorDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class CalculatorService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal TWELVE = BigDecimal.valueOf(12);

    public CalculatorDto.EtfDividendResponse calculateEtfDividend(CalculatorDto.EtfDividendRequest request) {
        BigDecimal investedAmount = safe(request.shares()).multiply(safe(request.price()));
        BigDecimal annualBeforeTax = safe(request.shares())
                .multiply(safe(request.dividendPerShare()))
                .multiply(safe(request.paymentsPerYear()));
        BigDecimal taxMultiplier = BigDecimal.ONE.subtract(safe(request.taxRate()).divide(ONE_HUNDRED, 8, RoundingMode.HALF_UP));
        BigDecimal annualAfterTax = annualBeforeTax.multiply(taxMultiplier);
        BigDecimal monthlyAfterTax = annualAfterTax.divide(TWELVE, 2, RoundingMode.HALF_UP);
        BigDecimal dividendYield = investedAmount.compareTo(BigDecimal.ZERO) > 0
                ? annualBeforeTax.divide(investedAmount, 8, RoundingMode.HALF_UP).multiply(ONE_HUNDRED)
                : BigDecimal.ZERO;

        return new CalculatorDto.EtfDividendResponse(
                scale(investedAmount),
                scale(annualBeforeTax),
                scale(annualAfterTax),
                monthlyAfterTax,
                scale(dividendYield)
        );
    }

    public CalculatorDto.FireResponse calculateFire(CalculatorDto.FireRequest request) {
        BigDecimal targetAssets = safe(request.annualExpenses())
                .divide(safe(request.withdrawalRate()).divide(ONE_HUNDRED, 8, RoundingMode.HALF_UP), 2, RoundingMode.HALF_UP);
        BigDecimal assets = safe(request.currentAssets());
        BigDecimal annualReturn = safe(request.expectedReturnRate()).divide(ONE_HUNDRED, 8, RoundingMode.HALF_UP);
        int years = 0;

        while (assets.compareTo(targetAssets) < 0 && years < 100) {
            assets = assets.multiply(BigDecimal.ONE.add(annualReturn)).add(safe(request.annualSavings()));
            years++;
        }

        return new CalculatorDto.FireResponse(scale(targetAssets), years, scale(assets));
    }

    public CalculatorDto.RetirementResponse calculateRetirement(CalculatorDto.RetirementRequest request) {
        int years = Math.max(0, request.retirementAge() - request.currentAge());
        BigDecimal projected = futureValue(safe(request.currentSavings()), safe(request.monthlyContribution()), years, safe(request.annualReturnRate()));
        BigDecimal contributions = safe(request.currentSavings()).add(safe(request.monthlyContribution()).multiply(BigDecimal.valueOf(years * 12L)));
        return new CalculatorDto.RetirementResponse(years, scale(contributions), scale(projected));
    }

    public CalculatorDto.DcaResponse calculateDca(CalculatorDto.DcaRequest request) {
        BigDecimal futureValue = futureValue(safe(request.initialInvestment()), safe(request.monthlyContribution()), request.years(), safe(request.annualReturnRate()));
        BigDecimal contributions = safe(request.initialInvestment()).add(safe(request.monthlyContribution()).multiply(BigDecimal.valueOf(request.years() * 12L)));
        return new CalculatorDto.DcaResponse(scale(contributions), scale(futureValue), scale(futureValue.subtract(contributions)));
    }

    public CalculatorDto.AveragePriceResponse calculateAveragePrice(CalculatorDto.AveragePriceRequest request) {
        BigDecimal currentQuantity = safe(request.currentQuantity());
        BigDecimal additionalQuantity = safe(request.additionalQuantity());
        BigDecimal totalQuantity = currentQuantity.add(additionalQuantity);
        BigDecimal currentInvestment = currentQuantity.multiply(safe(request.currentAveragePrice()));
        BigDecimal additionalInvestment = additionalQuantity.multiply(safe(request.additionalPrice()));
        BigDecimal totalInvestment = currentInvestment.add(additionalInvestment);
        BigDecimal averagePrice = totalQuantity.compareTo(BigDecimal.ZERO) > 0
                ? totalInvestment.divide(totalQuantity, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new CalculatorDto.AveragePriceResponse(
                scale(totalQuantity),
                scale(totalInvestment),
                averagePrice,
                scale(additionalInvestment)
        );
    }

    private BigDecimal futureValue(BigDecimal initial, BigDecimal monthlyContribution, int years, BigDecimal annualReturnRate) {
        BigDecimal monthlyRate = annualReturnRate.divide(ONE_HUNDRED, 8, RoundingMode.HALF_UP).divide(TWELVE, 8, RoundingMode.HALF_UP);
        BigDecimal total = initial;
        for (int month = 0; month < years * 12; month++) {
            total = total.multiply(BigDecimal.ONE.add(monthlyRate)).add(monthlyContribution);
        }
        return total;
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
