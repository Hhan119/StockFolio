package com.example.StockFolio.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    @PostMapping("/ai")
    public AiAnalysisResponse analyze(@RequestBody AiAnalysisRequest request) {
        return new AiAnalysisResponse(List.of(
                "배당 현금흐름은 월별 편차를 줄이는 방향으로 점검하는 것이 좋습니다.",
                "단일 섹터 비중이 높다면 리밸런싱 기준 비중을 먼저 정하세요.",
                "FIRE 목표는 인출률과 배당 성장률을 함께 보수적으로 보는 편이 안정적입니다."
        ));
    }

    public record AiAnalysisRequest(String prompt) {}
    public record AiAnalysisResponse(List<String> insights) {}
}
