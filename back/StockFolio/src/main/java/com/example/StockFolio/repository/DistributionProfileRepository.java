package com.example.StockFolio.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.StockFolio.entity.DistributionProfile;

@Repository
public interface DistributionProfileRepository extends JpaRepository<DistributionProfile, Long> {

    Optional<DistributionProfile> findByInstrumentKey(String instrumentKey);

    List<DistributionProfile> findByInstrumentKeyIn(Collection<String> instrumentKeys);

    List<DistributionProfile> findByTickerIgnoreCase(String ticker);
}
