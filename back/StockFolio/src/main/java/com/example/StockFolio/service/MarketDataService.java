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
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class MarketDataService {

    private static final DateTimeFormatter KRX_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final Duration TOP_ETF_CACHE_TTL = Duration.ofHours(24);
    private static final Duration ETF_UNIVERSE_CACHE_TTL = Duration.ofHours(24);
    private static final Duration INSTRUMENT_CACHE_TTL = Duration.ofMinutes(15);

    private final ObjectMapper objectMapper;
    private final RestClient.Builder restClientBuilder;

    @Value("${external.fmp.api-key:}")
    private String fmpApiKey;

    @Value("${external.fmp.base-url:https://financialmodelingprep.com/stable}")
    private String fmpBaseUrl;

    @Value("${external.krx.api-key:}")
    private String krxApiKey;

    @Value("${external.krx.base-url:https://data-dbg.krx.co.kr/svc/apis}")
    private String krxBaseUrl;

    @Value("${external.opendart.api-key:}")
    private String openDartApiKey;

    @Value("${external.opendart.base-url:https://opendart.fss.or.kr/api}")
    private String openDartBaseUrl;

    @Value("${external.finnhub.api-key:}")
    private String finnhubApiKey;

    @Value("${external.kis.app-key:}")
    private String kisAppKey;

    @Value("${external.kis.app-secret:}")
    private String kisAppSecret;

    @Value("${external.kis.base-url:https://openapi.koreainvestment.com:9443}")
    private String kisBaseUrl;

    @Value("${external.python.bin:${PYTHON_BIN:python}}")
    private String pythonBin;

    private String kisAccessToken;
    private volatile Map<String, OpenDartCorp> openDartCorpCache = Map.of();
    private final Map<String, CachedTopEtfs> topEtfCache = new ConcurrentHashMap<>();
    private final Map<String, CachedEtfUniverse> etfUniverseCache = new ConcurrentHashMap<>();
    private final Map<String, CachedInstrumentSnapshot> instrumentSnapshotCache = new ConcurrentHashMap<>();

    public List<MarketDto.SearchResult> search(String market, String keyword) {
        String normalizedMarket = normalizeMarket(market);
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        if (normalizedKeyword.isBlank()) return List.of();

        try {
            List<MarketDto.SearchResult> external = searchExternal(normalizedMarket, normalizedKeyword);
            if (!external.isEmpty()) return enrichSearchPrices(external);

            String json = runPython("search", normalizedMarket, normalizedKeyword);
            List<MarketDto.SearchResult> python = objectMapper.readValue(json, new TypeReference<>() {});
            if (!python.isEmpty()) return enrichSearchPrices(python);
        } catch (Exception ignored) {
            // Fall through to local fallback data.
        }
        return enrichSearchPrices(fallbackSearch(normalizedMarket, normalizedKeyword));
    }

    public MarketDto.Quote quote(String market, String ticker) {
        String normalizedMarket = normalizeMarket(market);
        String normalizedTicker = ticker == null ? "" : ticker.trim().toUpperCase();

        try {
            MarketDto.Quote external = quoteExternal(normalizedMarket, normalizedTicker);
            if (isUsableQuote(external)) return external;

            String json = runPython("quote", normalizedMarket, normalizedTicker);
            MarketDto.Quote python = objectMapper.readValue(json, MarketDto.Quote.class);
            if (isUsableQuote(python)) return python;
        } catch (Exception ignored) {
            // Fall through to local fallback data.
        }
        return fallbackQuote(normalizedMarket, normalizedTicker);
    }

    public List<MarketDto.SearchResult> topEtfs(String market, int limit) {
        String normalizedMarket = normalizeTopMarket(market);
        int size = Math.max(1, Math.min(limit, 20));
        String cacheKey = normalizedMarket + ":" + size + ":" + LocalDate.now();
        CachedTopEtfs cached = topEtfCache.get(cacheKey);
        if (cached != null && Duration.between(cached.cachedAt(), Instant.now()).compareTo(TOP_ETF_CACHE_TTL) < 0) {
            return cached.items();
        }

        List<MarketDto.SearchResult> items = topEtfsExternal(normalizedMarket, size);
        if (items.isEmpty()) items = fallbackTopEtfs(normalizedMarket, size);

        List<MarketDto.SearchResult> enriched = enrichSearchPrices(items).stream()
                .limit(size)
                .toList();
        topEtfCache.put(cacheKey, new CachedTopEtfs(Instant.now(), enriched));
        return enriched;
    }

    public List<MarketDto.EtfSearchResult> searchEtfs(String market, String keyword, int limit) {
        String normalizedMarket = normalizeTopMarket(market);
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        int size = Math.max(1, Math.min(limit, 100));
        List<MarketDto.EtfSearchResult> results = new ArrayList<>();

        if ("ALL".equals(normalizedMarket) || "KR".equals(normalizedMarket)) {
            results.addAll(searchKoreanEtfs(normalizedKeyword, size));
        }
        if ("ALL".equals(normalizedMarket) || "US".equals(normalizedMarket)) {
            results.addAll(searchUsEtfs(normalizedKeyword, size));
        }

        Map<String, MarketDto.EtfSearchResult> deduped = new LinkedHashMap<>();
        results.forEach(item -> deduped.putIfAbsent(item.market() + ":" + item.ticker(), item));
        return deduped.values().stream()
                .sorted(Comparator
                        .comparing((MarketDto.EtfSearchResult item) -> exactEtfMatch(item, normalizedKeyword) ? 0 : 1)
                        .thenComparing(MarketDto.EtfSearchResult::market)
                        .thenComparing(MarketDto.EtfSearchResult::name))
                .limit(size)
                .toList();
    }

    public MarketDto.InstrumentSnapshot instrumentSnapshot(String market, String ticker) {
        String normalizedMarket = "AUTO".equalsIgnoreCase(market) ? inferMarket(ticker) : normalizeMarket(market);
        String normalizedTicker = ticker == null ? "" : ticker.trim().toUpperCase();
        String cacheKey = normalizedMarket + ":" + normalizedTicker;
        CachedInstrumentSnapshot cached = instrumentSnapshotCache.get(cacheKey);
        if (cached != null && Duration.between(cached.cachedAt(), Instant.now()).compareTo(INSTRUMENT_CACHE_TTL) < 0) {
            return cached.snapshot();
        }

        MarketDto.Quote quote = quote(normalizedMarket, normalizedTicker);
        MarketDto.EtfProfile etfProfile = "KR".equals(normalizedMarket)
                ? koreanEtfProfile(normalizedTicker, quote)
                : fmpEtfProfile(normalizedTicker, quote);
        boolean etf = etfProfile != null || isEtfTicker(normalizedMarket, normalizedTicker);
        if (etf && etfProfile == null) etfProfile = fallbackEtfProfile(normalizedMarket, normalizedTicker, quote);

        List<MarketDto.DividendEvent> dividends = dividendHistory(normalizedMarket, normalizedTicker);
        List<MarketDto.EtfHolding> holdings = etf
                ? ("KR".equals(normalizedMarket) ? koreanEtfHoldings(normalizedTicker) : fmpEtfHoldings(normalizedTicker))
                : List.of();
        List<MarketDto.FinancialPeriod> financials = etf
                ? List.of()
                : ("KR".equals(normalizedMarket) ? openDartFinancials(normalizedTicker) : fmpFinancials(normalizedTicker));

        Set<String> sources = new LinkedHashSet<>();
        if (quote != null && hasText(quote.source())) sources.add(quote.source());
        if (etfProfile != null && hasText(etfProfile.source())) sources.add(etfProfile.source());
        holdings.stream().map(MarketDto.EtfHolding::source).filter(this::hasText).forEach(sources::add);
        dividends.stream().map(MarketDto.DividendEvent::source).filter(this::hasText).forEach(sources::add);
        financials.stream().map(MarketDto.FinancialPeriod::source).filter(this::hasText).forEach(sources::add);

        MarketDto.InstrumentSnapshot snapshot = new MarketDto.InstrumentSnapshot(
                normalizedMarket,
                normalizedTicker,
                firstNonBlank(etfProfile != null ? etfProfile.name() : "", quote != null ? quote.name() : "", normalizedTicker),
                etf,
                quote,
                etfProfile,
                holdings,
                dividends,
                financials,
                Instant.now(),
                List.copyOf(sources)
        );
        instrumentSnapshotCache.put(cacheKey, new CachedInstrumentSnapshot(Instant.now(), snapshot));
        return snapshot;
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

    public List<MarketDto.DividendEvent> dividendHistory(String market, String ticker) {
        String normalizedMarket = normalizeMarket(market);
        String normalizedTicker = ticker == null ? "" : ticker.trim().toUpperCase();
        if (!hasText(normalizedTicker)) return List.of();

        if ("US".equals(normalizedMarket)) {
            List<MarketDto.DividendEvent> fmp = dividendHistoryFmp(normalizedTicker);
            if (!fmp.isEmpty()) return fmp;
            List<MarketDto.DividendEvent> yahoo = dividendHistoryYahooFinance(normalizedTicker, normalizedTicker, "US", "USD");
            if (!yahoo.isEmpty()) return yahoo;
            return fallbackDividendHistory(normalizedMarket, normalizedTicker);
        }

        List<MarketDto.DividendEvent> naverEtf = dividendHistoryNaverEtf(normalizedTicker);
        if (!naverEtf.isEmpty()) return naverEtf;
        for (String yahooTicker : List.of(normalizedTicker + ".KS", normalizedTicker + ".KQ")) {
            List<MarketDto.DividendEvent> yahoo = dividendHistoryYahooFinance(yahooTicker, normalizedTicker, "KR", "KRW");
            if (!yahoo.isEmpty()) return yahoo;
        }
        return List.of();
    }

    private List<MarketDto.SearchResult> searchExternal(String market, String keyword) {
        if ("KR".equals(market)) {
            List<MarketDto.SearchResult> krx = searchKrxOpenApi(keyword);
            if (!krx.isEmpty()) return krx.stream().map(this::freshenKrSearchResult).toList();
            return searchNaverFinance(keyword);
        }

        List<MarketDto.SearchResult> fmp = searchFmp(keyword);
        if (!fmp.isEmpty()) return fmp;
        List<MarketDto.SearchResult> finnhub = searchFinnhub(keyword);
        if (!finnhub.isEmpty()) return finnhub;
        return searchYahooFinance(keyword);
    }

    private List<MarketDto.SearchResult> topEtfsExternal(String market, int limit) {
        List<MarketDto.SearchResult> results = new ArrayList<>();
        if ("ALL".equals(market) || "KR".equals(market)) {
            results.addAll(topKrxEtfs(limit));
        }

        if ("ALL".equals(market) && results.isEmpty()) {
            return List.of();
        }

        if ("ALL".equals(market) && results.size() < limit) {
            results.addAll(fallbackTopEtfs("US", limit - results.size()));
        }

        if ("US".equals(market)) {
            results.addAll(fallbackTopEtfs("US", limit));
        }

        return results.stream()
                .filter(this::isEtfLike)
                .limit(limit)
                .toList();
    }

    private List<MarketDto.SearchResult> enrichSearchPrices(List<MarketDto.SearchResult> results) {
        return results.stream()
                .map(this::enrichSearchPrice)
                .toList();
    }

    private MarketDto.SearchResult enrichSearchPrice(MarketDto.SearchResult result) {
        if (result == null || !hasText(result.ticker())) return result;
        if (result.currentPrice() != null && result.currentPrice().compareTo(BigDecimal.ZERO) > 0) return result;

        try {
            MarketDto.Quote quote = quote(result.market(), result.ticker());
            if (!isUsableQuote(quote)) return result;
            return new MarketDto.SearchResult(
                    result.market(),
                    result.ticker(),
                    firstNonBlank(result.name(), quote.name(), result.ticker()),
                    firstNonBlank(result.currency(), quote.currency(), "KR".equals(result.market()) ? "KRW" : "USD"),
                    result.exchange(),
                    quote.currentPrice(),
                    quote.dividendYield() != null && quote.dividendYield().compareTo(BigDecimal.ZERO) > 0,
                    quote.source()
            );
        } catch (Exception ignored) {
            return result;
        }
    }

    private List<MarketDto.SearchResult> fallbackTopEtfs(String market, int limit) {
        return fallbackUniverse().stream()
                .filter(this::isEtfLike)
                .filter(item -> "ALL".equals(market) || item.market().equals(market))
                .sorted(Comparator.comparingInt(this::fallbackTopRank))
                .limit(limit)
                .map(item -> new MarketDto.SearchResult(
                        item.market(),
                        item.ticker(),
                        item.name(),
                        item.currency(),
                        item.exchange(),
                        item.currentPrice(),
                        item.dividendAvailable(),
                        "fallback-daily-top"
                ))
                .toList();
    }

    private int fallbackTopRank(MarketDto.SearchResult item) {
        List<String> order = List.of(
                "069500", "102110", "360750", "133690", "458730", "379800", "122630", "305080", "423160", "476550",
                "SPY", "QQQ", "VOO", "VTI", "SCHD", "JEPI", "JEPQ", "TLT", "BND", "TQQQ"
        );
        int index = order.indexOf(item.ticker().toUpperCase());
        return index >= 0 ? index : 999;
    }

    private MarketDto.Quote quoteExternal(String market, String ticker) {
        if ("KR".equals(market)) {
            if (hasKisCredentials()) {
                MarketDto.Quote kis = quoteKis(ticker);
                if (isUsableQuote(kis)) return kis;
            }
            MarketDto.Quote naver = quoteNaverFinance(ticker);
            if (isUsableQuote(naver)) return enrichWithOpenDart(naver);
            MarketDto.Quote krx = quoteKrxOpenApi(ticker);
            if (isUsableQuote(krx)) return enrichWithOpenDart(krx);
            return null;
        }

        MarketDto.Quote fmp = quoteFmp(ticker);
        if (isUsableQuote(fmp)) return fmp;
        if (hasText(finnhubApiKey)) {
            MarketDto.Quote finnhub = quoteFinnhub(ticker);
            if (isUsableQuote(finnhub)) return finnhub;
        }
        MarketDto.Quote yahoo = quoteYahooFinance(ticker);
        if (isUsableQuote(yahoo)) return yahoo;
        return null;
    }

    private List<MarketDto.SearchResult> searchFmp(String keyword) {
        if (!hasText(fmpApiKey)) return List.of();
        try {
            JsonNode rows = getJson(fmpBaseUrl + "/search-name?query={keyword}&apikey={apiKey}", keyword, fmpApiKey);
            if (!rows.isArray() || rows.isEmpty()) {
                rows = getJson(fmpBaseUrl + "/search-symbol?query={keyword}&apikey={apiKey}", keyword, fmpApiKey);
            }
            if (!rows.isArray()) return List.of();

            List<MarketDto.SearchResult> results = new ArrayList<>();
            for (JsonNode row : rows) {
                if (results.size() >= 20) break;
                String symbol = text(row, "symbol").toUpperCase();
                if (!hasText(symbol) || symbol.contains(".")) continue;
                String name = firstNonBlank(text(row, "name"), text(row, "companyName"), symbol);
                String currency = firstNonBlank(text(row, "currency"), "USD");
                String exchange = firstNonBlank(text(row, "exchangeShortName"), text(row, "stockExchange"), "US");
                MarketDto.Quote quote = quoteFmp(symbol);
                BigDecimal price = quote != null ? quote.currentPrice() : BigDecimal.ZERO;
                boolean dividendAvailable = quote != null && quote.dividendYield() != null && quote.dividendYield().compareTo(BigDecimal.ZERO) > 0;
                results.add(new MarketDto.SearchResult("US", symbol, name, currency, exchange, price, dividendAvailable, "fmp"));
            }
            return results;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<MarketDto.EtfSearchResult> searchKoreanEtfs(String keyword, int limit) {
        Map<String, MarketDto.EtfSearchResult> merged = new LinkedHashMap<>();
        if (hasText(krxApiKey)) {
            try {
                for (JsonNode row : fetchKrxRows("/etp/etf_bydd_trd")) {
                    String ticker = firstNonBlank(text(row, "ISU_SRT_CD"), text(row, "ISU_CD")).toUpperCase();
                    String name = firstNonBlank(text(row, "ISU_ABBRV"), text(row, "ISU_NM"), ticker);
                    if (!matchesEtfKeyword(ticker, name, keyword)) continue;
                    merged.put(ticker, new MarketDto.EtfSearchResult(
                            "KR", ticker, name, "KRW", "KRX ETF",
                            decimal(text(row, "TDD_CLSPRC")), decimal(text(row, "FLUC_RT")),
                            decimal(text(row, "NAV")), decimal(text(row, "MKTCAP")),
                            false, "krx-openapi-etf"
                    ));
                }
            } catch (Exception ignored) {
                // Naver ETF universe below remains available when KRX is unavailable.
            }
        }

        for (MarketDto.EtfSearchResult naver : naverEtfUniverse()) {
            if (!matchesEtfKeyword(naver.ticker(), naver.name(), keyword)) continue;
            merged.merge(naver.ticker(), naver, this::mergeEtfSearchResult);
        }

        if (merged.isEmpty()) {
            fallbackUniverse().stream()
                    .filter(item -> "KR".equals(item.market()) && isEtfLike(item))
                    .filter(item -> matchesEtfKeyword(item.ticker(), item.name(), keyword))
                    .map(this::toEtfSearchResult)
                    .forEach(item -> merged.putIfAbsent(item.ticker(), item));
        }
        return merged.values().stream().limit(limit).toList();
    }

    private List<MarketDto.EtfSearchResult> searchUsEtfs(String keyword, int limit) {
        List<MarketDto.EtfSearchResult> universe = hasText(fmpApiKey)
                ? fmpEtfUniverse()
                : List.of();
        List<MarketDto.EtfSearchResult> matched = universe.stream()
                .filter(item -> matchesEtfKeyword(item.ticker(), item.name(), keyword))
                .limit(limit)
                .map(this::enrichUsEtfSearchPrice)
                .toList();
        if (!matched.isEmpty()) return matched;

        List<MarketDto.EtfSearchResult> yahoo = searchYahooEtfs(keyword, limit);
        if (!yahoo.isEmpty()) return yahoo;

        return fallbackUniverse().stream()
                .filter(item -> "US".equals(item.market()) && isEtfLike(item))
                .filter(item -> matchesEtfKeyword(item.ticker(), item.name(), keyword))
                .limit(limit)
                .map(this::toEtfSearchResult)
                .toList();
    }

    private List<MarketDto.EtfSearchResult> naverEtfUniverse() {
        return cachedEtfUniverse("KR:NAVER", () -> {
            try {
                JsonNode rows = getNaverJson("https://finance.naver.com/api/sise/etfItemList.nhn")
                        .path("result")
                        .path("etfItemList");
                if (!rows.isArray()) return List.of();
                List<MarketDto.EtfSearchResult> result = new ArrayList<>();
                for (JsonNode row : rows) {
                    String ticker = text(row, "itemcode").toUpperCase();
                    String name = firstNonBlank(text(row, "itemname"), ticker);
                    if (!hasText(ticker) || !hasText(name)) continue;
                    BigDecimal aum = decimal(text(row, "marketSum"));
                    if (aum.compareTo(BigDecimal.ZERO) > 0) aum = aum.multiply(BigDecimal.valueOf(100_000_000L));
                    result.add(new MarketDto.EtfSearchResult(
                            "KR", ticker, name, "KRW", "KRX ETF",
                            decimal(text(row, "nowVal")),
                            decimal(firstNonBlank(text(row, "changeRate"), text(row, "fluctuationRate"))),
                            decimal(text(row, "nav")), aum, false, "naver-etf-list"
                    ));
                }
                return result;
            } catch (Exception ignored) {
                return List.of();
            }
        });
    }

    private List<MarketDto.EtfSearchResult> fmpEtfUniverse() {
        return cachedEtfUniverse("US:FMP", () -> {
            if (!hasText(fmpApiKey)) return List.of();
            try {
                JsonNode rows = getJson(fmpBaseUrl + "/etf-list?apikey={apiKey}", fmpApiKey);
                if (!rows.isArray()) return List.of();
                List<MarketDto.EtfSearchResult> result = new ArrayList<>();
                for (JsonNode row : rows) {
                    String ticker = text(row, "symbol").toUpperCase();
                    if (!hasText(ticker) || ticker.contains(".")) continue;
                    String name = firstNonBlank(text(row, "name"), ticker);
                    String exchange = firstNonBlank(text(row, "exchangeShortName"), text(row, "exchange"), "US");
                    result.add(new MarketDto.EtfSearchResult(
                            "US", ticker, name, firstNonBlank(text(row, "currency"), "USD"), exchange,
                            decimal(firstNonBlank(text(row, "price"), text(row, "currentPrice"))),
                            decimal(firstNonBlank(text(row, "changesPercentage"), text(row, "changeRate"))),
                            BigDecimal.ZERO, BigDecimal.ZERO, false, "fmp-etf-list"
                    ));
                }
                return result;
            } catch (Exception ignored) {
                return List.of();
            }
        });
    }

    private List<MarketDto.EtfSearchResult> searchYahooEtfs(String keyword, int limit) {
        if (!hasText(keyword)) return List.of();
        try {
            JsonNode response = restClientBuilder.build()
                    .get()
                    .uri("https://query2.finance.yahoo.com/v1/finance/search?q={keyword}&quotesCount=50&newsCount=0", keyword)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode rows = response.path("quotes");
            if (!rows.isArray()) return List.of();

            List<MarketDto.EtfSearchResult> result = new ArrayList<>();
            for (JsonNode row : rows) {
                if (result.size() >= limit) break;
                String type = firstNonBlank(text(row, "quoteType"), text(row, "typeDisp")).toUpperCase();
                if (!List.of("ETF", "MUTUALFUND").contains(type)) continue;
                String ticker = text(row, "symbol").toUpperCase();
                if (!hasText(ticker) || ticker.contains(".")) continue;
                MarketDto.Quote quote = quoteYahooFinance(ticker);
                result.add(new MarketDto.EtfSearchResult(
                        "US", ticker,
                        firstNonBlank(text(row, "longname"), text(row, "shortname"), ticker),
                        quote != null ? quote.currency() : firstNonBlank(text(row, "currency"), "USD"),
                        firstNonBlank(text(row, "exchDisp"), text(row, "exchange"), "US"),
                        quote != null ? quote.currentPrice() : BigDecimal.ZERO,
                        quote != null ? quote.changeRate() : BigDecimal.ZERO,
                        BigDecimal.ZERO, BigDecimal.ZERO, false, "yahoo-finance-etf-search"
                ));
            }
            return result;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private MarketDto.EtfSearchResult enrichUsEtfSearchPrice(MarketDto.EtfSearchResult item) {
        if (item.currentPrice() != null && item.currentPrice().compareTo(BigDecimal.ZERO) > 0) return item;
        MarketDto.Quote quote = quoteFmpSearch(item.ticker());
        if (!isUsableQuote(quote)) quote = quoteYahooFinance(item.ticker());
        if (!isUsableQuote(quote)) return item;
        return new MarketDto.EtfSearchResult(
                item.market(), item.ticker(), firstNonBlank(item.name(), quote.name()),
                firstNonBlank(item.currency(), quote.currency(), "USD"), item.exchange(),
                quote.currentPrice(), quote.changeRate(), item.nav(), item.aum(),
                item.dividendAvailable(), quote.source()
        );
    }

    private MarketDto.Quote quoteFmpSearch(String ticker) {
        if (!hasText(fmpApiKey)) return null;
        try {
            JsonNode row = firstArrayItem(getJson(fmpBaseUrl + "/quote?symbol={ticker}&apikey={apiKey}", ticker, fmpApiKey));
            if (row == null) return null;
            BigDecimal current = decimal(firstNonBlank(text(row, "price"), text(row, "currentPrice")));
            BigDecimal previous = decimal(firstNonBlank(text(row, "previousClose"), text(row, "previousClosePrice")));
            if (previous.compareTo(BigDecimal.ZERO) <= 0) previous = current;
            return new MarketDto.Quote(
                    "US", ticker, firstNonBlank(text(row, "name"), ticker), firstNonBlank(text(row, "currency"), "USD"),
                    current, previous, decimal(text(row, "changesPercentage")),
                    compactCurrency(decimal(text(row, "marketCap")), firstNonBlank(text(row, "currency"), "USD")),
                    decimal(text(row, "pe")), BigDecimal.ZERO, BigDecimal.ZERO, "fmp"
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<MarketDto.EtfSearchResult> cachedEtfUniverse(String key, EtfUniverseLoader loader) {
        CachedEtfUniverse cached = etfUniverseCache.get(key);
        if (cached != null && Duration.between(cached.cachedAt(), Instant.now()).compareTo(ETF_UNIVERSE_CACHE_TTL) < 0) {
            return cached.items();
        }
        List<MarketDto.EtfSearchResult> items = loader.load();
        if (!items.isEmpty()) etfUniverseCache.put(key, new CachedEtfUniverse(Instant.now(), items));
        return items;
    }

    private MarketDto.EtfSearchResult mergeEtfSearchResult(MarketDto.EtfSearchResult primary, MarketDto.EtfSearchResult secondary) {
        return new MarketDto.EtfSearchResult(
                primary.market(), primary.ticker(), firstNonBlank(primary.name(), secondary.name()),
                firstNonBlank(primary.currency(), secondary.currency()), firstNonBlank(primary.exchange(), secondary.exchange()),
                positiveOr(primary.currentPrice(), secondary.currentPrice()),
                nonZeroOr(primary.changeRate(), secondary.changeRate()),
                positiveOr(primary.nav(), secondary.nav()), positiveOr(primary.aum(), secondary.aum()),
                Boolean.TRUE.equals(primary.dividendAvailable()) || Boolean.TRUE.equals(secondary.dividendAvailable()),
                firstNonBlank(primary.source(), secondary.source())
        );
    }

    private MarketDto.EtfSearchResult toEtfSearchResult(MarketDto.SearchResult item) {
        return new MarketDto.EtfSearchResult(
                item.market(), item.ticker(), item.name(), item.currency(), item.exchange(), item.currentPrice(),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, item.dividendAvailable(), item.source()
        );
    }

    private MarketDto.Quote quoteFmp(String ticker) {
        if (!hasText(fmpApiKey)) return null;
        try {
            JsonNode quote = firstArrayItem(getJson(fmpBaseUrl + "/quote?symbol={ticker}&apikey={apiKey}", ticker, fmpApiKey));
            if (quote == null) return null;

            JsonNode profile = firstArrayItem(getJson(fmpBaseUrl + "/profile?symbol={ticker}&apikey={apiKey}", ticker, fmpApiKey));
            String name = firstNonBlank(text(quote, "name"), text(profile, "companyName"), ticker);
            String currency = firstNonBlank(text(profile, "currency"), text(quote, "currency"), "USD");
            BigDecimal current = decimal(firstNonBlank(text(quote, "price"), text(quote, "currentPrice")));
            BigDecimal previous = decimal(firstNonBlank(text(quote, "previousClose"), text(quote, "previousClosePrice")));
            if (previous.compareTo(BigDecimal.ZERO) == 0) previous = current;
            BigDecimal changeRate = decimal(text(quote, "changesPercentage"));
            if (changeRate.compareTo(BigDecimal.ZERO) == 0) changeRate = percentChange(current, previous);
            BigDecimal lastDividend = decimal(text(profile, "lastDiv"));
            BigDecimal dividendYield = current.compareTo(BigDecimal.ZERO) > 0
                    ? lastDividend.divide(current, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                    : BigDecimal.ZERO;

            return new MarketDto.Quote(
                    "US",
                    ticker,
                    name,
                    currency,
                    current,
                    previous,
                    changeRate,
                    compactCurrency(decimal(firstNonBlank(text(quote, "marketCap"), text(profile, "mktCap"))), currency),
                    decimal(text(quote, "pe")),
                    BigDecimal.ZERO,
                    dividendYield,
                    "fmp"
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<MarketDto.DividendEvent> dividendHistoryFmp(String ticker) {
        if (!hasText(fmpApiKey)) return List.of();

        List<MarketDto.DividendEvent> stable = parseFmpDividendRows(
                safeJson(fmpBaseUrl + "/dividends?symbol={ticker}&apikey={apiKey}", ticker, fmpApiKey),
                ticker,
                "fmp-dividends"
        );
        if (!stable.isEmpty()) return stable;

        String legacyBaseUrl = fmpBaseUrl.replace("/stable", "/api/v3");
        return parseFmpDividendRows(
                safeJson(legacyBaseUrl + "/historical-price-full/stock_dividend/{ticker}?apikey={apiKey}", ticker, fmpApiKey),
                ticker,
                "fmp-stock-dividend"
        );
    }

    private List<MarketDto.DividendEvent> parseFmpDividendRows(JsonNode response, String ticker, String source) {
        JsonNode rows = firstArrayField(response, "historical", "dividends", "data", "results");
        if (rows == null || !rows.isArray()) return List.of();

        List<MarketDto.DividendEvent> events = new ArrayList<>();
        for (JsonNode row : rows) {
            BigDecimal amount = decimalAmount(firstNonBlank(
                    text(row, "adjDividend"),
                    text(row, "dividend"),
                    text(row, "amount")
            ));
            if (amount.compareTo(BigDecimal.ZERO) <= 0) continue;

            LocalDate exDividendDate = parseDate(firstNonBlank(text(row, "date"), text(row, "exDividendDate")));
            LocalDate paymentDate = parseDate(text(row, "paymentDate"));
            if (exDividendDate == null && paymentDate == null) continue;

            events.add(new MarketDto.DividendEvent(
                    "US",
                    ticker,
                    "USD",
                    exDividendDate,
                    paymentDate,
                    amount,
                    source
            ));
        }
        return events.stream()
                .sorted((left, right) -> eventDate(right).compareTo(eventDate(left)))
                .limit(48)
                .toList();
    }

    private List<MarketDto.DividendEvent> dividendHistoryYahooFinance(
            String requestTicker,
            String outputTicker,
            String market,
            String currency
    ) {
        try {
            JsonNode response = restClientBuilder.build()
                    .get()
                    .uri("https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=3y&interval=1mo&events=div", requestTicker)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode dividends = firstArrayItem(response.path("chart").path("result"))
                    .path("events")
                    .path("dividends");
            if (!dividends.isObject()) return List.of();

            List<MarketDto.DividendEvent> events = new ArrayList<>();
            dividends.fields().forEachRemaining(entry -> {
                JsonNode row = entry.getValue();
                BigDecimal amount = decimalAmount(text(row, "amount"));
                LocalDate exDividendDate = epochDate(row.path("date").asLong(0));
                if (amount.compareTo(BigDecimal.ZERO) <= 0 || exDividendDate == null) return;
                events.add(new MarketDto.DividendEvent(
                        market,
                        outputTicker,
                        currency,
                        exDividendDate,
                        null,
                        amount,
                        "yahoo-finance-dividends"
                ));
            });
            return events.stream()
                    .sorted((left, right) -> eventDate(right).compareTo(eventDate(left)))
                    .limit(48)
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private MarketDto.EtfProfile koreanEtfProfile(String ticker, MarketDto.Quote quote) {
        MarketDto.EtfSearchResult row = naverEtfUniverse().stream()
                .filter(item -> item.ticker().equalsIgnoreCase(ticker))
                .findFirst()
                .orElse(null);
        if (row == null && hasText(krxApiKey)) {
            row = searchKoreanEtfs(ticker, 5).stream()
                    .filter(item -> item.ticker().equalsIgnoreCase(ticker))
                    .findFirst()
                    .orElse(null);
        }
        if (row == null) return null;

        JsonNode base = safeNaverStockJson("https://stock.naver.com/api/domestic/detail/{ticker}/ETFBase", ticker);
        JsonNode dividend = safeNaverStockJson("https://stock.naver.com/api/domestic/detail/{ticker}/ETFDividend", ticker);
        JsonNode componentSample = safeNaverStockJson(
                "https://stock.naver.com/api/domestic/detail/{ticker}/ETFComponent?startIdx=0&pageSize=1",
                ticker
        );
        String name = firstNonBlank(text(base, "itemName"), row.name(), quote != null ? quote.name() : "", ticker);
        BigDecimal aum = nullablePositive(decimal(text(base, "totalNetAssets")));
        if (aum == null) aum = nullablePositive(row.aum());
        return new MarketDto.EtfProfile(
                "KR", ticker, name, "KRW", row.exchange(),
                firstNonBlank(text(base, "issueName"), inferKoreanEtfProvider(name)),
                firstNonBlank(text(base, "etfType"), inferEtfAssetClass(name)),
                firstNonBlank(text(base, "etfBaseIdx"), inferEtfIndexName(name)),
                firstNonBlank(stripHtml(text(base, "etfDesc")), koreanEtfDescription(name)),
                basicDate(text(base, "listedDate")),
                nullablePositive(decimal(firstNonBlank(text(base, "nav"), row.nav() == null ? "" : row.nav().toPlainString()))),
                aum,
                normalizeRatio(decimalAmount(text(base, "fundPay"))),
                nullableNonZero(decimal(text(base, "performanceMarketMonth"))),
                nullableNonZero(decimal(text(base, "performanceMarket3Month"))),
                nullableNonZero(decimal(text(base, "performanceMarketYear"))),
                nullableNonZero(decimal(text(base, "performanceMarket3Year"))),
                nullableNonZero(decimal(text(base, "performanceMarket5Year"))),
                nullablePositive(decimal(text(dividend, "dividendYieldTtm"))),
                nullablePositive(decimalAmount(text(dividend, "dividendPerShareTtm"))),
                integerOrNull(text(firstArrayItem(componentSample), "componentCount")),
                base == null ? row.source() : "naver-stock-etf-base"
        );
    }

    private MarketDto.EtfProfile fmpEtfProfile(String ticker, MarketDto.Quote quote) {
        if (!hasText(fmpApiKey)) return null;
        try {
            JsonNode row = firstArrayItem(getJson(fmpBaseUrl + "/etf/info?symbol={ticker}&apikey={apiKey}", ticker, fmpApiKey));
            if (row == null) return null;
            String name = firstNonBlank(text(row, "name"), text(row, "fundName"), quote != null ? quote.name() : "", ticker);
            return new MarketDto.EtfProfile(
                    "US", ticker, name,
                    firstNonBlank(text(row, "currency"), quote != null ? quote.currency() : "", "USD"),
                    firstNonBlank(text(row, "exchange"), text(row, "exchangeShortName"), "US"),
                    firstNonBlank(text(row, "fundFamily"), text(row, "issuer"), inferUsEtfProvider(name)),
                    firstNonBlank(text(row, "assetClass"), text(row, "category"), inferEtfAssetClass(name)),
                    firstNonBlank(text(row, "indexName"), text(row, "benchmark")),
                    firstNonBlank(text(row, "description"), text(row, "investmentStrategy")),
                    firstNonBlank(text(row, "inceptionDate"), text(row, "ipoDate")),
                    nullablePositive(decimal(firstNonBlank(text(row, "nav"), text(row, "netAssetValue")))),
                    nullablePositive(decimal(firstNonBlank(text(row, "aum"), text(row, "assetsUnderManagement"), text(row, "totalAssets")))),
                    normalizeRatio(decimalAmount(firstNonBlank(text(row, "expenseRatio"), text(row, "netExpenseRatio")))),
                    nullableNonZero(decimal(firstNonBlank(text(row, "return1M"), text(row, "returnOneMonth")))),
                    nullableNonZero(decimal(firstNonBlank(text(row, "return3M"), text(row, "returnThreeMonth")))),
                    nullableNonZero(decimal(firstNonBlank(text(row, "return1Y"), text(row, "returnOneYear")))),
                    nullableNonZero(decimal(firstNonBlank(text(row, "return3Y"), text(row, "returnThreeYear")))),
                    nullableNonZero(decimal(firstNonBlank(text(row, "return5Y"), text(row, "returnFiveYear")))),
                    nullablePositive(decimal(firstNonBlank(text(row, "dividendYield"), text(row, "yield")))),
                    nullablePositive(decimalAmount(firstNonBlank(text(row, "lastDividend"), text(row, "dividendPerShare")))),
                    integerOrNull(firstNonBlank(text(row, "holdingsCount"), text(row, "numberOfHoldings"))),
                    "fmp-etf-info"
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private MarketDto.EtfProfile fallbackEtfProfile(String market, String ticker, MarketDto.Quote quote) {
        String name = firstNonBlank(quote != null ? quote.name() : "", displayName(ticker), ticker);
        return new MarketDto.EtfProfile(
                market, ticker, name, "KR".equals(market) ? "KRW" : "USD",
                "KR".equals(market) ? "KRX ETF" : "US ETF",
                "KR".equals(market) ? inferKoreanEtfProvider(name) : inferUsEtfProvider(name),
                inferEtfAssetClass(name), inferEtfIndexName(name), "", "",
                null, null, null, null, null, null, null, null, null, null, null,
                quote != null ? quote.source() + "+profile-unavailable" : "profile-unavailable"
        );
    }

    private List<MarketDto.EtfHolding> fmpEtfHoldings(String ticker) {
        if (!hasText(fmpApiKey)) return List.of();
        try {
            JsonNode rows = getJson(fmpBaseUrl + "/etf/holdings?symbol={ticker}&apikey={apiKey}", ticker, fmpApiKey);
            if (!rows.isArray()) return List.of();
            List<MarketDto.EtfHolding> holdings = new ArrayList<>();
            for (JsonNode row : rows) {
                String holdingTicker = firstNonBlank(text(row, "asset"), text(row, "symbol"), text(row, "ticker"));
                String name = firstNonBlank(text(row, "name"), text(row, "assetName"), holdingTicker, "기타 자산");
                holdings.add(new MarketDto.EtfHolding(
                        holdingTicker, name,
                        nullablePositive(decimal(firstNonBlank(text(row, "weightPercentage"), text(row, "weight"), text(row, "weighting")))),
                        nullablePositive(decimal(firstNonBlank(text(row, "sharesNumber"), text(row, "shares")))),
                        nullablePositive(decimal(text(row, "marketValue"))),
                        "fmp-etf-holdings"
                ));
            }
            return holdings.stream()
                    .sorted(Comparator.comparing((MarketDto.EtfHolding item) -> item.weight() == null ? BigDecimal.ZERO : item.weight()).reversed())
                    .limit(100)
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<MarketDto.EtfHolding> koreanEtfHoldings(String ticker) {
        JsonNode rows = safeNaverStockJson(
                "https://stock.naver.com/api/domestic/detail/{ticker}/ETFComponent?startIdx=0&pageSize=100",
                ticker
        );
        if (rows != null && rows.isArray() && !rows.isEmpty()) {
            List<MarketDto.EtfHolding> holdings = new ArrayList<>();
            for (JsonNode row : rows) {
                String componentTicker = normalizeNaverComponentTicker(firstNonBlank(
                        text(row, "componentItemCode"), text(row, "componentReutersCode"), text(row, "componentIsinCode")
                ));
                holdings.add(new MarketDto.EtfHolding(
                        componentTicker,
                        firstNonBlank(text(row, "componentName"), componentTicker, "기타 자산"),
                        nullablePositive(decimal(text(row, "weight"))),
                        nullablePositive(decimal(text(row, "cuUnitQuantity"))),
                        nullablePositive(decimal(text(row, "evalAmount"))),
                        "naver-stock-etf-components"
                ));
            }
            return holdings.stream()
                    .sorted(Comparator.comparing((MarketDto.EtfHolding item) -> item.weight() == null ? BigDecimal.ZERO : item.weight()).reversed())
                    .limit(100)
                    .toList();
        }

        try {
            String json = runPython("etf_holdings", "KR", ticker);
            List<MarketDto.EtfHolding> holdings = objectMapper.readValue(json, new TypeReference<>() {});
            return holdings == null ? List.of() : holdings.stream().limit(100).toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<MarketDto.DividendEvent> dividendHistoryNaverEtf(String ticker) {
        JsonNode rows = safeNaverStockJson(
                "https://stock.naver.com/api/domestic/detail/{ticker}/ETFDividendHist?startIdx=0&pageSize=48",
                ticker
        );
        if (rows == null || !rows.isArray()) return List.of();

        List<MarketDto.DividendEvent> events = new ArrayList<>();
        for (JsonNode row : rows) {
            BigDecimal amount = nullablePositive(decimalAmount(text(row, "dividendAmount")));
            LocalDate exDividendDate = parseDate(text(row.path("id"), "exDividendAt"));
            if (amount == null || exDividendDate == null) continue;
            events.add(new MarketDto.DividendEvent(
                    "KR", ticker, "KRW", exDividendDate, null, amount, "naver-stock-etf-dividends"
            ));
        }
        return events.stream()
                .sorted((left, right) -> eventDate(right).compareTo(eventDate(left)))
                .limit(48)
                .toList();
    }

    private List<MarketDto.FinancialPeriod> fmpFinancials(String ticker) {
        if (!hasText(fmpApiKey)) return List.of();
        JsonNode income = safeJson(fmpBaseUrl + "/income-statement?symbol={ticker}&period=annual&limit=4&apikey={apiKey}", ticker, fmpApiKey);
        JsonNode balance = safeJson(fmpBaseUrl + "/balance-sheet-statement?symbol={ticker}&period=annual&limit=4&apikey={apiKey}", ticker, fmpApiKey);
        JsonNode cashFlow = safeJson(fmpBaseUrl + "/cash-flow-statement?symbol={ticker}&period=annual&limit=4&apikey={apiKey}", ticker, fmpApiKey);
        if (income == null || !income.isArray()) return List.of();

        List<MarketDto.FinancialPeriod> periods = new ArrayList<>();
        for (JsonNode row : income) {
            String fiscalYear = firstNonBlank(text(row, "fiscalYear"), yearFromDate(text(row, "date")));
            JsonNode balanceRow = findFinancialRow(balance, fiscalYear);
            JsonNode cashRow = findFinancialRow(cashFlow, fiscalYear);
            periods.add(new MarketDto.FinancialPeriod(
                    fiscalYear,
                    firstNonBlank(text(row, "period"), "FY"),
                    firstNonBlank(text(row, "reportedCurrency"), "USD"),
                    nullableNumber(row, "revenue"),
                    nullableNumber(row, "operatingIncome"),
                    nullableNumber(row, "netIncome"),
                    nullableNumber(balanceRow, "totalAssets"),
                    nullableNumber(balanceRow, "totalLiabilities"),
                    nullableNumber(balanceRow, "totalStockholdersEquity", "totalEquity"),
                    nullableNumber(cashRow, "operatingCashFlow", "netCashProvidedByOperatingActivities"),
                    "fmp-financial-statements"
            ));
        }
        return periods.stream().limit(4).toList();
    }

    private List<MarketDto.FinancialPeriod> openDartFinancials(String ticker) {
        OpenDartCorp corp = findOpenDartCorp(ticker);
        if (corp == null || !hasText(openDartApiKey)) return List.of();

        List<MarketDto.FinancialPeriod> periods = new ArrayList<>();
        int latestYear = LocalDate.now().getYear() - 1;
        for (int year = latestYear; year >= latestYear - 3; year--) {
            JsonNode response = openDartStatement(corp.corpCode(), year, "CFS");
            JsonNode rows = response == null ? null : response.path("list");
            if (rows == null || !rows.isArray() || rows.isEmpty()) {
                response = openDartStatement(corp.corpCode(), year, "OFS");
                rows = response == null ? null : response.path("list");
            }
            if (rows == null || !rows.isArray() || rows.isEmpty()) continue;
            periods.add(new MarketDto.FinancialPeriod(
                    String.valueOf(year), "FY", "KRW",
                    dartAccountAmount(rows, "매출액", "영업수익", "수익(매출액)"),
                    dartAccountAmount(rows, "영업이익", "영업이익(손실)"),
                    dartAccountAmount(rows, "당기순이익", "당기순이익(손실)", "연결당기순이익"),
                    dartAccountAmount(rows, "자산총계"),
                    dartAccountAmount(rows, "부채총계"),
                    dartAccountAmount(rows, "자본총계"),
                    dartAccountAmount(rows, "영업활동현금흐름", "영업활동으로 인한 현금흐름"),
                    "opendart-financial-statements"
            ));
        }
        return periods;
    }

    private JsonNode openDartStatement(String corpCode, int year, String financialStatementDivision) {
        return safeJson(
                openDartBaseUrl + "/fnlttSinglAcntAll.json?crtfc_key={apiKey}&corp_code={corpCode}&bsns_year={year}&reprt_code=11011&fs_div={fsDiv}",
                openDartApiKey, corpCode, year, financialStatementDivision
        );
    }

    private boolean isEtfTicker(String market, String ticker) {
        if ("KR".equals(market)) {
            return naverEtfUniverse().stream().anyMatch(item -> item.ticker().equalsIgnoreCase(ticker));
        }
        if (fmpEtfUniverse().stream().anyMatch(item -> item.ticker().equalsIgnoreCase(ticker))) return true;
        return searchYahooEtfs(ticker, 10).stream().anyMatch(item -> item.ticker().equalsIgnoreCase(ticker));
    }

    private List<MarketDto.DividendEvent> fallbackDividendHistory(String market, String ticker) {
        if (!"US".equals(market)) return List.of();
        DividendFallback fallback = fallbackDividend(ticker);
        if (fallback == null) return List.of();

        LocalDate latestPaymentDate = latestFallbackPaymentDate(fallback.intervalMonths(), fallback.baseMonth(), fallback.paymentDay());
        int count = Math.max(1, Math.min(12, 12 / fallback.intervalMonths()));
        List<MarketDto.DividendEvent> events = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            LocalDate paymentDate = latestPaymentDate.minusMonths((long) fallback.intervalMonths() * index);
            events.add(new MarketDto.DividendEvent(
                    "US",
                    ticker,
                    "USD",
                    paymentDate.minusDays(7),
                    paymentDate,
                    fallback.amountPerShare(),
                    fallback.source()
            ));
        }
        return events;
    }

    private LocalDate latestFallbackPaymentDate(int intervalMonths, int baseMonth, int paymentDay) {
        LocalDate today = LocalDate.now();
        LocalDate candidate = YearMonth.from(today).atDay(Math.min(paymentDay, YearMonth.from(today).lengthOfMonth()));
        while (candidate.isAfter(today) || Math.floorMod(candidate.getMonthValue() - baseMonth, intervalMonths) != 0) {
            YearMonth previous = YearMonth.from(candidate.minusMonths(1));
            candidate = previous.atDay(Math.min(paymentDay, previous.lengthOfMonth()));
        }
        return candidate;
    }

    private DividendFallback fallbackDividend(String ticker) {
        return switch (ticker) {
            case "JEPI" -> monthly("0.360000");
            case "JEPQ" -> monthly("0.420000");
            case "QYLD" -> monthly("0.180000");
            case "XYLD" -> monthly("0.310000");
            case "RYLD" -> monthly("0.170000");
            case "DIVO" -> monthly("0.160000");
            case "SPYI" -> monthly("0.500000");
            case "QQQI" -> monthly("0.620000");
            case "NVDY" -> monthly("0.950000");
            case "TSLY" -> monthly("0.620000");
            case "CONY" -> monthly("1.100000");
            case "MSTY" -> monthly("1.850000");
            case "YMAX" -> monthly("0.180000");
            case "YMAG" -> monthly("0.160000");
            case "FEPI" -> monthly("1.050000");
            case "AIPI" -> monthly("1.350000");
            case "O" -> monthly("0.270000");
            case "TLT" -> monthly("0.310000");
            case "IEF" -> monthly("0.250000");
            case "SHY" -> monthly("0.290000");
            case "BND" -> monthly("0.220000");
            case "AGG" -> monthly("0.300000");
            case "HYG" -> monthly("0.380000");
            case "LQD" -> monthly("0.390000");
            case "BIL" -> monthly("0.320000");
            case "SGOV" -> monthly("0.430000");
            case "USFR" -> monthly("0.230000");
            case "SCHD" -> quarterly("0.610000");
            case "VOO", "IVV" -> quarterly("1.780000");
            case "SPY" -> quarterly("1.760000");
            case "VTI" -> quarterly("0.910000");
            case "QQQ" -> quarterly("0.750000");
            case "QQQM" -> quarterly("0.320000");
            case "VYM" -> quarterly("0.720000");
            case "HDV" -> quarterly("0.850000");
            case "DGRO" -> quarterly("0.340000");
            case "DGRW" -> monthly("0.100000");
            case "NOBL" -> quarterly("0.490000");
            case "SDY" -> quarterly("0.780000");
            case "SPLG" -> quarterly("0.220000");
            case "VIG" -> quarterly("0.770000");
            case "VUG" -> quarterly("0.460000");
            case "IWM" -> quarterly("0.740000");
            case "VNQ" -> quarterly("0.950000");
            case "EFA" -> quarterly("0.750000");
            case "EEM" -> quarterly("0.450000");
            default -> null;
        };
    }

    private DividendFallback monthly(String amount) {
        return new DividendFallback(decimalAmount(amount), 1, 1, 15, "local-etf-dividend-estimate");
    }

    private DividendFallback quarterly(String amount) {
        return new DividendFallback(decimalAmount(amount), 3, 3, 15, "local-etf-dividend-estimate");
    }

    private List<MarketDto.SearchResult> searchKrxOpenApi(String keyword) {
        if (!hasText(krxApiKey)) return List.of();
        try {
            Map<String, MarketDto.SearchResult> byTicker = new LinkedHashMap<>();
            for (JsonNode row : fetchKrxRows("/sto/stk_bydd_trd")) {
                MarketDto.SearchResult result = toKrxSearchResult(row, keyword, false);
                if (result != null) byTicker.putIfAbsent(result.ticker(), result);
            }
            for (JsonNode row : fetchKrxRows("/etp/etf_bydd_trd")) {
                MarketDto.SearchResult result = toKrxSearchResult(row, keyword, true);
                if (result != null) byTicker.putIfAbsent(result.ticker(), result);
            }
            return byTicker.values().stream().limit(40).toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private MarketDto.Quote quoteKrxOpenApi(String ticker) {
        if (!hasText(krxApiKey)) return null;
        try {
            for (String path : List.of("/sto/stk_bydd_trd", "/etp/etf_bydd_trd")) {
                boolean etf = path.contains("/etp/");
                for (JsonNode row : fetchKrxRows(path)) {
                    String rowTicker = firstNonBlank(text(row, "ISU_SRT_CD"), text(row, "ISU_CD")).toUpperCase();
                    if (!ticker.equalsIgnoreCase(rowTicker)) continue;

                    BigDecimal current = decimal(text(row, "TDD_CLSPRC"));
                    BigDecimal changePrice = decimal(text(row, "CMPPREVDD_PRC"));
                    BigDecimal previous = current.subtract(changePrice);
                    if (previous.compareTo(BigDecimal.ZERO) <= 0) previous = current;
                    BigDecimal changeRate = decimal(text(row, "FLUC_RT"));
                    String name = firstNonBlank(text(row, "ISU_ABBRV"), text(row, "ISU_NM"), ticker);

                    return new MarketDto.Quote(
                            "KR",
                            ticker,
                            name,
                            "KRW",
                            current,
                            previous,
                            changeRate,
                            formatKrwMarketCap(decimal(text(row, "MKTCAP"))),
                            BigDecimal.ZERO,
                            BigDecimal.ZERO,
                            defaultDividendYield(ticker),
                            etf ? "krx-openapi-etf" : "krx-openapi"
                    );
                }
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private List<JsonNode> fetchKrxRows(String path) {
        LocalDate date = latestKrxBusinessDay();
        for (int attempt = 0; attempt < 8; attempt++) {
            if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                date = date.minusDays(1);
                continue;
            }
            JsonNode response = restClientBuilder.build()
                    .get()
                    .uri(krxBaseUrl + path + "?basDd={baseDate}", date.format(KRX_DATE_FORMAT))
                    .header("AUTH_KEY", krxApiKey)
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode rows = firstArrayField(response, "OutBlock_1", "output", "list");
            if (rows != null && rows.isArray() && !rows.isEmpty()) {
                List<JsonNode> result = new ArrayList<>();
                rows.forEach(result::add);
                return result;
            }
            date = date.minusDays(1);
        }
        return List.of();
    }

    private MarketDto.SearchResult toKrxSearchResult(JsonNode row, String keyword, boolean etf) {
        String ticker = firstNonBlank(text(row, "ISU_SRT_CD"), text(row, "ISU_CD")).toUpperCase();
        String name = firstNonBlank(text(row, "ISU_ABBRV"), text(row, "ISU_NM"), ticker);
        if (!hasText(ticker) || !matchesKeyword(ticker, name, keyword)) return null;
        String exchange = etf ? "KRX ETF" : firstNonBlank(text(row, "MKT_NM"), "KRX");
        return new MarketDto.SearchResult("KR", ticker, name, "KRW", exchange, decimal(text(row, "TDD_CLSPRC")), false, etf ? "krx-openapi-etf" : "krx-openapi");
    }

    private List<MarketDto.SearchResult> topKrxEtfs(int limit) {
        if (!hasText(krxApiKey)) return List.of();
        try {
            return fetchKrxRows("/etp/etf_bydd_trd").stream()
                    .sorted(Comparator.comparing(this::krxTradeValue).reversed())
                    .map(this::toKrxTopEtfResult)
                    .filter(item -> item != null && item.currentPrice() != null && item.currentPrice().compareTo(BigDecimal.ZERO) > 0)
                    .limit(limit)
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private MarketDto.SearchResult toKrxTopEtfResult(JsonNode row) {
        String ticker = firstNonBlank(text(row, "ISU_SRT_CD"), text(row, "ISU_CD")).toUpperCase();
        String name = firstNonBlank(text(row, "ISU_ABBRV"), text(row, "ISU_NM"), ticker);
        if (!hasText(ticker) || !hasText(name)) return null;
        return new MarketDto.SearchResult(
                "KR",
                ticker,
                name,
                "KRW",
                "KRX ETF",
                decimal(text(row, "TDD_CLSPRC")),
                false,
                "krx-openapi-etf-top-trade-value"
        );
    }

    private BigDecimal krxTradeValue(JsonNode row) {
        BigDecimal tradeValue = decimal(firstNonBlank(
                text(row, "ACC_TRDVAL"),
                text(row, "ACC_TRD_VAL"),
                text(row, "TDD_TRD_VAL")
        ));
        if (tradeValue.compareTo(BigDecimal.ZERO) > 0) return tradeValue;

        BigDecimal volume = decimal(firstNonBlank(
                text(row, "ACC_TRDVOL"),
                text(row, "ACC_TRD_VOL"),
                text(row, "TDD_TRD_VOL")
        ));
        return decimal(text(row, "TDD_CLSPRC")).multiply(volume);
    }

    private List<MarketDto.SearchResult> searchNaverFinance(String keyword) {
        if (!hasText(keyword)) return List.of();
        try {
            JsonNode items = getNaverJson("https://ac.stock.naver.com/ac?q={keyword}&target=stock,ipo,index,marketindicator", keyword)
                    .path("items");
            if (!items.isArray()) return List.of();

            List<MarketDto.SearchResult> results = new ArrayList<>();
            for (JsonNode item : items) {
                if (results.size() >= 30) break;
                String typeCode = text(item, "typeCode").toUpperCase();
                String ticker = firstNonBlank(text(item, "code"), text(item, "reutersCode")).toUpperCase();
                String name = text(item, "name");
                String typeName = text(item, "typeName");
                String category = text(item, "category");
                if (!isAllowedNaverInstrument(category, typeCode, typeName, name)) continue;
                if (!hasText(ticker) || !hasText(name)) continue;

                MarketDto.Quote quote = quoteNaverFinance(ticker);
                BigDecimal price = isUsableQuote(quote) ? quote.currentPrice() : BigDecimal.ZERO;
                boolean dividendAvailable = quote != null
                        && quote.dividendYield() != null
                        && quote.dividendYield().compareTo(BigDecimal.ZERO) > 0;
                results.add(new MarketDto.SearchResult(
                        "KR",
                        ticker,
                        name,
                        "KRW",
                        firstNonBlank(typeName, "KRX"),
                        price,
                        dividendAvailable,
                        isUsableQuote(quote) ? quote.source() : "naver-finance-search"
                ));
            }
            return results;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private boolean isAllowedNaverInstrument(String category, String typeCode, String typeName, String name) {
        boolean stockCategory = "stock".equalsIgnoreCase(category);
        boolean listedEquity = stockCategory && List.of("KOSPI", "KOSDAQ", "KONEX").contains(typeCode);
        return listedEquity || isEtfName(typeCode, typeName, name);
    }

    private MarketDto.Quote enrichWithOpenDart(MarketDto.Quote quote) {
        if (!"KR".equals(quote.market())) return quote;
        OpenDartCorp corp = findOpenDartCorp(quote.ticker());
        if (corp == null) return quote;
        String name = hasText(quote.name()) && !quote.name().equals(quote.ticker()) ? quote.name() : corp.corpName();
        return new MarketDto.Quote(
                quote.market(),
                quote.ticker(),
                name,
                quote.currency(),
                quote.currentPrice(),
                quote.previousClose(),
                quote.changeRate(),
                quote.marketCap(),
                quote.per(),
                quote.pbr(),
                quote.dividendYield(),
                quote.source() + "+opendart"
        );
    }

    private OpenDartCorp findOpenDartCorp(String ticker) {
        if (!hasText(openDartApiKey) || !hasText(ticker) || !ticker.matches("\\d{6}")) return null;
        Map<String, OpenDartCorp> cache = openDartCorpCache;
        if (cache.isEmpty()) {
            synchronized (this) {
                if (openDartCorpCache.isEmpty()) openDartCorpCache = loadOpenDartCorpCodes();
                cache = openDartCorpCache;
            }
        }
        return cache.get(ticker);
    }

    private Map<String, OpenDartCorp> loadOpenDartCorpCodes() {
        try {
            byte[] payload = restClientBuilder.build()
                    .get()
                    .uri(openDartBaseUrl + "/corpCode.xml?crtfc_key={apiKey}", openDartApiKey)
                    .retrieve()
                    .body(byte[].class);
            if (payload == null || payload.length == 0) return Map.of();

            Map<String, OpenDartCorp> corps = new HashMap<>();
            try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(payload))) {
                if (zip.getNextEntry() == null) return Map.of();
                var document = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(zip);
                NodeList nodes = document.getElementsByTagName("list");
                for (int i = 0; i < nodes.getLength(); i++) {
                    Element element = (Element) nodes.item(i);
                    String stockCode = xmlText(element, "stock_code");
                    if (!stockCode.matches("\\d{6}")) continue;
                    corps.put(stockCode, new OpenDartCorp(
                            xmlText(element, "corp_code"),
                            xmlText(element, "corp_name"),
                            stockCode
                    ));
                }
            }
            return corps;
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private List<MarketDto.SearchResult> searchFinnhub(String keyword) {
        if (!hasText(finnhubApiKey)) return List.of();
        try {
            FinnhubSearchResponse response = restClientBuilder.build()
                    .get()
                    .uri("https://finnhub.io/api/v1/search?q={keyword}&token={token}", keyword, finnhubApiKey)
                    .retrieve()
                    .body(FinnhubSearchResponse.class);

            if (response == null || response.result() == null) return List.of();

            return response.result().stream()
                    .filter(item -> item.symbol() != null && !item.symbol().contains("."))
                    .limit(30)
                    .map(item -> {
                        MarketDto.Quote quote = quoteFinnhub(item.symbol());
                        BigDecimal price = quote != null ? quote.currentPrice() : BigDecimal.ZERO;
                        return new MarketDto.SearchResult("US", item.symbol(), item.description(), "USD", item.type(), price, true, "finnhub");
                    })
                    .toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<MarketDto.SearchResult> searchYahooFinance(String keyword) {
        if (!hasText(keyword)) return List.of();
        try {
            JsonNode response = restClientBuilder.build()
                    .get()
                    .uri("https://query2.finance.yahoo.com/v1/finance/search?q={keyword}&quotesCount=30&newsCount=0", keyword)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode quotes = response.path("quotes");
            if (!quotes.isArray()) return List.of();

            List<MarketDto.SearchResult> results = new ArrayList<>();
            for (JsonNode item : quotes) {
                if (results.size() >= 30) break;
                String symbol = text(item, "symbol").toUpperCase();
                String quoteType = firstNonBlank(text(item, "quoteType"), text(item, "typeDisp")).toUpperCase();
                if (!hasText(symbol) || symbol.contains(".") || symbol.contains("=") || symbol.startsWith("^")) continue;
                if (!List.of("EQUITY", "ETF", "MUTUALFUND").contains(quoteType)) continue;

                MarketDto.Quote quote = quoteYahooFinance(symbol);
                BigDecimal price = quote != null ? quote.currentPrice() : BigDecimal.ZERO;
                String currency = quote != null ? quote.currency() : firstNonBlank(text(item, "currency"), "USD");
                String name = firstNonBlank(text(item, "shortname"), text(item, "longname"), text(item, "name"), symbol);
                String exchange = firstNonBlank(text(item, "exchDisp"), text(item, "exchange"), "US");
                results.add(new MarketDto.SearchResult("US", symbol, name, currency, exchange, price, false, "yahoo-finance-search"));
            }
            return results;
        } catch (Exception ignored) {
            return List.of();
        }
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

    private MarketDto.Quote quoteYahooFinance(String ticker) {
        if (!hasText(ticker)) return null;
        try {
            JsonNode response = restClientBuilder.build()
                    .get()
                    .uri("https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=5d&interval=1d", ticker)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode result = firstArrayItem(response.path("chart").path("result"));
            if (result == null) return null;

            JsonNode meta = result.path("meta");
            BigDecimal current = decimal(firstNonBlank(
                    text(meta, "regularMarketPrice"),
                    text(meta, "postMarketPrice"),
                    text(meta, "previousClose")
            ));
            if (current.compareTo(BigDecimal.ZERO) <= 0) return null;

            BigDecimal previous = decimal(firstNonBlank(
                    text(meta, "chartPreviousClose"),
                    text(meta, "previousClose"),
                    text(meta, "regularMarketPreviousClose")
            ));
            if (previous.compareTo(BigDecimal.ZERO) == 0) previous = current;

            String symbol = firstNonBlank(text(meta, "symbol"), ticker).toUpperCase();
            String currency = firstNonBlank(text(meta, "currency"), "USD");
            return new MarketDto.Quote(
                    "US",
                    symbol,
                    symbol,
                    currency,
                    current,
                    previous,
                    percentChange(current, previous),
                    "-",
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    "yahoo-finance"
            );
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
            return enrichWithOpenDart(new MarketDto.Quote(
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
            ));
        } catch (Exception ignored) {
            return null;
        }
    }

    private MarketDto.Quote quoteNaverFinance(String ticker) {
        if (!isKrTicker(ticker)) return null;
        try {
            JsonNode response = getNaverJson("https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:{ticker}", ticker);
            JsonNode item = response
                    .path("result")
                    .path("areas")
                    .path(0)
                    .path("datas")
                    .path(0);
            if (item.isMissingNode() || !hasText(text(item, "cd"))) return null;

            BigDecimal current = decimal(text(item, "nv"));
            BigDecimal previous = decimal(text(item, "pcv"));
            if (previous.compareTo(BigDecimal.ZERO) == 0) previous = current;
            BigDecimal dividend = decimal(text(item, "dv"));
            BigDecimal eps = decimal(text(item, "eps"));
            BigDecimal bps = decimal(text(item, "bps"));
            BigDecimal listedStockCount = decimal(text(item, "countOfListedStock"));
            BigDecimal marketCap = current.multiply(listedStockCount);

            return new MarketDto.Quote(
                    "KR",
                    ticker,
                    firstNonBlank(text(item, "nm"), displayName(ticker)),
                    "KRW",
                    current,
                    previous,
                    signedNaverRate(item),
                    formatKrwMarketCap(marketCap),
                    ratio(current, eps),
                    ratio(current, bps),
                    current.compareTo(BigDecimal.ZERO) > 0
                            ? dividend.divide(current, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                            : BigDecimal.ZERO,
                    "naver-finance"
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private JsonNode getNaverJson(String uri, Object... uriVariables) throws Exception {
        String body = restClientBuilder.build()
                .get()
                .uri(uri, uriVariables)
                .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                .header(HttpHeaders.REFERER, "https://finance.naver.com/")
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE + ", text/plain, */*")
                .retrieve()
                .body(String.class);
        return objectMapper.readTree(body);
    }

    private JsonNode safeNaverStockJson(String uri, Object... uriVariables) {
        try {
            String body = restClientBuilder.build()
                    .get()
                    .uri(uri, uriVariables)
                    .header(HttpHeaders.USER_AGENT, "Mozilla/5.0")
                    .header(HttpHeaders.REFERER, "https://stock.naver.com/")
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE + ", text/plain, */*")
                    .retrieve()
                    .body(String.class);
            return hasText(body) ? objectMapper.readTree(body) : null;
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
        ProcessBuilder builder = new ProcessBuilder(pythonBin, "scripts/market_data.py", action, market, value);
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
                .map(item -> new MarketDto.SearchResult(
                        item.market(), item.ticker(), item.name(), item.currency(), item.exchange(),
                        BigDecimal.ZERO, item.dividendAvailable(), "fallback-no-live-price"
                ))
                .limit(30)
                .toList();
    }

    private MarketDto.Quote fallbackQuote(String market, String ticker) {
        if ("KR".equals(market)) {
            MarketDto.Quote naver = quoteNaverFinance(ticker);
            if (isUsableQuote(naver)) return enrichWithOpenDart(naver);
        }
        return fallbackUniverse().stream()
                .filter(item -> item.market().equals(market))
                .filter(item -> item.ticker().equalsIgnoreCase(ticker))
                .findFirst()
                .map(item -> new MarketDto.Quote(item.market(), item.ticker(), item.name(), item.currency(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "-", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "fallback-no-live-price"))
                .orElse(new MarketDto.Quote(market, ticker, ticker, "KR".equals(market) ? "KRW" : "USD", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "-", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "fallback"));
    }

    private MarketDto.SearchResult freshenKrSearchResult(MarketDto.SearchResult item) {
        if (!"KR".equals(item.market())) return item;
        MarketDto.Quote quote = quoteNaverFinance(item.ticker());
        if (!isUsableQuote(quote)) return item;
        return new MarketDto.SearchResult(
                item.market(),
                item.ticker(),
                firstNonBlank(quote.name(), item.name()),
                item.currency(),
                item.exchange(),
                quote.currentPrice(),
                quote.dividendYield() != null && quote.dividendYield().compareTo(BigDecimal.ZERO) > 0,
                quote.source()
        );
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
                kr("000150", "두산", 184000, true),
                kr("000155", "두산우", 98000, true),
                kr("034020", "두산에너빌리티", 21000, true),
                kr("241560", "두산밥캣", 54000, true),
                kr("336260", "두산퓨얼셀", 18000, false),
                kr("454910", "두산로보틱스", 75000, false),
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
                us("AVGO", "Broadcom Inc.", 171, true),
                us("LLY", "Eli Lilly and Co.", 905, true),
                us("JPM", "JPMorgan Chase & Co.", 210, true),
                us("V", "Visa Inc.", 275, true),
                us("MA", "Mastercard Inc.", 470, true),
                us("WMT", "Walmart Inc.", 68, true),
                us("PG", "Procter & Gamble Co.", 165, true),
                us("XOM", "Exxon Mobil Corp.", 115, true),
                us("UNH", "UnitedHealth Group Inc.", 520, true),
                us("HD", "Home Depot Inc.", 360, true),
                us("COST", "Costco Wholesale Corp.", 850, true),
                us("NFLX", "Netflix Inc.", 650, false),
                us("AMD", "Advanced Micro Devices Inc.", 160, false),
                us("INTC", "Intel Corp.", 31, true),
                us("ORCL", "Oracle Corp.", 135, true),
                us("CRM", "Salesforce Inc.", 260, false),
                us("SCHD", "Schwab U.S. Dividend Equity ETF", 81.2, true),
                us("JEPI", "JPMorgan Equity Premium Income ETF", 56.4, true),
                us("JEPQ", "JPMorgan Nasdaq Equity Premium Income ETF", 54.8, true),
                us("VOO", "Vanguard S&P 500 ETF", 505.1, true),
                us("QQQM", "Invesco NASDAQ 100 ETF", 198.7, true),
                us("VYM", "Vanguard High Dividend Yield ETF", 121.5, true),
                us("HDV", "iShares Core High Dividend ETF", 111.8, true),
                us("SPY", "SPDR S&P 500 ETF Trust", 548.3, true),
                us("VTI", "Vanguard Total Stock Market ETF", 270.4, true),
                us("DIA", "SPDR Dow Jones Industrial Average ETF", 394.2, true),
                us("QQQ", "Invesco QQQ Trust", 483.6, true),
                us("DGRO", "iShares Core Dividend Growth ETF", 59.6, true),
                us("DGRW", "WisdomTree U.S. Quality Dividend Growth Fund", 78.1, true),
                us("DIVO", "Amplify CWP Enhanced Dividend Income ETF", 39.7, true),
                us("QYLD", "Global X NASDAQ 100 Covered Call ETF", 17.6, true),
                us("XYLD", "Global X S&P 500 Covered Call ETF", 40.9, true),
                us("RYLD", "Global X Russell 2000 Covered Call ETF", 16.4, true),
                us("NOBL", "ProShares S&P 500 Dividend Aristocrats ETF", 97.8, true),
                us("SDY", "SPDR S&P Dividend ETF", 129.2, true),
                us("TLT", "iShares 20+ Year Treasury Bond ETF", 92.4, true),
                us("IEF", "iShares 7-10 Year Treasury Bond ETF", 94.8, true),
                us("SHY", "iShares 1-3 Year Treasury Bond ETF", 82.1, true),
                us("BND", "Vanguard Total Bond Market ETF", 72.5, true),
                us("AGG", "iShares Core U.S. Aggregate Bond ETF", 98.8, true),
                us("HYG", "iShares iBoxx $ High Yield Corporate Bond ETF", 78.6, true),
                us("LQD", "iShares iBoxx $ Investment Grade Corporate Bond ETF", 109.2, true),
                us("TQQQ", "ProShares UltraPro QQQ", 73.5, false),
                us("SQQQ", "ProShares UltraPro Short QQQ", 7.9, false),
                us("QLD", "ProShares Ultra QQQ", 104.3, false),
                us("SSO", "ProShares Ultra S&P500", 88.2, false),
                us("UPRO", "ProShares UltraPro S&P500", 78.4, false),
                us("SPXL", "Direxion Daily S&P 500 Bull 3X Shares", 146.2, false),
                us("SOXL", "Direxion Daily Semiconductor Bull 3X Shares", 41.8, false),
                kr("069500", "KODEX 200", 43500, true),
                kr("102110", "TIGER 200", 43600, true),
                kr("360750", "TIGER 미국S&P500", 21900, true),
                kr("360200", "ACE 미국S&P500", 21800, true),
                kr("379780", "RISE 미국S&P500", 17800, true),
                kr("433330", "SOL 미국S&P500", 16700, true),
                kr("133690", "TIGER 미국나스닥100", 136000, true),
                kr("379810", "KODEX 미국나스닥100TR", 21200, false),
                kr("381180", "TIGER 미국필라델피아반도체나스닥", 18300, true),
                kr("379800", "KODEX 미국S&P500TR", 12850, true),
                kr("458730", "TIGER 미국배당다우존스", 11240, true),
                kr("402970", "ACE 미국배당다우존스", 11890, true),
                kr("441680", "TIGER 미국나스닥100커버드콜(합성)", 10300, true),
                kr("475720", "TIGER 미국테크TOP10+10%프리미엄", 10200, true),
                kr("480040", "TIGER 미국테크TOP10타겟커버드콜", 10000, true),
                kr("473330", "SOL 미국30년국채커버드콜(합성)", 10000, true),
                kr("476550", "TIGER 미국30년국채커버드콜액티브(H)", 10000, true),
                kr("305080", "TIGER 미국채10년선물", 11920, true),
                kr("148070", "KOSEF 국고채10년", 112300, true),
                kr("449170", "TIGER KOFR금리액티브(합성)", 104000, true),
                kr("423160", "KODEX KOFR금리액티브(합성)", 104000, true),
                kr("252670", "KODEX 200선물인버스2X", 2150, false),
                kr("233740", "KODEX 코스닥150레버리지", 10450, false),
                kr("122630", "KODEX 레버리지", 17800, false)
        );
    }

    private MarketDto.SearchResult kr(String ticker, String name, double price, boolean dividend) {
        return new MarketDto.SearchResult("KR", ticker, name, "KRW", "KRX", BigDecimal.valueOf(price), dividend, "fallback");
    }

    private MarketDto.SearchResult us(String ticker, String name, double price, boolean dividend) {
        return new MarketDto.SearchResult("US", ticker, name, "USD", "US", BigDecimal.valueOf(price), dividend, "fallback");
    }

    private boolean hasKisCredentials() {
        return hasText(kisAppKey) && hasText(kisAppSecret);
    }

    private boolean isUsableQuote(MarketDto.Quote quote) {
        return quote != null && quote.currentPrice() != null && quote.currentPrice().compareTo(BigDecimal.ZERO) > 0;
    }

    private String normalizeMarket(String market) {
        return "KR".equalsIgnoreCase(market) ? "KR" : "US";
    }

    private String normalizeTopMarket(String market) {
        if ("KR".equalsIgnoreCase(market)) return "KR";
        if ("US".equalsIgnoreCase(market)) return "US";
        return "ALL";
    }

    private String inferMarket(String ticker) {
        return isKrTicker(ticker) ? "KR" : "US";
    }

    private boolean isKrTicker(String ticker) {
        return hasText(ticker) && ticker.trim().toUpperCase().matches("\\d{5}[0-9A-Z]");
    }

    private boolean isEtfLike(MarketDto.SearchResult item) {
        if (item == null) return false;
        return isEtfName(item.exchange(), item.source(), item.name());
    }

    private boolean isEtfName(String... values) {
        String upper = String.join(" ", values == null ? new String[]{} : values).toUpperCase();
        return List.of(
                "ETF", "ETN", "KODEX", "TIGER", "RISE", "ACE", "SOL", "PLUS", "KBSTAR", "KOSEF",
                "HANARO", "TIMEFOLIO", "WON", "커버드콜", "채권", "레버리지", "인버스",
                "ISHARES", "VANGUARD", "SPDR", "INVESCO", "PROSHARES", "GLOBAL X", "DIREXION",
                "JPMORGAN", "SCHWAB", "WISDOMTREE", "AMPLIFY", "FUND", "TRUST"
        ).stream().anyMatch(upper::contains);
    }

    private JsonNode safeJson(String uri, Object... uriVariables) {
        try {
            return getJson(uri, uriVariables);
        } catch (Exception ignored) {
            return null;
        }
    }

    private JsonNode getJson(String uri, Object... uriVariables) {
        return restClientBuilder.build().get().uri(uri, uriVariables).retrieve().body(JsonNode.class);
    }

    private JsonNode firstArrayItem(JsonNode node) {
        return node != null && node.isArray() && !node.isEmpty() ? node.get(0) : null;
    }

    private JsonNode firstArrayField(JsonNode node, String... fieldNames) {
        if (node == null) return null;
        for (String fieldName : fieldNames) {
            JsonNode field = node.path(fieldName);
            if (field.isArray()) return field;
        }
        return node.isArray() ? node : null;
    }

    private String text(JsonNode node, String fieldName) {
        if (node == null || fieldName == null) return "";
        return node.path(fieldName).asText("").trim();
    }

    private String xmlText(Element element, String tagName) {
        NodeList nodes = element.getElementsByTagName(tagName);
        if (nodes.getLength() == 0) return "";
        return nodes.item(0).getTextContent().trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (hasText(value)) return value.trim();
        }
        return "";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean matchesKeyword(String ticker, String name, String keyword) {
        String normalized = keyword == null ? "" : keyword.toLowerCase();
        return ticker.toLowerCase().contains(normalized) || name.toLowerCase().contains(normalized);
    }

    private boolean matchesEtfKeyword(String ticker, String name, String keyword) {
        if (!hasText(keyword)) return true;
        String normalized = keyword.trim().toLowerCase();
        return ticker.toLowerCase().contains(normalized) || name.toLowerCase().contains(normalized);
    }

    private boolean exactEtfMatch(MarketDto.EtfSearchResult item, String keyword) {
        if (!hasText(keyword)) return false;
        return item.ticker().equalsIgnoreCase(keyword.trim()) || item.name().equalsIgnoreCase(keyword.trim());
    }

    private LocalDate latestKrxBusinessDay() {
        LocalDate date = LocalDate.now();
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.minusDays(1);
        }
        return date;
    }

    private BigDecimal positiveOr(BigDecimal primary, BigDecimal secondary) {
        if (primary != null && primary.compareTo(BigDecimal.ZERO) > 0) return primary;
        return secondary == null ? BigDecimal.ZERO : secondary;
    }

    private BigDecimal nonZeroOr(BigDecimal primary, BigDecimal secondary) {
        if (primary != null && primary.compareTo(BigDecimal.ZERO) != 0) return primary;
        return secondary == null ? BigDecimal.ZERO : secondary;
    }

    private BigDecimal nullablePositive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0 ? value : null;
    }

    private BigDecimal nullableNonZero(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) != 0 ? value : null;
    }

    private BigDecimal normalizeRatio(BigDecimal value) {
        return nullablePositive(value);
    }

    private String normalizeNaverComponentTicker(String value) {
        if (!hasText(value)) return "-";
        String normalized = value.trim().toUpperCase();
        return normalized.replaceFirst("\\.(O|N|K|KS|KQ)$", "");
    }

    private String stripHtml(String value) {
        if (!hasText(value)) return "";
        return value.replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String basicDate(String value) {
        try {
            return hasText(value)
                    ? LocalDate.parse(value.trim(), DateTimeFormatter.BASIC_ISO_DATE).toString()
                    : "";
        } catch (Exception ignored) {
            return "";
        }
    }

    private Integer integerOrNull(String value) {
        try {
            return hasText(value) ? Integer.valueOf(value.replace(",", "").trim()) : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String inferKoreanEtfProvider(String name) {
        String upper = name == null ? "" : name.toUpperCase();
        if (upper.contains("KODEX")) return "삼성자산운용";
        if (upper.contains("TIGER")) return "미래에셋자산운용";
        if (upper.contains("RISE") || upper.contains("KBSTAR")) return "KB자산운용";
        if (upper.contains("ACE")) return "한국투자신탁운용";
        if (upper.contains("SOL")) return "신한자산운용";
        if (upper.contains("PLUS")) return "한화자산운용";
        if (upper.contains("KOSEF")) return "키움투자자산운용";
        if (upper.contains("HANARO")) return "NH-Amundi자산운용";
        if (upper.contains("TIMEFOLIO")) return "타임폴리오자산운용";
        return "운용사 정보 없음";
    }

    private String inferUsEtfProvider(String name) {
        String upper = name == null ? "" : name.toUpperCase();
        if (upper.contains("ISHARES")) return "BlackRock";
        if (upper.contains("VANGUARD")) return "Vanguard";
        if (upper.contains("SPDR")) return "State Street";
        if (upper.contains("INVESCO")) return "Invesco";
        if (upper.contains("SCHWAB")) return "Charles Schwab";
        if (upper.contains("JPMORGAN")) return "J.P. Morgan";
        if (upper.contains("GLOBAL X")) return "Global X";
        if (upper.contains("PROSHARES")) return "ProShares";
        if (upper.contains("DIREXION")) return "Direxion";
        return "Provider unavailable";
    }

    private String inferEtfAssetClass(String name) {
        String upper = name == null ? "" : name.toUpperCase();
        if (List.of("채권", "국채", "BOND", "TREASURY", "FIXED INCOME", "KOFR").stream().anyMatch(upper::contains)) return "채권";
        if (List.of("리츠", "REIT", "REAL ESTATE").stream().anyMatch(upper::contains)) return "리츠/부동산";
        if (List.of("원유", "금", "은", "COMMODITY", "GOLD", "SILVER", "OIL").stream().anyMatch(upper::contains)) return "원자재";
        return "주식";
    }

    private String inferEtfIndexName(String name) {
        String upper = name == null ? "" : name.toUpperCase();
        if (upper.contains("S&P500") || upper.contains("S&P 500")) return "S&P 500 계열";
        if (upper.contains("나스닥100") || upper.contains("NASDAQ 100")) return "NASDAQ 100 계열";
        if (upper.contains("다우존스") || upper.contains("DOW JONES")) return "Dow Jones 계열";
        if (upper.contains("KOSPI200") || upper.contains("KOSPI 200") || upper.matches(".*\\b200\\b.*")) return "KOSPI 200 계열";
        return "추종 지수 정보 없음";
    }

    private String koreanEtfDescription(String name) {
        return name + "의 최근 거래 가격과 공시 가능한 상품 정보를 제공합니다. 구성종목과 분배금은 공급자 기준일에 따라 달라질 수 있습니다.";
    }

    private JsonNode findFinancialRow(JsonNode rows, String fiscalYear) {
        if (rows == null || !rows.isArray()) return null;
        for (JsonNode row : rows) {
            String year = firstNonBlank(text(row, "fiscalYear"), yearFromDate(text(row, "date")));
            if (year.equals(fiscalYear)) return row;
        }
        return null;
    }

    private String yearFromDate(String date) {
        return hasText(date) && date.length() >= 4 ? date.substring(0, 4) : "";
    }

    private BigDecimal nullableNumber(JsonNode row, String... fields) {
        if (row == null) return null;
        for (String field : fields) {
            String value = text(row, field);
            if (hasText(value)) return decimal(value);
        }
        return null;
    }

    private BigDecimal dartAccountAmount(JsonNode rows, String... accountNames) {
        if (rows == null || !rows.isArray()) return null;
        for (String accountName : accountNames) {
            for (JsonNode row : rows) {
                if (!accountName.equals(text(row, "account_nm"))) continue;
                String amount = firstNonBlank(text(row, "thstrm_amount"), text(row, "thstrm_add_amount"));
                if (hasText(amount) && !"-".equals(amount)) return decimal(amount);
            }
        }
        return null;
    }

    private BigDecimal decimal(String value) {
        try {
            if (value == null || value.isBlank()) return BigDecimal.ZERO;
            return new BigDecimal(value.trim().replace(",", "").replace("%", "").replace("+", "")).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal decimalAmount(String value) {
        try {
            if (value == null || value.isBlank()) return BigDecimal.ZERO;
            return new BigDecimal(value.trim().replace(",", "").replace("%", "").replace("+", "")).setScale(6, RoundingMode.HALF_UP);
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private LocalDate parseDate(String value) {
        try {
            return hasText(value) ? LocalDate.parse(value.trim()) : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private LocalDate epochDate(long epochSeconds) {
        if (epochSeconds <= 0) return null;
        return Instant.ofEpochSecond(epochSeconds).atZone(ZoneOffset.UTC).toLocalDate();
    }

    private LocalDate eventDate(MarketDto.DividendEvent event) {
        return event.paymentDate() != null ? event.paymentDate() : event.exDividendDate();
    }

    private BigDecimal percentChange(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return current.subtract(previous).divide(previous, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
    }

    private BigDecimal signedNaverRate(JsonNode item) {
        BigDecimal rate = decimal(text(item, "cr"));
        String changeType = text(item, "rf");
        if ("4".equals(changeType) || "5".equals(changeType) || "6".equals(changeType)) {
            return rate.abs().negate();
        }
        return rate;
    }

    private BigDecimal ratio(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private String compactCurrency(BigDecimal value, String currency) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) return "-";
        BigDecimal trillion = BigDecimal.valueOf(1_000_000_000_000L);
        BigDecimal billion = BigDecimal.valueOf(1_000_000_000L);
        BigDecimal million = BigDecimal.valueOf(1_000_000L);
        if (value.compareTo(trillion) >= 0) return currency + " " + value.divide(trillion, 2, RoundingMode.HALF_UP) + "T";
        if (value.compareTo(billion) >= 0) return currency + " " + value.divide(billion, 2, RoundingMode.HALF_UP) + "B";
        if (value.compareTo(million) >= 0) return currency + " " + value.divide(million, 2, RoundingMode.HALF_UP) + "M";
        return currency + " " + value.setScale(0, RoundingMode.HALF_UP);
    }

    private String formatKrwMarketCap(BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) return "-";
        BigDecimal jo = BigDecimal.valueOf(1_000_000_000_000L);
        BigDecimal eok = BigDecimal.valueOf(100_000_000L);
        if (value.compareTo(jo) >= 0) return value.divide(jo, 1, RoundingMode.HALF_UP) + "조";
        if (value.compareTo(eok) >= 0) return value.divide(eok, 0, RoundingMode.HALF_UP) + "억";
        return value.setScale(0, RoundingMode.HALF_UP).toPlainString();
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
        OpenDartCorp corp = findOpenDartCorp(ticker);
        if (corp != null && hasText(corp.corpName())) return corp.corpName();
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

    private record OpenDartCorp(String corpCode, String corpName, String stockCode) {}
    private record CachedTopEtfs(Instant cachedAt, List<MarketDto.SearchResult> items) {}
    private record CachedEtfUniverse(Instant cachedAt, List<MarketDto.EtfSearchResult> items) {}
    private record CachedInstrumentSnapshot(Instant cachedAt, MarketDto.InstrumentSnapshot snapshot) {}
    private record DividendFallback(BigDecimal amountPerShare, int intervalMonths, int baseMonth, int paymentDay, String source) {}
    private record FinnhubSearchResponse(List<FinnhubSymbol> result) {}
    private record FinnhubSymbol(String symbol, String description, String type) {}
    private record FinnhubQuoteResponse(BigDecimal c, BigDecimal pc) {}

    @FunctionalInterface
    private interface EtfUniverseLoader {
        List<MarketDto.EtfSearchResult> load();
    }
}
