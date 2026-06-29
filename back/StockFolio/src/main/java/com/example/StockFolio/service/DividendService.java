package com.example.StockFolio.service;

import com.example.StockFolio.dto.DividendDto;
import com.example.StockFolio.entity.Dividend;
import com.example.StockFolio.entity.Stock;
import com.example.StockFolio.repository.DividendRepository;
import com.example.StockFolio.repository.StockRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Month;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DividendService {

    private final DividendRepository dividendRepository;
    private final StockRepository stockRepository;

    public List<DividendDto.Response> getByPortfolio(Long portfolioId, Long userId) {
        return dividendRepository.findByPortfolioIdAndUserId(portfolioId, userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DividendDto.Response addDividend(Long stockId, DividendDto.Request request, Long userId) {
        Stock stock = stockRepository.findByIdAndUserId(stockId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + stockId));
        Dividend dividend = Dividend.builder()
                .stock(stock)
                .frequency(request.getFrequency())
                .dividendPerShare(request.getDividendPerShare())
                .amountReceived(resolveReceivedAmount(stock, request))
                .exDividendDate(request.getExDividendDate())
                .paymentDate(request.getPaymentDate())
                .paymentMonth(resolvePaymentMonth(request))
                .memo(request.getMemo())
                .build();
        return toResponse(dividendRepository.save(dividend));
    }

    @Transactional
    public DividendDto.Response updateDividend(Long dividendId, DividendDto.Request request, Long userId) {
        Dividend dividend = dividendRepository.findByIdAndUserId(dividendId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Dividend not found: " + dividendId));
        dividend.setFrequency(request.getFrequency());
        dividend.setDividendPerShare(request.getDividendPerShare());
        dividend.setAmountReceived(resolveReceivedAmount(dividend.getStock(), request));
        dividend.setExDividendDate(request.getExDividendDate());
        dividend.setPaymentDate(request.getPaymentDate());
        dividend.setPaymentMonth(resolvePaymentMonth(request));
        dividend.setMemo(request.getMemo());
        return toResponse(dividend);
    }

    @Transactional
    public void deleteDividend(Long dividendId, Long userId) {
        Dividend dividend = dividendRepository.findByIdAndUserId(dividendId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Dividend not found: " + dividendId));
        dividendRepository.delete(dividend);
    }

    public DividendDto.AnnualSummary getAnnualSummary(Long portfolioId, Long userId) {
        List<DividendDto.Response> items = getByPortfolio(portfolioId, userId);
        List<DividendDto.MonthlySummary> monthly = new ArrayList<>();

        for (int month = 1; month <= 12; month++) {
            int currentMonth = month;
            List<DividendDto.Response> monthItems = items.stream()
                    .filter(item -> occursInMonth(item, currentMonth))
                    .toList();
            BigDecimal estimated = monthItems.stream()
                    .map(DividendDto.Response::getTotalDividend)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal received = monthItems.stream()
                    .map(item -> item.getAmountReceived() != null ? item.getAmountReceived() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            monthly.add(DividendDto.MonthlySummary.builder()
                    .month(month)
                    .monthName(Month.of(month).name())
                    .estimatedTotal(estimated)
                    .receivedTotal(received)
                    .dividendCount(monthItems.size())
                    .items(monthItems)
                    .build());
        }

        BigDecimal annualEstimated = monthly.stream()
                .map(DividendDto.MonthlySummary::getEstimatedTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalReceived = monthly.stream()
                .map(DividendDto.MonthlySummary::getReceivedTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int dividendStockCount = (int) items.stream().map(DividendDto.Response::getStockId).distinct().count();

        return DividendDto.AnnualSummary.builder()
                .annualEstimated(annualEstimated)
                .monthlyAverage(annualEstimated.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP))
                .totalReceived(totalReceived)
                .dividendStockCount(dividendStockCount)
                .monthly(monthly)
                .build();
    }

    private DividendDto.Response toResponse(Dividend dividend) {
        Stock stock = dividend.getStock();
        BigDecimal totalDividend = dividend.getDividendPerShare()
                .multiply(BigDecimal.valueOf(stock.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);

        return DividendDto.Response.builder()
                .id(dividend.getId())
                .stockId(stock.getId())
                .stockTicker(stock.getTicker())
                .stockName(stock.getName())
                .stockQuantity(stock.getQuantity())
                .frequency(dividend.getFrequency())
                .dividendPerShare(dividend.getDividendPerShare())
                .totalDividend(totalDividend)
                .amountReceived(dividend.getAmountReceived())
                .exDividendDate(dividend.getExDividendDate())
                .paymentDate(dividend.getPaymentDate())
                .paymentMonth(dividend.getPaymentMonth())
                .memo(dividend.getMemo())
                .createdAt(dividend.getCreatedAt())
                .build();
    }

    private BigDecimal resolveReceivedAmount(Stock stock, DividendDto.Request request) {
        if (request.getAmountReceived() != null) {
            return request.getAmountReceived();
        }
        return request.getDividendPerShare()
                .multiply(BigDecimal.valueOf(stock.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Integer resolvePaymentMonth(DividendDto.Request request) {
        if (request.getPaymentMonth() != null) {
            return request.getPaymentMonth();
        }
        return request.getPaymentDate() != null ? request.getPaymentDate().getMonthValue() : null;
    }

    private boolean occursInMonth(DividendDto.Response item, int month) {
        if (item.getPaymentMonth() == null) {
            return false;
        }

        int startMonth = item.getPaymentMonth();
        return switch (item.getFrequency()) {
            case MONTHLY -> true;
            case QUARTERLY -> Math.floorMod(month - startMonth, 3) == 0;
            case SEMI_ANNUAL -> Math.floorMod(month - startMonth, 6) == 0;
            case ANNUAL, SPECIAL -> month == startMonth;
        };
    }
}
