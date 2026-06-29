package com.example.StockFolio.service;

import java.math.BigDecimal;

import com.example.StockFolio.dto.StockDto;

public interface StockServiceImpl {
	public StockDto.Response addStock(Long portfolioId, StockDto.Request req, Long userId);
	public StockDto.Response updateStock(Long stockId, StockDto.Request req, Long userId);
	public StockDto.Response updateCurrentPrice(Long stockId, BigDecimal currentPrice, Long userId);
	public void deleteStock(Long stockId, Long userId); 
}
