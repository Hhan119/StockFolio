import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import {
  AdSlot,
  BeginnerSummary,
  DataFreshnessBadge,
  DistributionChart,
  EmptyState,
  ErrorState,
  EtfBadge,
  EtfMetricCard,
  HoldingsTable,
  InvestmentDisclaimer,
  RiskBadge,
  SectorAllocationChart,
  SkeletonState,
  TotalReturnChart,
} from "../../components/etf/index.jsx";
import { etfMarketService } from "../../services/etfMarketService.js";
import { formatNullable, getPerformanceTone } from "../../utils/etfCalculations.js";
import { formatExpenseRatio, formatMoney, formatPercent } from "../../utils/format.js";

const tabs = [
  ["overview", "한눈에 보기"],
  ["performance", "성과"],
  ["distribution", "분배금"],
  ["holdings", "구성 종목"],
  ["risk", "위험"],
  ["cost", "비용"],
];

function EtfDetailPage() {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [holdingKeyword, setHoldingKeyword] = useState("");

  const etfQuery = useQuery({
    queryKey: ["etf-detail", slug],
    queryFn: () => etfMarketService.getEtf(slug),
    retry: false,
  });

  const performanceQuery = useQuery({
    queryKey: ["etf-performance", slug],
    queryFn: async () => ({ data: (await etfMarketService.getEtf(slug)).data.performance }),
    enabled: activeTab === "performance",
  });
  const distributionQuery = useQuery({
    queryKey: ["etf-distributions", slug],
    queryFn: async () => ({ data: (await etfMarketService.getEtf(slug)).data.distribution }),
    enabled: activeTab === "distribution",
  });
  const holdingsQuery = useQuery({
    queryKey: ["etf-holdings", slug],
    queryFn: async () => {
      const data = (await etfMarketService.getEtf(slug)).data;
      return { data: { holdings: data.topHoldings, sectors: data.sectorAllocations, countries: data.countryAllocations, top10Concentration: data.top10Concentration, asOf: data.holdingsAsOf } };
    },
    enabled: activeTab === "holdings",
  });
  const similarQuery = useQuery({
    queryKey: ["etf-similar", slug],
    queryFn: async () => ({ data: [] }),
    enabled: activeTab === "overview",
  });

  const etf = etfQuery.data?.data;
  const filteredHoldings = useMemo(() => {
    const holdings = holdingsQuery.data?.data?.holdings || [];
    const keyword = holdingKeyword.trim().toLowerCase();
    if (!keyword) return holdings;
    return holdings.filter((holding) => `${holding.name} ${holding.ticker}`.toLowerCase().includes(keyword));
  }, [holdingKeyword, holdingsQuery.data]);

  if (etfQuery.isLoading) return <SkeletonState rows={4} />;
  if (etfQuery.isError) return <ErrorState error={etfQuery.error} onRetry={etfQuery.refetch} />;
  if (!etf) return <Navigate to="/404" replace />;

  const changeTone = getPerformanceTone(etf.quote.changeRate);
  const changeLabel = formatNullable(etf.quote.changeRate, (value) => `${value > 0 ? "▲ +" : value < 0 ? "▼ " : ""}${formatPercent(value)}`);

  return (
    <article className="grid gap-5">
      <Seo title={`${etf.ticker} ETF 상세`} description={`${etf.name}의 분배율, 분배 주기, 총보수, 성과, 위험, 구성 종목을 확인합니다.`} path={`/etf/${etf.slug}`} />

      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <EtfBadge tone={etf.listingRegion === "domestic" ? "emerald" : "cyan"}>{etf.regionLabel}</EtfBadge>
              <EtfBadge>{etf.strategy}</EtfBadge>
              <EtfBadge>{etf.distribution.frequency} 분배</EtfBadge>
              <EtfBadge tone="emerald">시장 데이터</EtfBadge>
            </div>
            <h2 className="mt-4 text-4xl font-black">{etf.ticker}</h2>
            <p className="mt-2 text-lg font-bold text-slate-300">{etf.name}</p>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300">{etf.beginnerDescription}</p>
            <div className="mt-4"><DataFreshnessBadge metadata={etf.metadata} /></div>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[360px]">
            <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-400">현재가</p><p className="font-black">{formatNullable(etf.quote.currentPrice, (value) => formatMoney(value, etf.currency))}</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-400">전일 대비</p><p className={`font-black ${changeTone === "positive" ? "text-emerald-300" : changeTone === "negative" ? "text-rose-300" : ""}`}>{changeLabel}</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-400">운용사</p><p className="font-black">{etf.provider}</p></div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-ghost-dark text-sm" type="button">관심등록</button>
          <Link className="btn-ghost-dark text-sm" to={`/etf/compare?tickers=${encodeURIComponent(etf.ticker)}`}>비교담기</Link>
          <Link className="btn-primary text-sm" to="/portfolio/my">포트폴리오 추가</Link>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <EtfMetricCard label="현재가" value={formatNullable(etf.quote.currentPrice, (value) => formatMoney(value, etf.currency))} help="ETF가 거래되는 시장의 최근 가격입니다. 공급자별 지연 시간이 있을 수 있습니다." />
        <EtfMetricCard label="최근 12개월(TTM) 분배율" value={formatNullable(etf.distribution.ttmDistributionRate, formatPercent)} help="최근 12개월 분배금을 현재가로 나눈 비율입니다." />
        <EtfMetricCard label="총보수" value={formatNullable(etf.cost.expenseRatio, formatExpenseRatio)} help="Expense Ratio. ETF 운용에 드는 연간 비용 비율입니다." />
        <EtfMetricCard label="순자산 규모(AUM)" value={formatNullable(etf.aum, (value) => formatMoney(value, etf.currency))} help="Assets Under Management. ETF가 운용하는 자산 규모입니다." />
        <EtfMetricCard label="1년 총수익률" value={formatNullable(etf.performance.totalReturn.oneYear, formatPercent)} tone={getPerformanceTone(etf.performance.totalReturn.oneYear)} help="가격 변화와 분배금을 함께 고려한 최근 1년 수익률입니다." />
        <EtfMetricCard label="분배 주기" value={etf.distribution.frequency} help="분배금이 지급되는 빈도입니다. 같은 금액 지급을 보장하지 않습니다." />
      </section>

      <AdSlot />

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 no-scrollbar dark:border-slate-800 dark:bg-slate-900">
        {tabs.map(([key, label]) => (
          <button className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black ${activeTab === key ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`} key={key} type="button" onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <section className="grid gap-5">
          <BeginnerSummary etf={etf} />
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xl font-black text-slate-950 dark:text-white">살펴볼 수 있는 투자 목적</h3>
              <div className="mt-3 flex flex-wrap gap-2">{etf.objectives.map((goal) => <EtfBadge tone="emerald" key={goal}>{goal}</EtfBadge>)}</div>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">위 항목은 상품을 이해하기 위한 분류이며, 매수 추천이 아닙니다.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xl font-black text-slate-950 dark:text-white">추가 확인이 필요한 점</h3>
              <ul className="mt-3 grid gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">{etf.cons.map((item) => <li key={item}>· {item}</li>)}</ul>
            </article>
          </div>
          {(similarQuery.isLoading || similarQuery.isError || (similarQuery.data?.data || []).length > 0) && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-black text-slate-950 dark:text-white">비슷한 ETF</h3>
            {similarQuery.isLoading && <SkeletonState rows={1} />}
            {similarQuery.isError && <ErrorState error={similarQuery.error} onRetry={similarQuery.refetch} />}
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {(similarQuery.data?.data || []).map((similar) => (
                <Link className="rounded-2xl bg-slate-50 p-4 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700" key={similar.slug} to={`/etf/compare?tickers=${etf.ticker},${similar.ticker}`}>
                  <p className="font-black text-slate-950 dark:text-white">{similar.ticker}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{similar.strategy}</p>
                  <p className="mt-3 text-xs font-black text-cyan-700 dark:text-cyan-300">바로 비교하기</p>
                </Link>
              ))}
            </div>
          </article>}
        </section>
      )}

      {activeTab === "performance" && (
        <AsyncPanel query={performanceQuery}>
          {(performance) => (
            <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xl font-black text-slate-950 dark:text-white">총수익률 비교</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">검증된 성과 데이터가 공급될 때만 표시합니다. 현재가 변동을 장기 수익률로 대체하지 않습니다.</p>
                {performance.series.length > 0 ? <div className="mt-4"><TotalReturnChart series={performance.series} /></div> : <EmptyState title="성과 데이터 없음" description="현재 공급자가 장기 성과 데이터를 제공하지 않았습니다." />}
              </article>
              <InvestmentDisclaimer />
            </section>
          )}
        </AsyncPanel>
      )}

      {activeTab === "distribution" && (
        <AsyncPanel query={distributionQuery}>
          {(distribution) => (
            <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xl font-black text-slate-950 dark:text-white">최근 12개월 월별 분배금</h3>
                {distribution.history.length > 0 ? <div className="mt-4"><DistributionChart history={distribution.history} /></div> : <EmptyState title="분배금 이력 없음" description="확인 가능한 분배금 이력이 없습니다." />}
              </article>
              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xl font-black text-slate-950 dark:text-white">분배금 요약</h3>
                <div className="mt-3 grid gap-2">
                  <EtfMetricCard label="최근 분배금" value={formatNullable(distribution.latestDistribution, (value) => formatMoney(value, etf.currency))} />
                  <EtfMetricCard label="최근 12개월 분배금" value={formatNullable(distribution.ttmDistributionAmount, (value) => formatMoney(value, etf.currency))} />
                  <EtfMetricCard label="3년 연평균 성장률(CAGR)" value={formatNullable(distribution.distributionCagr3y, formatPercent)} />
                  <EtfMetricCard label="5년 연평균 성장률(CAGR)" value={formatNullable(distribution.distributionCagr5y, formatPercent)} />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">다음 배당락일: {distribution.nextExDate.date || "정보 없음"} {distribution.nextExDate.date && `(${distribution.nextExDate.confirmed ? "확정" : "예상"})`}</p>
                <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">다음 지급일: {distribution.nextPayDate.date || "정보 없음"} {distribution.nextPayDate.date && `(${distribution.nextPayDate.confirmed ? "확정" : "예상"})`}</p>
              </aside>
            </section>
          )}
        </AsyncPanel>
      )}

      {activeTab === "holdings" && (
        <AsyncPanel query={holdingsQuery}>
          {(holdings) => (
            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div><h3 className="text-xl font-black text-slate-950 dark:text-white">구성 종목</h3><p className="mt-1 text-sm font-bold text-slate-500">기준일: {holdings.asOf}</p></div>
                  <input className="form-control md:max-w-xs" placeholder="구성 종목 검색" value={holdingKeyword} onChange={(event) => setHoldingKeyword(event.target.value)} />
                </div>
                {filteredHoldings.length > 0 ? <div className="mt-4"><HoldingsTable holdings={filteredHoldings} /></div> : <EmptyState title="구성종목 정보 없음" description="운용사 또는 데이터 공급자가 구성종목을 제공하지 않았습니다." />}
              </article>
              <aside className="grid gap-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">섹터 비중</h3>
                  <div className="mt-4"><SectorAllocationChart allocations={holdings.sectors} /></div>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">국가 비중</h3>
                  <div className="mt-4"><SectorAllocationChart allocations={holdings.countries} /></div>
                </article>
              </aside>
            </section>
          )}
        </AsyncPanel>
      )}

      {activeTab === "risk" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-black text-slate-950 dark:text-white">위험 지표</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <EtfMetricCard label="변동성" value={formatNullable(etf.risk.volatility, formatPercent)} />
              <EtfMetricCard label="최대 낙폭" value={formatNullable(etf.risk.maxDrawdown, formatPercent)} tone="negative" />
              <EtfMetricCard label="Beta" value={formatNullable(etf.risk.beta, (value) => value.toFixed(2))} />
              <EtfMetricCard label="표준편차" value={formatNullable(etf.risk.standardDeviation, formatPercent)} />
              <EtfMetricCard label="추적 오차" value={formatNullable(etf.risk.trackingError, formatPercent)} />
              <EtfMetricCard label="Bid-Ask Spread" value={formatNullable(etf.risk.bidAskSpread, formatPercent)} />
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-black text-slate-950 dark:text-white">초보자용 위험 설명</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
              변동성이 높으면 가격이 크게 움직일 수 있고, 최대 낙폭은 과거 하락 구간의 깊이를 보여줍니다. 커버드콜이나 파생상품 활용 ETF는 분배금 구조가 단순 배당주 ETF와 다를 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">{etf.risk.badges.map((badge) => <RiskBadge key={badge} label={badge} />)}</div>
          </article>
        </section>
      )}

      {activeTab === "cost" && (
        <section className="grid gap-4 lg:grid-cols-4">
          <EtfMetricCard label="총보수" value={formatNullable(etf.cost.expenseRatio, formatExpenseRatio)} help="실제 비용은 보수 외 추적오차, 매매비용, 세금에 따라 달라질 수 있습니다." />
          <EtfMetricCard label="100만원 기준 연 비용" value={formatNullable(etf.cost.annualCost.oneMillion, (value) => formatMoney(value, "KRW"))} />
          <EtfMetricCard label="1,000만원 기준 연 비용" value={formatNullable(etf.cost.annualCost.tenMillion, (value) => formatMoney(value, "KRW"))} />
          <EtfMetricCard label="1억원 기준 연 비용" value={formatNullable(etf.cost.annualCost.hundredMillion, (value) => formatMoney(value, "KRW"))} />
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold leading-7 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 lg:col-span-4">
            위 비용은 총보수를 투자금에 단순 곱한 환산값입니다. 실제 투자자가 부담하는 비용은 ETF 내부 거래비용, 괴리율, 세금, 환율 등에 따라 달라질 수 있습니다.
          </p>
        </section>
      )}

      <InvestmentDisclaimer />
    </article>
  );
}

function AsyncPanel({ query, children }) {
  if (query.isLoading) return <SkeletonState rows={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (!query.data?.data) return <EmptyState />;
  return children(query.data.data);
}

export default EtfDetailPage;
