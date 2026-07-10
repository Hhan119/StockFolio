package com.example.StockFolio.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.StockFolio.entity.DistributionEvent;
import com.example.StockFolio.entity.DistributionType;

@Repository
public interface DistributionEventRepository extends JpaRepository<DistributionEvent, Long> {

    List<DistributionEvent> findByInstrumentKey(String instrumentKey);

    List<DistributionEvent> findByInstrumentKeyIn(Collection<String> instrumentKeys);

    List<DistributionEvent> findByTickerIgnoreCase(String ticker);

    Optional<DistributionEvent> findFirstByInstrumentKeyOrderByPaymentDateDescExDividendDateDescCreatedAtDesc(String instrumentKey);

    boolean existsByInstrumentKeyAndExDividendDateAndPaymentDateAndAmountPerShareAndDistributionType(
            String instrumentKey,
            LocalDate exDividendDate,
            LocalDate paymentDate,
            BigDecimal amountPerShare,
            DistributionType distributionType
    );
}
