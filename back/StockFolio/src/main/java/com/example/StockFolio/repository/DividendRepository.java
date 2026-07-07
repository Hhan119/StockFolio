package com.example.StockFolio.repository;

import com.example.StockFolio.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DividendRepository extends JpaRepository<Dividend, Long> {

    List<Dividend> findByStockIdOrderByPaymentDateDesc(Long stockId);

    boolean existsByStockId(Long stockId);

    @Query("SELECT d FROM Dividend d JOIN d.stock s WHERE s.portfolio.id = :portfolioId AND s.portfolio.user.id = :userId")
    List<Dividend> findByPortfolioIdAndUserId(Long portfolioId, Long userId);

    @Query("SELECT d FROM Dividend d JOIN d.stock s WHERE s.portfolio.user.id = :userId")
    List<Dividend> findAllByUserId(Long userId);

    @Query("SELECT d FROM Dividend d WHERE d.id = :id AND d.stock.portfolio.user.id = :userId")
    Optional<Dividend> findByIdAndUserId(Long id, Long userId);
}
