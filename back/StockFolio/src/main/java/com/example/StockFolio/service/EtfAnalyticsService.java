package com.example.StockFolio.service;

import com.example.StockFolio.dto.EtfAnalyticsDto;
import com.example.StockFolio.dto.MarketDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class EtfAnalyticsService {

    private static final String METHODOLOGY_VERSION = "2026.07";
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private static final Map<String, List<Candidate>> RANKING_CANDIDATES = Map.of(
            "high-dividend", List.of(
                    us("SCHD"), us("VYM"), us("HDV"), us("DVY"), us("SPYD"),
                    kr("161510"), kr("279530"), kr("458730")
            ),
            "monthly-dividend", List.of(
                    us("JEPI"), us("JEPQ"), us("DIVO"), us("QYLD"), us("XYLD"), us("RYLD"),
                    kr("473330"), kr("476550")
            ),
            "dividend-growth", List.of(
                    us("SCHD"), us("DGRO"), us("DGRW"), us("NOBL"), us("SDY"), us("VIG"), us("VYM"),
                    kr("458730")
            ),
            "covered-call", List.of(
                    us("JEPI"), us("JEPQ"), us("QYLD"), us("XYLD"), us("RYLD"), us("DIVO"),
                    kr("473330"), kr("476550")
            ),
            "korea-listed-monthly", List.of(
                    kr("473330"), kr("476550"), kr("458730"), kr("441680"), kr("489030"), kr("494300")
            )
    );

    private static final Map<String, Map<String, Integer>> RANKING_WEIGHTS = Map.of(
            "high-dividend", orderedWeights(
                    "distributionYield", 25, "distributionStability", 20, "return3y", 15,
                    "drawdown", 10, "distributionVolatility", 10, "cost", 10, "liquidity", 10
            ),
            "monthly-dividend", orderedWeights(
                    "paymentRegularity", 25, "distributionStability", 20, "distributionYield", 15,
                    "return3y", 15, "drawdown", 10, "cost", 10, "liquidity", 5
            ),
            "dividend-growth", orderedWeights(
                    "distributionGrowth5y", 25, "distributionGrowth3y", 15, "distributionContinuity", 15,
                    "return5y", 15, "drawdown", 10, "cost", 10, "liquidity", 10
            ),
            "covered-call", orderedWeights(
                    "distributionYield", 20, "paymentRegularity", 20, "distributionStability", 20,
                    "return3y", 15, "drawdown", 10, "cost", 10, "liquidity", 5
            ),
            "korea-listed-monthly", orderedWeights(
                    "paymentRegularity", 25, "distributionStability", 20, "distributionYield", 20,
                    "return3y", 10, "drawdown", 10, "cost", 10, "liquidity", 5
            )
    );

    private final MarketDataService marketDataService;
    private final Map<String, CachedEtf> cache = new ConcurrentHashMap<>();

    public List<MarketDto.EtfSearchResult> search(String keyword, String market, int limit) {
        String requested = keyword == null ? "" : keyword.trim();
        String resolved = searchAlias(requested);
        int size = Math.max(1, Math.min(limit, 100));
        return marketDataService.searchEtfs(market, resolved, 100).stream()
                .sorted(Comparator
                        .comparingInt((MarketDto.EtfSearchResult item) -> searchRelevance(item, requested, resolved)).reversed()
                        .thenComparing(Comparator.comparingInt(this::searchCompleteness).reversed())
                        .thenComparing(item -> item.aum() == null ? BigDecimal.ZERO : item.aum(), Comparator.reverseOrder())
                        .thenComparing(MarketDto.EtfSearchResult::name))
                .limit(size)
                .toList();
    }

    public EtfAnalyticsDto.StandardizedEtf getEtf(String market, String ticker) {
        String normalizedTicker = ticker == null ? "" : ticker.trim().toUpperCase(Locale.ROOT);
        String normalizedMarket = normalizeMarket(market, normalizedTicker);
        String key = normalizedMarket + ":" + normalizedTicker;
        CachedEtf cached = cache.get(key);
        if (cached != null && Duration.between(cached.cachedAt(), Instant.now()).compareTo(CACHE_TTL) < 0) {
            return cached.etf();
        }

        MarketDto.InstrumentSnapshot snapshot = marketDataService.instrumentSnapshot(normalizedMarket, normalizedTicker);
        if (snapshot == null || !snapshot.etf()) {
            throw new IllegalArgumentException("ETF 정보를 찾을 수 없습니다: " + normalizedTicker);
        }
        EtfAnalyticsDto.StandardizedEtf standardized = standardize(snapshot);
        cache.put(key, new CachedEtf(Instant.now(), standardized));
        return standardized;
    }

    public EtfAnalyticsDto.CompareResponse compare(List<String> tickers) {
        List<EtfAnalyticsDto.StandardizedEtf> items = tickers.stream()
                .filter(this::hasText)
                .map(String::trim)
                .map(String::toUpperCase)
                .distinct()
                .limit(4)
                .map(ticker -> getEtf("AUTO", ticker))
                .toList();
        if (items.size() < 2) throw new IllegalArgumentException("비교할 ETF를 2개 이상 선택해 주세요.");

        List<EtfAnalyticsDto.HoldingOverlap> overlaps = new ArrayList<>();
        for (int left = 0; left < items.size(); left++) {
            for (int right = left + 1; right < items.size(); right++) {
                overlaps.add(calculateOverlap(items.get(left), items.get(right)));
            }
        }

        List<String> observations = comparisonObservations(items, overlaps);
        return new EtfAnalyticsDto.CompareResponse(items, overlaps, observations, Instant.now());
    }

    public EtfAnalyticsDto.RankingResponse ranking(String kind, String market, boolean excludeCoveredCall) {
        String normalizedKind = normalizeRankingKind(kind);
        String normalizedMarket = market == null ? "ALL" : market.trim().toUpperCase(Locale.ROOT);
        List<EtfAnalyticsDto.StandardizedEtf> candidates = RANKING_CANDIDATES.get(normalizedKind).stream()
                .filter(candidate -> "ALL".equals(normalizedMarket) || candidate.market().equals(normalizedMarket))
                .map(candidate -> safeGet(candidate.market(), candidate.ticker()))
                .filter(java.util.Objects::nonNull)
                .filter(etf -> !excludeCoveredCall || !etf.classification().coveredCall())
                .filter(etf -> isEligible(normalizedKind, etf))
                .toList();

        Map<String, List<EtfAnalyticsDto.StandardizedEtf>> byPeerGroup = new LinkedHashMap<>();
        candidates.forEach(etf -> byPeerGroup.computeIfAbsent(etf.classification().peerGroup(), ignored -> new ArrayList<>()).add(etf));

        List<EtfAnalyticsDto.RankingGroup> groups = new ArrayList<>();
        int[] overallRank = {1};
        byPeerGroup.forEach((peerGroup, peerItems) -> {
            List<ScoredEtf> scored = scoreGroup(normalizedKind, peerItems).stream()
                    .sorted(Comparator.comparing((ScoredEtf item) -> item.score().overall()).reversed())
                    .toList();
            List<EtfAnalyticsDto.RankingItem> rankingItems = new ArrayList<>();
            for (int index = 0; index < scored.size(); index++) {
                ScoredEtf item = scored.get(index);
                rankingItems.add(new EtfAnalyticsDto.RankingItem(
                        overallRank[0]++, index + 1, item.etf(), item.score(),
                        rankingReasons(normalizedKind, item.etf()), item.etf().analysis().cautions()
                ));
            }
            groups.add(new EtfAnalyticsDto.RankingGroup(peerGroup, peerGroupLabel(peerGroup), rankingItems));
        });

        return new EtfAnalyticsDto.RankingResponse(
                normalizedKind,
                rankingTitle(normalizedKind),
                rankingDescription(normalizedKind),
                METHODOLOGY_VERSION,
                Instant.now(),
                groups,
                RANKING_WEIGHTS.get(normalizedKind),
                List.of("현재가와 ETF 기본정보 확인 가능", "최근 12개월 분배금 데이터 우선", "동일 비교군(peerGroup) 안에서만 점수 산정"),
                List.of(
                        "과거 성과와 분배금은 미래 결과를 보장하지 않습니다.",
                        "API가 제공하지 않는 위험 지표는 임의 추정하지 않고 데이터 품질 감점으로 처리합니다.",
                        "거래대금이 없을 때 AUM을 유동성 보조 지표로 사용합니다."
                )
        );
    }

    public EtfAnalyticsDto.MethodologyResponse methodology() {
        return new EtfAnalyticsDto.MethodologyResponse(
                METHODOLOGY_VERSION,
                Instant.parse("2026-07-21T00:00:00Z"),
                RANKING_WEIGHTS,
                List.of(
                        "상장국가, 자산유형, 전략, 분배주기, 환노출, 비교군을 모든 화면에서 공통 사용",
                        "분배주기는 최근 370일 실제 지급 횟수를 우선 적용",
                        "커버드콜·레버리지·인버스·단일종목 ETF는 별도 플래그로 구분"
                ),
                List.of(
                        "동일 비교군 안에서 5~95 백분위 윈저라이징 후 백분위 점수 계산",
                        "결측 지표는 중립 점수가 아니라 35점으로 처리하고 데이터 품질 감점 적용",
                        "레버리지와 인버스 상품은 일반 목적 랭킹에서 위험 감점 적용"
                ),
                List.of(
                        "ANALYZABLE: 핵심 필드 75% 이상 확보",
                        "PARTIAL: 핵심 필드 45~74% 확보",
                        "INSUFFICIENT: 핵심 필드 45% 미만 확보"
                ),
                List.of("FMP: 미국 ETF·배당·구성종목", "KRX Open API: 국내 종목·ETF 공식 정보", "OpenDART: 국내 기업 재무·공시", "보조 소스: 네이버 증권·Yahoo Finance"),
                List.of("본 서비스의 점수와 모델 포트폴리오는 교육용 정보이며 개인별 투자자문이 아닙니다.")
        );
    }

    public EtfAnalyticsDto.ModelPortfolioResponse modelPortfolio(EtfAnalyticsDto.ModelPortfolioRequest request) {
        String risk = normalizeRisk(request == null ? null : request.riskLevel());
        String objective = normalizeObjective(request == null ? null : request.objective());
        Map<String, Integer> weights = modelWeights(risk, objective);
        List<EtfAnalyticsDto.ModelAllocation> allocations = List.of(
                allocation("US_EQUITY", "미국 주식", weights.get("US_EQUITY"), List.of("VOO", "VTI", "SCHD"), "장기 성장의 중심 자산"),
                allocation("GLOBAL_EQUITY", "글로벌 주식", weights.get("GLOBAL_EQUITY"), List.of("VT", "VXUS", "ACWI"), "국가 편중 완화"),
                allocation("BOND", "채권", weights.get("BOND"), List.of("BND", "AGG", "IEF"), "변동성 완충과 현금흐름 보조"),
                allocation("INCOME", "인컴 자산", weights.get("INCOME"), List.of("JEPI", "JEPQ", "DIVO"), "분배금 목적의 제한적 편입 후보"),
                allocation("CASH", "현금성 자산", weights.get("CASH"), List.of("SGOV", "BIL", "KOFR ETF"), "리밸런싱과 단기 지출 대비")
        );
        return new EtfAnalyticsDto.ModelPortfolioResponse(
                risk,
                objective,
                modelTitle(risk, objective),
                allocations,
                List.of("단일 ETF 최대 35%", "단일 운용사 최대 50%", "커버드콜 ETF 합계 최대 15%", "레버리지·인버스 ETF 제외"),
                List.of("반기 1회 정기 점검", "목표 비중에서 ±5%p 이탈 시 리밸런싱 검토", "세금과 거래비용을 먼저 확인"),
                List.of(
                        "이 결과는 교육용 예시이며 개인의 투자목표·재산상황을 반영한 투자자문이 아닙니다.",
                        "후보 ETF는 자동 매수 추천이 아니며 비용·유동성·환노출을 직접 확인해야 합니다."
                )
        );
    }

    private EtfAnalyticsDto.StandardizedEtf standardize(MarketDto.InstrumentSnapshot snapshot) {
        MarketDto.EtfProfile profile = snapshot.etfProfile();
        MarketDto.Quote quote = snapshot.quote();
        List<MarketDto.DividendEvent> dividends = snapshot.dividends() == null ? List.of() : snapshot.dividends();
        List<MarketDto.EtfHolding> holdings = snapshot.holdings() == null ? List.of() : snapshot.holdings();
        EtfAnalyticsDto.Classification classification = classify(snapshot, dividends);
        EtfAnalyticsDto.Metrics metrics = metrics(profile, quote, dividends, holdings);
        EtfAnalyticsDto.DataQuality quality = dataQuality(snapshot, metrics, holdings, dividends);
        EtfAnalyticsDto.RuleAnalysis analysis = analyze(classification, metrics, quality);
        String currency = firstNonBlank(quote == null ? null : quote.currency(), profile == null ? null : profile.currency(), "KR".equals(snapshot.market()) ? "KRW" : "USD");
        return new EtfAnalyticsDto.StandardizedEtf(
                snapshot.market(), snapshot.ticker(), snapshot.name(), currency,
                classification, metrics, quality, analysis, snapshot
        );
    }

    private EtfAnalyticsDto.Classification classify(MarketDto.InstrumentSnapshot snapshot, List<MarketDto.DividendEvent> dividends) {
        MarketDto.EtfProfile profile = snapshot.etfProfile();
        String text = String.join(" ", snapshot.ticker(), snapshot.name(), knownTickerDescriptor(snapshot.ticker()),
                profile == null ? "" : nullSafe(profile.assetClass()), profile == null ? "" : nullSafe(profile.indexName()),
                profile == null ? "" : nullSafe(profile.description())).toUpperCase(Locale.ROOT);
        boolean coveredCall = containsAny(text, "COVERED CALL", "COVEREDCALL", "커버드콜", "프리미엄인컴");
        boolean leveraged = containsAny(text, "LEVERAGED", "레버리지", "2X", "3X", "2배", "3배");
        boolean inverse = containsAny(text, "INVERSE", "인버스", "BEAR", "SHORT");
        boolean singleStock = containsAny(text, "SINGLE STOCK", "단일종목", "단일 종목");
        String assetType = inferAssetType(text);
        List<String> strategies = inferStrategies(text, coveredCall, leveraged, inverse);
        String frequency = distributionFrequency(dividends);
        String fxExposure = inferFxExposure(snapshot.market(), text);
        String peerGroup = inferPeerGroup(snapshot.market(), assetType, strategies, coveredCall);
        String riskLevel = leveraged || inverse || singleStock ? "VERY_HIGH"
                : coveredCall || "COMMODITY".equals(assetType) ? "HIGH"
                : assetType.contains("BOND") ? "LOW" : "MEDIUM";
        return new EtfAnalyticsDto.Classification(
                "KR".equals(snapshot.market()) ? "KR" : "US", assetType, strategies, frequency,
                fxExposure, peerGroup, riskLevel, leveraged, inverse, singleStock, coveredCall
        );
    }

    private EtfAnalyticsDto.Metrics metrics(
            MarketDto.EtfProfile profile,
            MarketDto.Quote quote,
            List<MarketDto.DividendEvent> dividends,
            List<MarketDto.EtfHolding> holdings
    ) {
        LocalDate cutoff = LocalDate.now().minusDays(370);
        List<BigDecimal> recentAmounts = dividends.stream()
                .filter(event -> eventDate(event) != null && !eventDate(event).isBefore(cutoff))
                .map(MarketDto.DividendEvent::amountPerShare)
                .filter(this::isPositive)
                .toList();
        BigDecimal observedTtm = recentAmounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal ttmAmount = isPositive(observedTtm) ? observedTtm : profile == null ? null : positive(profile.dividendPerShareTtm());
        BigDecimal currentPrice = quote == null ? null : positive(quote.currentPrice());
        BigDecimal ttmYield = profile == null ? null : positive(profile.dividendYieldTtm());
        if (ttmYield == null && currentPrice != null && ttmAmount != null) {
            ttmYield = ttmAmount.divide(currentPrice, 6, RoundingMode.HALF_UP).multiply(HUNDRED);
        }
        BigDecimal topTen = holdings.stream().limit(10).map(MarketDto.EtfHolding::weight).filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal premiumDiscount = profile != null && isPositive(profile.nav()) && currentPrice != null
                ? currentPrice.subtract(profile.nav()).divide(profile.nav(), 6, RoundingMode.HALF_UP).multiply(HUNDRED)
                : null;
        DistributionGrowth distributionGrowth = distributionGrowth(dividends);
        return new EtfAnalyticsDto.Metrics(
                currentPrice, ttmYield, ttmAmount, recentAmounts.size(), coefficientOfVariation(recentAmounts),
                distributionGrowth.cagrThreeYear(), distributionGrowth.cagrFiveYear(), distributionGrowth.consecutiveGrowthYears(),
                profile == null ? null : profile.returnOneMonth(), profile == null ? null : profile.returnThreeMonth(),
                profile == null ? null : profile.returnOneYear(), profile == null ? null : profile.returnThreeYear(),
                profile == null ? null : profile.returnFiveYear(), profile == null ? null : positive(profile.expenseRatio()),
                profile == null ? null : positive(profile.aum()), premiumDiscount,
                profile != null && profile.holdingsCount() != null ? profile.holdingsCount() : holdings.isEmpty() ? null : holdings.size(),
                isPositive(topTen) ? topTen : null,
                null, null, null, null, null
        );
    }

    private EtfAnalyticsDto.DataQuality dataQuality(
            MarketDto.InstrumentSnapshot snapshot,
            EtfAnalyticsDto.Metrics metrics,
            List<MarketDto.EtfHolding> holdings,
            List<MarketDto.DividendEvent> dividends
    ) {
        Map<String, Boolean> fields = new LinkedHashMap<>();
        fields.put("현재가", metrics.currentPrice() != null);
        fields.put("ETF 기본정보", snapshot.etfProfile() != null);
        fields.put("총보수", metrics.expenseRatio() != null);
        fields.put("순자산총액", metrics.aum() != null);
        fields.put("성과", firstNonNull(metrics.returnOneYear(), metrics.returnThreeYear(), metrics.returnFiveYear()) != null);
        fields.put("구성종목", !holdings.isEmpty());
        fields.put("분배금 이력", !dividends.isEmpty());
        List<String> missing = fields.entrySet().stream().filter(entry -> !entry.getValue()).map(Map.Entry::getKey).toList();
        int score = (int) Math.round((fields.size() - missing.size()) * 100.0 / fields.size());
        String status = score >= 75 ? "ANALYZABLE" : score >= 45 ? "PARTIAL" : "INSUFFICIENT";
        return new EtfAnalyticsDto.DataQuality(score, status, missing, snapshot.asOf(), snapshot.sources());
    }

    private EtfAnalyticsDto.RuleAnalysis analyze(
            EtfAnalyticsDto.Classification classification,
            EtfAnalyticsDto.Metrics metrics,
            EtfAnalyticsDto.DataQuality quality
    ) {
        if ("INSUFFICIENT".equals(quality.status())) {
            return new EtfAnalyticsDto.RuleAnalysis("INSUFFICIENT", null, null, null, null, null,
                    List.of(), List.of("분석에 필요한 데이터가 부족합니다."), quality.missingFields());
        }
        int income = clamp(toScore(metrics.ttmDistributionYield(), BigDecimal.valueOf(8)));
        int growth = clamp(toScore(firstNonNull(metrics.returnThreeYear(), metrics.returnOneYear()), BigDecimal.valueOf(15)));
        int cost = metrics.expenseRatio() == null ? 45 : clamp(100 - metrics.expenseRatio().multiply(BigDecimal.valueOf(120)).intValue());
        int diversification = metrics.topTenConcentration() == null ? 50 : clamp(100 - metrics.topTenConcentration().intValue());
        int risk = clamp((classification.leveraged() || classification.inverse() ? 20 : 70) - (classification.coveredCall() ? 15 : 0));
        List<String> strengths = new ArrayList<>();
        List<String> cautions = new ArrayList<>();
        if (income >= 60) strengths.add("최근 12개월 분배금 수준이 비교적 높습니다.");
        if (cost >= 75) strengths.add("총보수 부담이 비교적 낮습니다.");
        if (diversification >= 60) strengths.add("상위 종목 집중도가 비교적 낮습니다.");
        if (classification.coveredCall()) cautions.add("커버드콜 전략은 상승 참여가 제한되고 분배금이 변동될 수 있습니다.");
        if (classification.leveraged() || classification.inverse()) cautions.add("레버리지·인버스 상품은 장기 보유 시 경로 의존 위험이 큽니다.");
        if (metrics.topTenConcentration() != null && metrics.topTenConcentration().compareTo(BigDecimal.valueOf(55)) > 0) cautions.add("상위 10개 구성종목 비중이 높습니다.");
        if (quality.score() < 75) cautions.add("일부 데이터가 없어 분석 신뢰도가 제한됩니다.");
        return new EtfAnalyticsDto.RuleAnalysis(quality.status(), income, growth, cost, diversification, risk,
                strengths, cautions, quality.missingFields());
    }

    private EtfAnalyticsDto.HoldingOverlap calculateOverlap(EtfAnalyticsDto.StandardizedEtf left, EtfAnalyticsDto.StandardizedEtf right) {
        Map<String, BigDecimal> leftWeights = holdingWeights(left.snapshot().holdings());
        Map<String, BigDecimal> rightWeights = holdingWeights(right.snapshot().holdings());
        Set<String> common = new LinkedHashSet<>(leftWeights.keySet());
        common.retainAll(rightWeights.keySet());
        if (common.isEmpty() || leftWeights.isEmpty() || rightWeights.isEmpty()) {
            return new EtfAnalyticsDto.HoldingOverlap(left.ticker(), right.ticker(), null, "INSUFFICIENT", List.of());
        }
        BigDecimal overlap = common.stream().map(key -> leftWeights.get(key).min(rightWeights.get(key)))
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        return new EtfAnalyticsDto.HoldingOverlap(left.ticker(), right.ticker(), overlap, "CALCULATED", common.stream().limit(10).toList());
    }

    private List<String> comparisonObservations(List<EtfAnalyticsDto.StandardizedEtf> items, List<EtfAnalyticsDto.HoldingOverlap> overlaps) {
        List<String> observations = new ArrayList<>();
        items.stream().filter(item -> item.classification().coveredCall()).findFirst()
                .ifPresent(item -> observations.add(item.ticker() + "는 인컴 목적에 가깝지만 상승 참여 제한과 분배금 변동을 함께 확인해야 합니다."));
        items.stream().filter(item -> item.metrics().expenseRatio() != null)
                .min(Comparator.comparing(item -> item.metrics().expenseRatio()))
                .ifPresent(item -> observations.add(item.ticker() + "의 공시 총보수가 비교 대상 중 가장 낮습니다."));
        overlaps.stream().filter(item -> item.overlapPercent() != null && item.overlapPercent().compareTo(BigDecimal.valueOf(40)) >= 0)
                .forEach(item -> observations.add(item.leftTicker() + "와 " + item.rightTicker() + "는 상위 구성종목 중복도가 높아 분산 효과를 확인해야 합니다."));
        if (observations.isEmpty()) observations.add("투자 목적, 비용, 분배금 안정성, 구성종목 중복도를 함께 비교해 주세요.");
        return observations;
    }

    private List<ScoredEtf> scoreGroup(String kind, List<EtfAnalyticsDto.StandardizedEtf> group) {
        Map<String, Integer> weights = RANKING_WEIGHTS.get(kind);
        Map<String, Map<String, BigDecimal>> scoresByMetric = new HashMap<>();
        for (String metric : weights.keySet()) {
            scoresByMetric.put(metric, percentileScores(group, etf -> rankingMetric(metric, etf), higherIsBetter(metric)));
        }
        List<ScoredEtf> result = new ArrayList<>();
        for (EtfAnalyticsDto.StandardizedEtf etf : group) {
            BigDecimal weighted = BigDecimal.ZERO;
            for (Map.Entry<String, Integer> weight : weights.entrySet()) {
                BigDecimal metricScore = scoresByMetric.get(weight.getKey()).getOrDefault(etf.ticker(), BigDecimal.valueOf(35));
                weighted = weighted.add(metricScore.multiply(BigDecimal.valueOf(weight.getValue())));
            }
            BigDecimal penalty = rankingPenalty(etf);
            BigDecimal overall = weighted.divide(HUNDRED, 2, RoundingMode.HALF_UP).subtract(penalty).max(BigDecimal.ZERO);
            EtfAnalyticsDto.RankingScore score = new EtfAnalyticsDto.RankingScore(
                    overall,
                    componentScore(scoresByMetric, etf.ticker(), "return3y", "return5y"),
                    componentScore(scoresByMetric, etf.ticker(), "drawdown"),
                    componentScore(scoresByMetric, etf.ticker(), "cost"),
                    componentScore(scoresByMetric, etf.ticker(), "liquidity"),
                    componentScore(scoresByMetric, etf.ticker(), "distributionYield", "distributionStability", "paymentRegularity", "distributionGrowth3y", "distributionGrowth5y", "distributionContinuity"),
                    etf.analysis().diversificationScore() == null ? null : BigDecimal.valueOf(etf.analysis().diversificationScore()),
                    BigDecimal.valueOf(etf.dataQuality().score()), penalty
            );
            result.add(new ScoredEtf(etf, score));
        }
        return result;
    }

    private Map<String, BigDecimal> percentileScores(
            List<EtfAnalyticsDto.StandardizedEtf> items,
            Function<EtfAnalyticsDto.StandardizedEtf, BigDecimal> extractor,
            boolean higherIsBetter
    ) {
        List<BigDecimal> values = items.stream().map(extractor).filter(java.util.Objects::nonNull).sorted().toList();
        Map<String, BigDecimal> scores = new HashMap<>();
        if (values.isEmpty()) return scores;
        BigDecimal low = percentile(values, 0.05);
        BigDecimal high = percentile(values, 0.95);
        for (EtfAnalyticsDto.StandardizedEtf item : items) {
            BigDecimal value = extractor.apply(item);
            if (value == null) {
                scores.put(item.ticker(), BigDecimal.valueOf(35));
                continue;
            }
            BigDecimal clipped = value.max(low).min(high);
            BigDecimal score;
            if (high.compareTo(low) == 0) score = BigDecimal.valueOf(60);
            else score = clipped.subtract(low).divide(high.subtract(low), 6, RoundingMode.HALF_UP).multiply(HUNDRED);
            if (!higherIsBetter) score = HUNDRED.subtract(score);
            scores.put(item.ticker(), score.setScale(2, RoundingMode.HALF_UP));
        }
        return scores;
    }

    private BigDecimal rankingMetric(String metric, EtfAnalyticsDto.StandardizedEtf etf) {
        EtfAnalyticsDto.Metrics value = etf.metrics();
        return switch (metric) {
            case "distributionYield" -> value.ttmDistributionYield();
            case "distributionStability", "distributionVolatility" -> value.distributionVolatility();
            case "paymentRegularity" -> value.paymentCountTtm() == null ? null : BigDecimal.valueOf(Math.min(value.paymentCountTtm(), 12));
            case "distributionContinuity" -> value.consecutiveGrowthYears() == null ? null : BigDecimal.valueOf(value.consecutiveGrowthYears());
            case "return3y" -> firstNonNull(value.returnThreeYear(), value.returnOneYear());
            case "return5y" -> firstNonNull(value.returnFiveYear(), value.returnThreeYear(), value.returnOneYear());
            case "drawdown" -> firstNonNull(value.maxDrawdown(), value.topTenConcentration());
            case "cost" -> value.expenseRatio();
            case "liquidity" -> value.aum();
            case "distributionGrowth3y" -> value.distributionCagrThreeYear();
            case "distributionGrowth5y" -> value.distributionCagrFiveYear();
            default -> null;
        };
    }

    private boolean higherIsBetter(String metric) {
        return !List.of("distributionStability", "distributionVolatility", "drawdown", "cost").contains(metric);
    }

    private BigDecimal rankingPenalty(EtfAnalyticsDto.StandardizedEtf etf) {
        int penalty = etf.dataQuality().score() < 45 ? 18 : etf.dataQuality().score() < 75 ? 8 : 0;
        if (etf.classification().leveraged()) penalty += 15;
        if (etf.classification().inverse()) penalty += 15;
        return BigDecimal.valueOf(Math.min(penalty, 35));
    }

    private boolean isEligible(String kind, EtfAnalyticsDto.StandardizedEtf etf) {
        if ("monthly-dividend".equals(kind) || "korea-listed-monthly".equals(kind)) {
            return "MONTHLY".equals(etf.classification().distributionFrequency()) || etf.metrics().paymentCountTtm() != null;
        }
        if ("covered-call".equals(kind)) return etf.classification().coveredCall();
        return etf.metrics().currentPrice() != null;
    }

    private List<String> rankingReasons(String kind, EtfAnalyticsDto.StandardizedEtf etf) {
        List<String> reasons = new ArrayList<>();
        if (etf.metrics().ttmDistributionYield() != null) reasons.add("TTM 분배율 " + etf.metrics().ttmDistributionYield().setScale(2, RoundingMode.HALF_UP) + "%");
        if (etf.metrics().paymentCountTtm() != null) reasons.add("최근 12개월 " + etf.metrics().paymentCountTtm() + "회 지급");
        if (etf.metrics().expenseRatio() != null) reasons.add("총보수 " + etf.metrics().expenseRatio().stripTrailingZeros().toPlainString() + "%");
        if (reasons.isEmpty()) reasons.add("확보된 공시 데이터 기준");
        return reasons;
    }

    private Map<String, BigDecimal> holdingWeights(List<MarketDto.EtfHolding> holdings) {
        Map<String, BigDecimal> result = new LinkedHashMap<>();
        if (holdings == null) return result;
        holdings.stream().filter(holding -> hasText(holding.ticker()) && holding.weight() != null)
                .forEach(holding -> result.merge(holding.ticker().toUpperCase(Locale.ROOT), holding.weight(), BigDecimal::add));
        return result;
    }

    private BigDecimal componentScore(Map<String, Map<String, BigDecimal>> scores, String ticker, String... keys) {
        List<BigDecimal> values = java.util.Arrays.stream(keys).map(scores::get).filter(java.util.Objects::nonNull)
                .map(map -> map.get(ticker)).filter(java.util.Objects::nonNull).toList();
        return values.isEmpty() ? null : values.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal percentile(List<BigDecimal> values, double fraction) {
        if (values.size() == 1) return values.get(0);
        double position = (values.size() - 1) * fraction;
        int lower = (int) Math.floor(position);
        int upper = (int) Math.ceil(position);
        if (lower == upper) return values.get(lower);
        BigDecimal ratio = BigDecimal.valueOf(position - lower);
        return values.get(lower).add(values.get(upper).subtract(values.get(lower)).multiply(ratio));
    }

    private BigDecimal coefficientOfVariation(List<BigDecimal> values) {
        if (values.size() < 2) return null;
        double average = values.stream().mapToDouble(BigDecimal::doubleValue).average().orElse(0);
        if (average <= 0) return null;
        double variance = values.stream().mapToDouble(value -> Math.pow(value.doubleValue() - average, 2)).average().orElse(0);
        return BigDecimal.valueOf(Math.sqrt(variance) / average * 100).setScale(2, RoundingMode.HALF_UP);
    }

    private DistributionGrowth distributionGrowth(List<MarketDto.DividendEvent> dividends) {
        Map<Integer, BigDecimal> annualTotals = new TreeMap<>();
        dividends.stream()
                .filter(event -> eventDate(event) != null && isPositive(event.amountPerShare()))
                .forEach(event -> annualTotals.merge(eventDate(event).getYear(), event.amountPerShare(), BigDecimal::add));
        if (annualTotals.isEmpty()) return new DistributionGrowth(null, null, null);

        List<Integer> completedYears = annualTotals.keySet().stream()
                .filter(year -> year < LocalDate.now().getYear())
                .sorted()
                .toList();
        if (completedYears.size() < 2) return new DistributionGrowth(null, null, 0);

        int consecutive = 0;
        for (int index = completedYears.size() - 1; index > 0; index--) {
            int currentYear = completedYears.get(index);
            int previousYear = completedYears.get(index - 1);
            if (currentYear - previousYear != 1 || annualTotals.get(currentYear).compareTo(annualTotals.get(previousYear)) <= 0) break;
            consecutive++;
        }
        BigDecimal cagrThree = cagrForYears(annualTotals, completedYears, 3);
        BigDecimal cagrFive = cagrForYears(annualTotals, completedYears, 5);
        return new DistributionGrowth(cagrThree, cagrFive, consecutive);
    }

    private BigDecimal cagrForYears(Map<Integer, BigDecimal> annualTotals, List<Integer> years, int requiredYears) {
        if (years.size() < requiredYears) return null;
        int endYear = years.get(years.size() - 1);
        int startYear = endYear - (requiredYears - 1);
        BigDecimal startValue = annualTotals.get(startYear);
        BigDecimal endValue = annualTotals.get(endYear);
        if (!isPositive(startValue) || !isPositive(endValue)) return null;
        double growth = Math.pow(endValue.doubleValue() / startValue.doubleValue(), 1.0 / (requiredYears - 1)) - 1;
        return BigDecimal.valueOf(growth * 100).setScale(2, RoundingMode.HALF_UP);
    }

    private String distributionFrequency(List<MarketDto.DividendEvent> dividends) {
        LocalDate cutoff = LocalDate.now().minusDays(370);
        long count = dividends.stream().filter(event -> eventDate(event) != null && !eventDate(event).isBefore(cutoff) && isPositive(event.amountPerShare())).count();
        if (count >= 10) return "MONTHLY";
        if (count >= 3) return "QUARTERLY";
        if (count == 2) return "SEMIANNUAL";
        if (count == 1) return "ANNUAL";
        return "NONE";
    }

    private String inferAssetType(String text) {
        if (containsAny(text, "채권", "BOND", "TREASURY", "국채")) return containsAny(text, "단기", "SHORT TERM", "ULTRA SHORT") ? "SHORT_TERM_BOND" : "BOND";
        if (containsAny(text, "리츠", "REIT", "부동산")) return "REIT";
        if (containsAny(text, "원유", "GOLD", "금현물", "COMMODITY", "COMMODITIES")) return "COMMODITY";
        if (containsAny(text, "혼합", "BALANCED", "MULTI-ASSET")) return "MIXED_ASSET";
        return "EQUITY";
    }

    private List<String> inferStrategies(String text, boolean coveredCall, boolean leveraged, boolean inverse) {
        Set<String> result = new LinkedHashSet<>();
        if (coveredCall) result.add("COVERED_CALL");
        if (leveraged) result.add("LEVERAGED");
        if (inverse) result.add("INVERSE");
        if (containsAny(text, "DIVIDEND", "배당")) result.add("DIVIDEND");
        if (containsAny(text, "DIVIDEND GROWTH", "배당성장", "배당다우존스", "귀족")) result.add("DIVIDEND_GROWTH");
        if (containsAny(text, "HIGH DIVIDEND", "고배당")) result.add("HIGH_DIVIDEND");
        if (containsAny(text, "LOW VOL", "로우볼", "저변동")) result.add("LOW_VOLATILITY");
        if (containsAny(text, "GROWTH", "성장", "NASDAQ", "나스닥")) result.add("GROWTH");
        if (containsAny(text, "ACTIVE", "액티브")) result.add("ACTIVE");
        if (result.isEmpty()) result.add("MARKET_BROAD");
        return List.copyOf(result);
    }

    private String inferPeerGroup(String market, String assetType, List<String> strategies, boolean coveredCall) {
        String prefix = "KR".equals(market) ? "KR" : "US";
        if (coveredCall) return prefix + "_COVERED_CALL";
        if (assetType.contains("BOND")) return prefix + "_" + assetType;
        if (strategies.contains("DIVIDEND_GROWTH")) return prefix + "_DIVIDEND_GROWTH";
        if (strategies.contains("HIGH_DIVIDEND") || strategies.contains("DIVIDEND")) return prefix + "_DIVIDEND";
        if ("EQUITY".equals(assetType)) return prefix + "_BROAD_EQUITY";
        return prefix + "_" + assetType;
    }

    private String inferFxExposure(String market, String text) {
        if (!"KR".equals(market)) return "BASE_CURRENCY";
        boolean foreignUnderlying = containsAny(text, "미국", "글로벌", "CHINA", "중국", "JAPAN", "일본", "EUROPE", "유럽", "NASDAQ", "S&P");
        if (!foreignUnderlying) return "NOT_APPLICABLE";
        return containsAny(text, "(H)", "환헤지", "HEDGED") ? "HEDGED" : "UNHEDGED";
    }

    private String normalizeMarket(String market, String ticker) {
        if (!hasText(market) || "AUTO".equalsIgnoreCase(market)) return ticker.matches("\\d{5}[0-9A-Z]") ? "KR" : "US";
        return "KR".equalsIgnoreCase(market) ? "KR" : "US";
    }

    private String searchAlias(String keyword) {
        if (!hasText(keyword)) return "";
        return Map.ofEntries(
                Map.entry("슈드", "SCHD"), Map.entry("제피", "JEPI"), Map.entry("제피큐", "JEPQ"),
                Map.entry("브이오오", "VOO"), Map.entry("스파이", "SPY"), Map.entry("큐큐큐", "QQQ"),
                Map.entry("미국배당다우", "미국배당다우존스"), Map.entry("에스앤피500", "S&P500")
        ).getOrDefault(keyword.toLowerCase(Locale.ROOT), keyword);
    }

    private int searchRelevance(MarketDto.EtfSearchResult item, String requested, String resolved) {
        if (!hasText(requested)) return 0;
        String ticker = item.ticker().toUpperCase(Locale.ROOT);
        String name = item.name().toUpperCase(Locale.ROOT);
        String query = resolved.toUpperCase(Locale.ROOT);
        if (ticker.equals(query)) return 100;
        if (name.equals(query)) return 95;
        if (ticker.startsWith(query)) return 85;
        if (name.startsWith(query)) return 80;
        if (ticker.contains(query)) return 70;
        if (name.contains(query)) return 60;
        return 10;
    }

    private int searchCompleteness(MarketDto.EtfSearchResult item) {
        int score = 0;
        if (isPositive(item.currentPrice())) score += 3;
        if (isPositive(item.aum())) score += 2;
        if (isPositive(item.nav())) score += 1;
        if (Boolean.TRUE.equals(item.dividendAvailable())) score += 1;
        return score;
    }

    private String normalizeRankingKind(String kind) {
        String normalized = kind == null ? "" : kind.trim().toLowerCase(Locale.ROOT);
        if (!RANKING_CANDIDATES.containsKey(normalized)) throw new IllegalArgumentException("지원하지 않는 ETF 랭킹입니다: " + kind);
        return normalized;
    }

    private String normalizeRisk(String risk) {
        String normalized = risk == null ? "BALANCED" : risk.trim().toUpperCase(Locale.ROOT);
        return List.of("STABLE", "BALANCED", "AGGRESSIVE").contains(normalized) ? normalized : "BALANCED";
    }

    private String normalizeObjective(String objective) {
        String normalized = objective == null ? "LONG_TERM_GROWTH" : objective.trim().toUpperCase(Locale.ROOT);
        return List.of("LONG_TERM_GROWTH", "RETIREMENT_INCOME", "DIVIDEND_GROWTH", "CAPITAL_PRESERVATION").contains(normalized)
                ? normalized : "LONG_TERM_GROWTH";
    }

    private Map<String, Integer> modelWeights(String risk, String objective) {
        Map<String, Integer> weights = new LinkedHashMap<>(switch (risk) {
            case "STABLE" -> orderedWeights("US_EQUITY", 20, "GLOBAL_EQUITY", 10, "BOND", 50, "INCOME", 15, "CASH", 5);
            case "AGGRESSIVE" -> orderedWeights("US_EQUITY", 65, "GLOBAL_EQUITY", 10, "BOND", 10, "INCOME", 5, "CASH", 10);
            default -> orderedWeights("US_EQUITY", 45, "GLOBAL_EQUITY", 15, "BOND", 25, "INCOME", 5, "CASH", 10);
        });
        if ("RETIREMENT_INCOME".equals(objective)) {
            moveWeight(weights, "US_EQUITY", "BOND", 5);
            moveWeight(weights, "US_EQUITY", "INCOME", 5);
        } else if ("CAPITAL_PRESERVATION".equals(objective)) {
            moveWeight(weights, "US_EQUITY", "BOND", 10);
        } else if ("DIVIDEND_GROWTH".equals(objective)) {
            moveWeight(weights, "GLOBAL_EQUITY", "US_EQUITY", 5);
        }
        return weights;
    }

    private void moveWeight(Map<String, Integer> weights, String from, String to, int amount) {
        int movable = Math.min(amount, Math.max(0, weights.getOrDefault(from, 0)));
        weights.put(from, weights.getOrDefault(from, 0) - movable);
        weights.put(to, weights.getOrDefault(to, 0) + movable);
    }

    private String knownTickerDescriptor(String ticker) {
        return switch (ticker.toUpperCase(Locale.ROOT)) {
            case "SCHD", "DGRO", "DGRW", "NOBL", "SDY", "VIG" -> "DIVIDEND GROWTH ETF";
            case "VYM", "HDV", "DVY", "SPYD" -> "HIGH DIVIDEND ETF";
            case "JEPI", "JEPQ", "QYLD", "XYLD", "RYLD", "DIVO" -> "COVERED CALL DIVIDEND INCOME ETF";
            case "VOO", "SPY", "VTI", "IVV" -> "BROAD MARKET EQUITY ETF";
            case "QQQ", "QQQM" -> "NASDAQ GROWTH ETF";
            case "BND", "AGG", "IEF", "TLT", "SGOV", "BIL" -> "BOND ETF";
            default -> "";
        };
    }

    private EtfAnalyticsDto.ModelAllocation allocation(String assetClass, String label, int weight, List<String> tickers, String reason) {
        return new EtfAnalyticsDto.ModelAllocation(assetClass, label, weight, tickers, reason);
    }

    private String modelTitle(String risk, String objective) {
        Map<String, String> riskLabels = Map.of("STABLE", "안정형", "BALANCED", "균형형", "AGGRESSIVE", "공격형");
        Map<String, String> objectiveLabels = Map.of("LONG_TERM_GROWTH", "장기 성장", "RETIREMENT_INCOME", "은퇴 인컴", "DIVIDEND_GROWTH", "배당 성장", "CAPITAL_PRESERVATION", "자산 보전");
        return riskLabels.get(risk) + " · " + objectiveLabels.get(objective) + " 교육용 모델";
    }

    private String rankingTitle(String kind) {
        return switch (kind) {
            case "monthly-dividend" -> "월분배 ETF 랭킹";
            case "dividend-growth" -> "배당 성장 ETF 랭킹";
            case "covered-call" -> "커버드콜 ETF 랭킹";
            case "korea-listed-monthly" -> "국내 상장 월분배 ETF 랭킹";
            default -> "고배당 ETF 랭킹";
        };
    }

    private String rankingDescription(String kind) {
        return "같은 비교군 안에서 분배금, 성과, 비용, 유동성, 데이터 품질을 함께 평가한 참고용 순위입니다.";
    }

    private String peerGroupLabel(String peerGroup) {
        return switch (peerGroup) {
            case "US_COVERED_CALL" -> "미국 커버드콜";
            case "KR_COVERED_CALL" -> "국내 상장 커버드콜";
            case "US_DIVIDEND_GROWTH" -> "미국 배당 성장";
            case "KR_DIVIDEND_GROWTH" -> "국내 상장 배당 성장";
            case "US_DIVIDEND" -> "미국 배당주";
            case "KR_DIVIDEND" -> "국내 상장 배당주";
            default -> peerGroup.replace('_', ' ');
        };
    }

    private EtfAnalyticsDto.StandardizedEtf safeGet(String market, String ticker) {
        try {
            return getEtf(market, ticker);
        } catch (Exception ignored) {
            return null;
        }
    }

    private LocalDate eventDate(MarketDto.DividendEvent event) {
        return event.paymentDate() != null ? event.paymentDate() : event.exDividendDate();
    }

    private boolean containsAny(String text, String... values) {
        for (String value : values) if (text.contains(value)) return true;
        return false;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private boolean isPositive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
    }

    private BigDecimal positive(BigDecimal value) {
        return isPositive(value) ? value : null;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) if (hasText(value)) return value;
        return "";
    }

    @SafeVarargs
    private final <T> T firstNonNull(T... values) {
        for (T value : values) if (value != null) return value;
        return null;
    }

    private int toScore(BigDecimal value, BigDecimal target) {
        if (value == null) return 45;
        return value.divide(target, 4, RoundingMode.HALF_UP).multiply(HUNDRED).intValue();
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private static Candidate us(String ticker) {
        return new Candidate("US", ticker);
    }

    private static Candidate kr(String ticker) {
        return new Candidate("KR", ticker);
    }

    private static Map<String, Integer> orderedWeights(Object... pairs) {
        Map<String, Integer> result = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) result.put((String) pairs[index], (Integer) pairs[index + 1]);
        return result;
    }

    private record Candidate(String market, String ticker) {}
    private record CachedEtf(Instant cachedAt, EtfAnalyticsDto.StandardizedEtf etf) {}
    private record ScoredEtf(EtfAnalyticsDto.StandardizedEtf etf, EtfAnalyticsDto.RankingScore score) {}
    private record DistributionGrowth(BigDecimal cagrThreeYear, BigDecimal cagrFiveYear, Integer consecutiveGrowthYears) {}
}
