package com.example.StockFolio.service;

import com.example.StockFolio.dto.*;
import com.example.StockFolio.entity.*;
import com.example.StockFolio.repository.*;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final UserRepository userRepository;

    public List<PortfolioDto.Summary> getAllPortfolios(Long userId) {
        return portfolioRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .stream().map(this::toSummary).collect(Collectors.toList());
    }

    public PortfolioDto.Response getPortfolio(Long id, Long userId) {
        Portfolio p = portfolioRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new EntityNotFoundException("포트폴리오를 찾을 수 없습니다: " + id));
        return toResponse(p);
    }

    @Transactional
    public PortfolioDto.Response createPortfolio(PortfolioDto.Request req, Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        Portfolio p = Portfolio.builder()
                .user(user).name(req.getName()).description(req.getDescription())
                .initialCapital(req.getInitialCapital() != null ? req.getInitialCapital() : BigDecimal.ZERO)
                .build();
        return toResponse(portfolioRepository.save(p));
    }

    @Transactional
    public PortfolioDto.Response updatePortfolio(Long id, PortfolioDto.Request req, Long userId) {
        Portfolio p = portfolioRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new EntityNotFoundException("포트폴리오를 찾을 수 없습니다: " + id));
        p.setName(req.getName());
        p.setDescription(req.getDescription());
        if (req.getInitialCapital() != null) p.setInitialCapital(req.getInitialCapital());
        return toResponse(p);
    }

    @Transactional
    public void deletePortfolio(Long id, Long userId) {
        if (!portfolioRepository.existsByIdAndUserId(id, userId))
            throw new EntityNotFoundException("포트폴리오를 찾을 수 없습니다: " + id);
        portfolioRepository.deleteById(id);
    }

    // ── mapping ──────────────────────────────────────────────
    public PortfolioDto.Response toResponse(Portfolio p) {
        List<StockDto.Response> stockResponses = p.getStocks().stream()
                .map(this::toStockResponse).collect(Collectors.toList());

        BigDecimal totalCost  = stockResponses.stream().map(StockDto.Response::getTotalCost).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalValue = stockResponses.stream().map(StockDto.Response::getTotalValue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pnl        = totalValue.subtract(totalCost);
        Double pnlRate        = totalCost.compareTo(BigDecimal.ZERO) > 0
                ? pnl.divide(totalCost, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;

        return PortfolioDto.Response.builder()
                .id(p.getId()).name(p.getName()).description(p.getDescription())
                .initialCapital(p.getInitialCapital())
                .totalCost(totalCost).totalValue(totalValue)
                .totalProfitLoss(pnl).totalProfitLossRate(pnlRate)
                .stockCount(stockResponses.size()).stocks(stockResponses)
                .createdAt(p.getCreatedAt()).updatedAt(p.getUpdatedAt())
                .build();
    }

    private PortfolioDto.Summary toSummary(Portfolio p) {
        BigDecimal totalCost  = p.getStocks().stream().map(s -> s.getAvgPrice().multiply(BigDecimal.valueOf(s.getQuantity()))).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalValue = p.getStocks().stream().map(s -> { BigDecimal price = s.getCurrentPrice() != null ? s.getCurrentPrice() : s.getAvgPrice(); return price.multiply(BigDecimal.valueOf(s.getQuantity())); }).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pnl        = totalValue.subtract(totalCost);
        Double pnlRate        = totalCost.compareTo(BigDecimal.ZERO) > 0 ? pnl.divide(totalCost, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;

        return PortfolioDto.Summary.builder()
                .id(p.getId()).name(p.getName()).description(p.getDescription())
                .totalCost(totalCost).totalValue(totalValue)
                .totalProfitLoss(pnl).totalProfitLossRate(pnlRate)
                .stockCount(p.getStocks().size()).updatedAt(p.getUpdatedAt())
                .build();
    }

    public StockDto.Response toStockResponse(Stock s) {
        BigDecimal totalCost  = s.getAvgPrice().multiply(BigDecimal.valueOf(s.getQuantity()));
        BigDecimal price      = s.getCurrentPrice() != null ? s.getCurrentPrice() : s.getAvgPrice();
        BigDecimal totalValue = price.multiply(BigDecimal.valueOf(s.getQuantity()));
        BigDecimal pnl        = totalValue.subtract(totalCost);
        Double pnlRate        = totalCost.compareTo(BigDecimal.ZERO) > 0
                ? pnl.divide(totalCost, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue() : 0.0;

        return StockDto.Response.builder()
                .id(s.getId()).portfolioId(s.getPortfolio().getId())
                .ticker(s.getTicker()).name(s.getName()).quantity(s.getQuantity())
                .avgPrice(s.getAvgPrice()).currentPrice(price)
                .totalCost(totalCost).totalValue(totalValue)
                .profitLoss(pnl).profitLossRate(pnlRate)
                .purchaseDate(s.getPurchaseDate()).sector(s.getSector())
                .currency(s.getCurrency()).memo(s.getMemo())
                .createdAt(s.getCreatedAt()).updatedAt(s.getUpdatedAt())
                .build();
    }
}