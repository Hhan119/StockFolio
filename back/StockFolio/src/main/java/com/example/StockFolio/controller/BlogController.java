package com.example.StockFolio.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/blog")
public class BlogController {

    @GetMapping("/posts")
    public List<BlogPost> posts() {
        return List.of(
                new BlogPost(1L, "ETF 배당률을 볼 때 놓치기 쉬운 것", "배당률, 분배금 안정성, 총보수를 함께 확인하는 방법입니다.", "Dividend", LocalDate.now().minusDays(2)),
                new BlogPost(2L, "FIRE 목표 금액을 정하는 법", "인출률과 생활비를 기준으로 목표 자산을 계산합니다.", "FIRE", LocalDate.now().minusDays(7)),
                new BlogPost(3L, "월배당 포트폴리오 리밸런싱", "월별 현금흐름과 섹터 비중을 함께 조정하는 접근입니다.", "Portfolio", LocalDate.now().minusDays(14))
        );
    }

    public record BlogPost(Long id, String title, String summary, String category, LocalDate publishedAt) {}
}
