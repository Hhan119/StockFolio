package com.example.StockFolio.repository;

import com.example.StockFolio.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {

    List<Portfolio> findByUserIdOrderByUpdatedAtDesc(Long userId);

    @Query("SELECT p FROM Portfolio p LEFT JOIN FETCH p.stocks WHERE p.id = :id AND p.user.id = :userId")
    Optional<Portfolio> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);
}