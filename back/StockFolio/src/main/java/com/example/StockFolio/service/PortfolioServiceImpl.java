package com.example.StockFolio.service;

import java.util.List;

import com.example.StockFolio.dto.PortfolioDto;
import com.example.StockFolio.dto.StockDto;
import com.example.StockFolio.entity.Portfolio;
import com.example.StockFolio.entity.Stock;

public interface PortfolioServiceImpl {
	public List<PortfolioDto.Summary> getAllPortfolios(Long userId);
	public PortfolioDto.Response getPortfolio(Long id, Long userId);
	public PortfolioDto.Response createPortfolio(PortfolioDto.Request req, Long userId);
	public PortfolioDto.Response updatePortfolio(Long id, PortfolioDto.Request req, Long userId); 
	public void deletePortfolio(Long id, Long userId);
	public PortfolioDto.Response toResponse(Portfolio p);
	public PortfolioDto.Summary toSummary(Portfolio p);
	public StockDto.Response toStockResponse(Stock s);
					 
}
