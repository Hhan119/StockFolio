package com.example.StockFolio.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.StockFolio.dto.DistributionDto;
import com.example.StockFolio.entity.DistributionEventStatus;
import com.example.StockFolio.entity.DistributionType;
import com.example.StockFolio.service.DistributionCalculationService;
import com.example.StockFolio.service.UserDetail;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DistributionController {

    private final DistributionCalculationService distributionCalculationService;

    @GetMapping("/public/instruments/{instrumentId}/distributions")
    public List<DistributionDto.EventResponse> instrumentDistributions(
            @PathVariable String instrumentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) DistributionEventStatus status,
            @RequestParam(required = false) DistributionType distributionType,
            @RequestParam(defaultValue = "false") boolean includeSpecial,
            @RequestParam(required = false) String currency
    ) {
        return distributionCalculationService.listInstrumentEvents(instrumentId, from, to, status, distributionType, includeSpecial, currency);
    }

    @GetMapping("/public/instruments/{instrumentId}/distributions/latest")
    public DistributionDto.EventResponse latestInstrumentDistribution(@PathVariable String instrumentId) {
        return distributionCalculationService.latestInstrumentEvent(instrumentId).orElse(null);
    }

    @GetMapping("/public/instruments/{instrumentId}/distribution-profile")
    public DistributionDto.ProfileResponse instrumentProfile(@PathVariable String instrumentId) {
        return distributionCalculationService.getInstrumentProfile(instrumentId).orElse(null);
    }

    @GetMapping("/portfolios/{portfolioId}/distribution-summary")
    public DistributionDto.PortfolioDistributionSummaryResponse portfolioSummary(
            @PathVariable Long portfolioId,
            @RequestParam(defaultValue = "false") boolean includeSpecial,
            @AuthenticationPrincipal UserDetail user
    ) {
        return distributionCalculationService.getPortfolioSummary(portfolioId, user.getId(), includeSpecial);
    }

    @GetMapping("/portfolios/{portfolioId}/distribution-calendar")
    public List<DistributionDto.CalendarEventResponse> portfolioCalendar(
            @PathVariable Long portfolioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "false") boolean includeSpecial,
            @AuthenticationPrincipal UserDetail user
    ) {
        return distributionCalculationService.getPortfolioCalendar(portfolioId, user.getId(), from, to, includeSpecial);
    }

    @GetMapping("/holdings/{holdingId}/distribution-summary")
    public DistributionDto.HoldingDistributionSummaryResponse holdingSummary(
            @PathVariable Long holdingId,
            @RequestParam(defaultValue = "false") boolean includeSpecial,
            @AuthenticationPrincipal UserDetail user
    ) {
        return distributionCalculationService.getHoldingSummary(holdingId, user.getId(), includeSpecial);
    }

    @GetMapping("/holdings/{holdingId}/distribution-projection")
    public DistributionDto.HoldingDistributionSummaryResponse holdingProjection(
            @PathVariable Long holdingId,
            @RequestParam(defaultValue = "false") boolean includeSpecial,
            @AuthenticationPrincipal UserDetail user
    ) {
        return distributionCalculationService.getHoldingSummary(holdingId, user.getId(), includeSpecial);
    }

    @PostMapping("/holdings/{holdingId}/manual-distribution")
    @ResponseStatus(HttpStatus.CREATED)
    public DistributionDto.EventResponse manualDistribution(
            @PathVariable Long holdingId,
            @Valid @RequestBody DistributionDto.ManualDistributionRequest request,
            @AuthenticationPrincipal UserDetail user
    ) {
        return distributionCalculationService.createManualDistribution(holdingId, request, user.getId());
    }

    @PostMapping("/admin/instruments/{instrumentId}/distributions")
    @ResponseStatus(HttpStatus.CREATED)
    public DistributionDto.EventResponse createAdminDistribution(
            @PathVariable String instrumentId,
            @Valid @RequestBody DistributionDto.EventRequest request
    ) {
        return distributionCalculationService.createAdminDistribution(instrumentId, request);
    }

    @PutMapping("/admin/distributions/{distributionEventId}")
    public DistributionDto.EventResponse updateAdminDistribution(
            @PathVariable Long distributionEventId,
            @Valid @RequestBody DistributionDto.EventRequest request
    ) {
        return distributionCalculationService.updateAdminDistribution(distributionEventId, request);
    }

    @PostMapping("/admin/instruments/{instrumentId}/distribution-profile")
    @ResponseStatus(HttpStatus.CREATED)
    public DistributionDto.ProfileResponse upsertProfile(
            @PathVariable String instrumentId,
            @Valid @RequestBody DistributionDto.ProfileRequest request
    ) {
        return distributionCalculationService.upsertAdminProfile(instrumentId, request);
    }
}
