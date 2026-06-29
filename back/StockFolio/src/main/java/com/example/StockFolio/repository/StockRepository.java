package com.example.StockFolio.repository;


import com.example.StockFolio.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, Long> {

    List<Stock> findByPortfolioIdOrderByCreatedAtDesc(Long portfolioId);

    @Query("SELECT s FROM Stock s WHERE s.id = :id AND s.portfolio.user.id = :userId")
    Optional<Stock> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT s FROM Stock s WHERE s.portfolio.id = :portfolioId AND s.portfolio.user.id = :userId")
    List<Stock> findByPortfolioIdAndUserId(Long portfolioId, Long userId);

    @Query("SELECT s FROM Stock s WHERE s.portfolio.id = :portfolioId AND s.portfolio.user.id = :userId AND UPPER(s.ticker) = UPPER(:ticker)")
    Optional<Stock> findByPortfolioIdAndUserIdAndTicker(Long portfolioId, Long userId, String ticker);
}
