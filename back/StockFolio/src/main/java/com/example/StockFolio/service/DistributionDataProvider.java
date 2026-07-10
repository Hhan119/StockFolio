package com.example.StockFolio.service;

import java.util.List;
import java.util.Optional;

import com.example.StockFolio.dto.DistributionDto;

public interface DistributionDataProvider {

    Optional<DistributionDto.ProfileResponse> getDistributionProfile(String instrumentKey);

    List<DistributionDto.EventResponse> getDistributionHistory(String instrumentKey);

    List<DistributionDto.EventResponse> getDeclaredDistributions(String instrumentKey);

    List<DistributionDto.EventResponse> getUpcomingDistributions(String instrumentKey);
}
