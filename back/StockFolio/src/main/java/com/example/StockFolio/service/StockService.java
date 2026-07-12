package com.example.StockFolio.service;

import com.example.StockFolio.dto.StockDto;
import com.example.StockFolio.entity.Portfolio;
import com.example.StockFolio.entity.Stock;
import com.example.StockFolio.repository.PortfolioRepository;
import com.example.StockFolio.repository.StockRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockService {

    private final StockRepository stockRepository;
    private final PortfolioRepository portfolioRepository;
    private final PortfolioService portfolioService;
    private final DistributionCalculationService distributionCalculationService;

    @Transactional
    public List<StockDto.Response> getStocks(Long portfolioId, Long userId) {
        return stockRepository.findByPortfolioIdAndUserId(portfolioId, userId)
                .stream()
                .peek(portfolioService::refreshStockCurrentPrice)
                .map(portfolioService::toStockResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public StockDto.Response addStock(Long portfolioId, StockDto.Request req, Long userId) {
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Portfolio not found: " + portfolioId));

        Stock existing = stockRepository.findByPortfolioIdAndUserIdAndTicker(portfolioId, userId, req.getTicker())
                .orElse(null);

        if (existing != null) {
            int oldQuantity = existing.getQuantity() != null ? existing.getQuantity() : 0;
            int addedQuantity = req.getQuantity() != null ? req.getQuantity() : 0;
            int totalQuantity = oldQuantity + addedQuantity;
            if (totalQuantity <= 0) {
                throw new IllegalArgumentException("Quantity must be greater than zero.");
            }

            BigDecimal oldCost = existing.getAvgPrice().multiply(BigDecimal.valueOf(oldQuantity));
            BigDecimal addedCost = req.getAvgPrice().multiply(BigDecimal.valueOf(addedQuantity));
            BigDecimal mergedAverage = oldCost.add(addedCost)
                    .divide(BigDecimal.valueOf(totalQuantity), 2, RoundingMode.HALF_UP);

            existing.setQuantity(totalQuantity);
            existing.setAvgPrice(mergedAverage);
            existing.setCurrentPrice(req.getCurrentPrice() != null ? req.getCurrentPrice() : existing.getCurrentPrice());
            existing.setName(req.getName() != null ? req.getName() : existing.getName());
            existing.setPurchaseDate(req.getPurchaseDate() != null ? req.getPurchaseDate() : existing.getPurchaseDate());
            existing.setSector(req.getSector() != null ? req.getSector() : existing.getSector());
            existing.setCurrency(req.getCurrency() != null ? req.getCurrency() : existing.getCurrency());
            existing.setMemo(req.getMemo() != null && !req.getMemo().isBlank() ? req.getMemo() : existing.getMemo());
            distributionCalculationService.seedDistributionForStock(existing);
            return portfolioService.toStockResponse(existing);
        }

        Stock stock = Stock.builder()
                .portfolio(portfolio)
                .ticker(req.getTicker().toUpperCase())
                .name(req.getName())
                .quantity(req.getQuantity())
                .avgPrice(req.getAvgPrice())
                .currentPrice(req.getCurrentPrice() != null ? req.getCurrentPrice() : req.getAvgPrice())
                .purchaseDate(req.getPurchaseDate())
                .sector(req.getSector())
                .currency(req.getCurrency() != null ? req.getCurrency() : "KRW")
                .memo(req.getMemo())
                .build();

        Stock saved = stockRepository.save(stock);
        distributionCalculationService.seedDistributionForStock(saved);
        return portfolioService.toStockResponse(saved);
    }

    @Transactional
    public StockDto.Response updateStock(Long stockId, StockDto.Request req, Long userId) {
        Stock stock = stockRepository.findByIdAndUserId(stockId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + stockId));

        stock.setTicker(req.getTicker().toUpperCase());
        stock.setName(req.getName());
        stock.setQuantity(req.getQuantity());
        stock.setAvgPrice(req.getAvgPrice());
        if (req.getCurrentPrice() != null) stock.setCurrentPrice(req.getCurrentPrice());
        stock.setPurchaseDate(req.getPurchaseDate());
        stock.setSector(req.getSector());
        stock.setCurrency(req.getCurrency());
        stock.setMemo(req.getMemo());
        return portfolioService.toStockResponse(stock);
    }

    @Transactional
    public StockDto.Response updateCurrentPrice(Long stockId, BigDecimal currentPrice, Long userId) {
        Stock stock = stockRepository.findByIdAndUserId(stockId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + stockId));
        stock.setCurrentPrice(currentPrice);
        return portfolioService.toStockResponse(stock);
    }

    @Transactional
    public void deleteStock(Long stockId, Long userId) {
        Stock stock = stockRepository.findByIdAndUserId(stockId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Stock not found: " + stockId));
        stockRepository.delete(stock);
    }
}
