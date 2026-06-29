package com.example.StockFolio.service;

import com.example.StockFolio.dto.MarketDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MarketDataService {

    private final ObjectMapper objectMapper;
    private final RestClient.Builder restClientBuilder;

    @Value("${external.finnhub.api-key:}")
    private String finnhubApiKey;

    @Value("${external.kis.app-key:}")
    private String kisAppKey;

    @Value("${external.kis.app-secret:}")
    private String kisAppSecret;

    @Value("${external.kis.base-url:https://openapi.koreainvestment.com:9443}")
    private String kisBaseUrl;

    private String kisAccessToken;

    public List<MarketDto.SearchResult> search(String market, String keyword) {
        String normalizedMarket = normalizeMarket(market);
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        if (normalizedKeyword.isBlank()) return List.of();

        try {
            List<MarketDto.SearchResult> external = searchExternal(normalizedMarket, normalizedKeyword);
            if (!external.isEmpty()) return external;

            String json = runPython("search", normalizedMarket, normalizedKeyword);
            List<MarketDto.SearchResult> python = objectMapper.readValue(json, new TypeReference<>() {});
            if (!python.isEmpty()) return python;
        } catch (Exception ignored) {
            // Fall through to local fallback data.
        }
        return fallbackSearch(normalizedMarket, normalizedKeyword);
    }

    public MarketDto.Quote quote(String market, String ticker) {
        String normalizedMarket = normalizeMarket(market);
        String normalizedTicker = ticker == null ? "" : ticker.trim().toUpperCase();

        try {
            MarketDto.Quote external = quoteExternal(normalizedMarket, normalizedTicker);
            if (external != null && external.currentPrice().compareTo(BigDecimal.ZERO) > 0) return external;

            String json = runPython("quote", normalizedMarket, normalizedTicker);
            MarketDto.Quote python = objectMapper.readValue(json, MarketDto.Quote.class);
            if (python.currentPrice().compareTo(BigDecimal.ZERO) > 0) return python;
        } catch (Exception ignored) {
            // Fall through to local fallback data.
        }
        return fallbackQuote(normalizedMarket, normalizedTicker);
    }

    public MarketDto.StockDetail detail(String ticker) {
        MarketDto.Quote quote = quote(inferMarket(ticker), ticker);
        return new MarketDto.StockDetail(
                quote.ticker(),
                quote.name(),
                quote.market(),
                quote.currentPrice(),
                quote.changeRate(),
                quote.marketCap(),
                quote.per(),
                quote.pbr(),
                quote.dividendYield()
        );
    }

    private List<MarketDto.SearchResult> searchExternal(String market, String keyword) {
        if ("US".equals(market) && !finnhubApiKey.isBlank()) {
            try {
                FinnhubSearchResponse response = restClientBuilder.build()
                        .get()
                        .uri("https://finnhub.io/api/v1/search?q={keyword}&token={token}", keyword, finnhubApiKey)
                        .retrieve()
                        .body(FinnhubSearchResponse.class);

                if (response == null || response.result() == null) return List.of();

                return response.result().stream()
                        .filter(item -> item.symbol() != null && !item.symbol().contains("."))
                        .limit(40)
                        .map(item -> {
                            MarketDto.Quote quote = quoteExternal("US", item.symbol());
                            BigDecimal price = quote != null ? quote.currentPrice() : BigDecimal.ZERO;
                            return new MarketDto.SearchResult("US", item.symbol(), item.description(), "USD", item.type(), price, true);
                        })
                        .toList();
            } catch (Exception ignored) {
                return List.of();
            }
        }
        return List.of();
    }

    private MarketDto.Quote quoteExternal(String market, String ticker) {
        if ("KR".equals(market) && hasKisCredentials()) return quoteKis(ticker);
        if ("US".equals(market) && !finnhubApiKey.isBlank()) return quoteFinnhub(ticker);
        return null;
    }

    private MarketDto.Quote quoteFinnhub(String ticker) {
        try {
            FinnhubQuoteResponse response = restClientBuilder.build()
                    .get()
                    .uri("https://finnhub.io/api/v1/quote?symbol={ticker}&token={token}", ticker, finnhubApiKey)
                    .retrieve()
                    .body(FinnhubQuoteResponse.class);
            if (response == null || response.c() == null) return null;
            BigDecimal current = response.c();
            BigDecimal previous = response.pc() != null ? response.pc() : current;
            return new MarketDto.Quote("US", ticker, ticker, "USD", current, previous, percentChange(current, previous), "-", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "finnhub");
        } catch (Exception ignored) {
            return null;
        }
    }

    private MarketDto.Quote quoteKis(String ticker) {
        try {
            JsonNode output = restClientBuilder.build()
                    .get()
                    .uri(kisBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD={ticker}", ticker)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + kisToken())
                    .header("appkey", kisAppKey)
                    .header("appsecret", kisAppSecret)
                    .header("tr_id", "FHKST01010100")
                    .retrieve()
                    .body(JsonNode.class)
                    .path("output");

            BigDecimal current = decimal(output.path("stck_prpr").asText());
            BigDecimal previous = decimal(output.path("stck_sdpr").asText());
            return new MarketDto.Quote(
                    "KR",
                    ticker,
                    displayName(ticker),
                    "KRW",
                    current,
                    previous,
                    decimal(output.path("prdy_ctrt").asText()),
                    "-",
                    decimal(output.path("per").asText()),
                    decimal(output.path("pbr").asText()),
                    defaultDividendYield(ticker),
                    "kis"
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private String kisToken() {
        if (kisAccessToken != null && !kisAccessToken.isBlank()) return kisAccessToken;

        JsonNode response = restClientBuilder.build()
                .post()
                .uri(kisBaseUrl + "/oauth2/tokenP")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("grant_type", "client_credentials", "appkey", kisAppKey, "appsecret", kisAppSecret))
                .retrieve()
                .body(JsonNode.class);
        kisAccessToken = response.path("access_token").asText();
        return kisAccessToken;
    }

    private String runPython(String action, String market, String value) throws Exception {
        ProcessBuilder builder = new ProcessBuilder("python", "scripts/market_data.py", action, market, value);
        builder.directory(new java.io.File("."));
        builder.redirectErrorStream(true);
        Process process = builder.start();
        boolean finished = process.waitFor(Duration.ofSeconds(10).toMillis(), TimeUnit.MILLISECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IllegalStateException("Market data script timed out");
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String output = reader.lines().reduce("", (left, right) -> left + right);
            if (process.exitValue() != 0) throw new IllegalStateException(output);
            return output;
        }
    }

    private List<MarketDto.SearchResult> fallbackSearch(String market, String keyword) {
        String lower = keyword.toLowerCase();
        String alias = koreanAlias(keyword);
        return fallbackUniverse().stream()
                .filter(item -> item.market().equals(market))
                .filter(item -> item.ticker().toLowerCase().contains(lower)
                        || item.name().toLowerCase().contains(lower)
                        || (!alias.isBlank() && item.name().toLowerCase().contains(alias)))
                .limit(30)
                .toList();
    }

    private MarketDto.Quote fallbackQuote(String market, String ticker) {
        return fallbackUniverse().stream()
                .filter(item -> item.market().equals(market))
                .filter(item -> item.ticker().equalsIgnoreCase(ticker))
                .findFirst()
                .map(item -> new MarketDto.Quote(item.market(), item.ticker(), item.name(), item.currency(), item.currentPrice(), item.currentPrice(), BigDecimal.ZERO, defaultMarketCap(item.ticker()), defaultPer(item.ticker()), defaultPbr(item.ticker()), defaultDividendYield(item.ticker()), "fallback"))
                .orElse(new MarketDto.Quote(market, ticker, ticker, "KR".equals(market) ? "KRW" : "USD", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "-", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "fallback"));
    }

    private List<MarketDto.SearchResult> fallbackUniverse() {
        return List.of(
                kr("005930", "삼성전자", 61000, true),
                kr("005935", "삼성전자우", 52000, true),
                kr("006400", "삼성SDI", 380000, false),
                kr("000660", "SK하이닉스", 220000, false),
                kr("035420", "NAVER", 180000, false),
                kr("035720", "카카오", 49000, false),
                kr("005380", "현대차", 245000, true),
                kr("000270", "기아", 112000, true),
                kr("051910", "LG화학", 310000, true),
                kr("373220", "LG에너지솔루션", 360000, false),
                kr("068270", "셀트리온", 180000, false),
                kr("105560", "KB금융", 78000, true),
                kr("055550", "신한지주", 48000, true),
                kr("096770", "SK이노베이션", 116000, true),
                kr("207940", "삼성바이오로직스", 780000, false),
                us("AAPL", "Apple Inc.", 195, true),
                us("MSFT", "Microsoft Corp.", 440, true),
                us("NVDA", "NVIDIA Corp.", 120, true),
                us("TSLA", "Tesla Inc.", 185, false),
                us("GOOGL", "Alphabet Inc.", 176, false),
                us("AMZN", "Amazon.com Inc.", 185, false),
                us("META", "Meta Platforms Inc.", 510, false),
                us("KO", "Coca-Cola Co.", 63, true),
                us("JNJ", "Johnson & Johnson", 148, true),
                us("O", "Realty Income Corp.", 54, true),
                us("SCHD", "Schwab U.S. Dividend Equity ETF", 78, true),
                us("JEPI", "JPMorgan Equity Premium Income ETF", 57, true),
                us("VOO", "Vanguard S&P 500 ETF", 500, true),
                us("SPY", "SPDR S&P 500 ETF", 545, true),
                us("QQQ", "Invesco QQQ Trust", 470, true)
        );
    }

    private MarketDto.SearchResult kr(String ticker, String name, double price, boolean dividend) {
        return new MarketDto.SearchResult("KR", ticker, name, "KRW", "KRX", BigDecimal.valueOf(price), dividend);
    }

    private MarketDto.SearchResult us(String ticker, String name, double price, boolean dividend) {
        return new MarketDto.SearchResult("US", ticker, name, "USD", "US", BigDecimal.valueOf(price), dividend);
    }

    private boolean hasKisCredentials() {
        return !kisAppKey.isBlank() && !kisAppSecret.isBlank();
    }

    private String normalizeMarket(String market) {
        return "KR".equalsIgnoreCase(market) ? "KR" : "US";
    }

    private String inferMarket(String ticker) {
        return ticker != null && ticker.matches("\\d{6}") ? "KR" : "US";
    }

    private BigDecimal decimal(String value) {
        try {
            if (value == null || value.isBlank()) return BigDecimal.ZERO;
            return new BigDecimal(value.trim().replace(",", "")).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal percentChange(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return current.subtract(previous).divide(previous, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
    }

    private String koreanAlias(String keyword) {
        if (keyword == null) return "";
        if (keyword.contains("삼성")) return "삼성";
        if (keyword.contains("하이닉스")) return "하이닉스";
        if (keyword.contains("현대")) return "현대";
        if (keyword.contains("애플")) return "apple";
        if (keyword.contains("엔비디아")) return "nvidia";
        if (keyword.contains("테슬라")) return "tesla";
        return "";
    }

    private String displayName(String ticker) {
        return fallbackUniverse().stream()
                .filter(item -> item.ticker().equalsIgnoreCase(ticker))
                .map(MarketDto.SearchResult::name)
                .findFirst()
                .orElse(ticker);
    }

    private String defaultMarketCap(String ticker) {
        return "005930".equals(ticker) ? "360조" : "-";
    }

    private BigDecimal defaultPer(String ticker) {
        return "005930".equals(ticker) ? BigDecimal.valueOf(14.2) : BigDecimal.ZERO;
    }

    private BigDecimal defaultPbr(String ticker) {
        return "005930".equals(ticker) ? BigDecimal.valueOf(1.8) : BigDecimal.ZERO;
    }

    private BigDecimal defaultDividendYield(String ticker) {
        return switch (ticker) {
            case "005930" -> BigDecimal.valueOf(2.1);
            case "SCHD" -> BigDecimal.valueOf(3.5);
            case "JEPI" -> BigDecimal.valueOf(7.2);
            default -> BigDecimal.ZERO;
        };
    }

    private record FinnhubSearchResponse(List<FinnhubSymbol> result) {}
    private record FinnhubSymbol(String symbol, String description, String type) {}
    private record FinnhubQuoteResponse(BigDecimal c, BigDecimal pc) {}
}
