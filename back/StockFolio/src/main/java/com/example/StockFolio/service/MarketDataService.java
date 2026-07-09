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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class MarketDataService {

    private static final DateTimeFormatter KRX_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;

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
        JsonNode response = restClientBuilder.build()
                .get()
                .uri(krxBaseUrl + path + "?basDd={baseDate}", latestKrxBusinessDate())
                .header("AUTH_KEY", krxApiKey)
                .retrieve()
                .body(JsonNode.class);
        JsonNode rows = firstArrayField(response, "OutBlock_1", "output", "list");
        if (rows == null) return List.of();

        List<JsonNode> result = new ArrayList<>();
        rows.forEach(result::add);
        return result;
    }

    private MarketDto.SearchResult toKrxSearchResult(JsonNode row, String keyword, boolean etf) {
        String ticker = firstNonBlank(text(row, "ISU_SRT_CD"), text(row, "ISU_CD")).toUpperCase();
        String name = firstNonBlank(text(row, "ISU_ABBRV"), text(row, "ISU_NM"), ticker);
        if (!hasText(ticker) || !matchesKeyword(ticker, name, keyword)) return null;
        String exchange = etf ? "KRX ETF" : firstNonBlank(text(row, "MKT_NM"), "KRX");
        return new MarketDto.SearchResult("KR", ticker, name, "KRW", exchange, decimal(text(row, "TDD_CLSPRC")), false, etf ? "krx-openapi-etf" : "krx-openapi");
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
                if (!"stock".equalsIgnoreCase(text(item, "category"))) continue;
                String typeCode = text(item, "typeCode").toUpperCase();
                if (!List.of("KOSPI", "KOSDAQ", "KONEX").contains(typeCode)) continue;

                String ticker = firstNonBlank(text(item, "code"), text(item, "reutersCode")).toUpperCase();
                String name = text(item, "name");
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
                        firstNonBlank(text(item, "typeName"), "KRX"),
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
                .map(this::freshenKrSearchResult)
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
                .map(item -> new MarketDto.Quote(item.market(), item.ticker(), item.name(), item.currency(), item.currentPrice(), item.currentPrice(), BigDecimal.ZERO, defaultMarketCap(item.ticker()), defaultPer(item.ticker()), defaultPbr(item.ticker()), defaultDividendYield(item.ticker()), "fallback"))
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
                kr("379800", "KODEX 미국S&P500TR", 12850, true),
                kr("458730", "TIGER 미국배당다우존스", 11240, true),
                kr("402970", "ACE 미국배당다우존스", 11890, true),
                kr("305080", "TIGER 미국채10년선물", 11920, true),
                kr("148070", "KOSEF 국고채10년", 112300, true),
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

    private String inferMarket(String ticker) {
        return isKrTicker(ticker) ? "KR" : "US";
    }

    private boolean isKrTicker(String ticker) {
        return hasText(ticker) && ticker.trim().toUpperCase().matches("\\d{5}[0-9A-Z]");
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

    private String latestKrxBusinessDate() {
        LocalDate date = LocalDate.now();
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.minusDays(1);
        }
        return date.format(KRX_DATE_FORMAT);
    }

    private BigDecimal decimal(String value) {
        try {
            if (value == null || value.isBlank()) return BigDecimal.ZERO;
            return new BigDecimal(value.trim().replace(",", "").replace("%", "").replace("+", "")).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
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
    private record FinnhubSearchResponse(List<FinnhubSymbol> result) {}
    private record FinnhubSymbol(String symbol, String description, String type) {}
    private record FinnhubQuoteResponse(BigDecimal c, BigDecimal pc) {}
}
