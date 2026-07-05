import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import {
  AdSlot,
  DistributionChart,
  EmptyState,
  ErrorState,
  EtfBadge,
  InvestmentDisclaimer,
  RankingMethodology,
  SkeletonState,
} from "../../components/etf/index.jsx";
import { etfMockApi, MOCK_ETFS } from "../../services/etfMockApi.js";
import { formatNullable } from "../../utils/etfCalculations.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

const rankingCopy = {
  "high-dividend": {
    title: "고분배 ETF 순위",
    intro: "고분배 ETF는 최근 12개월 분배율이 상대적으로 높은 ETF입니다. 분배율만 보고 판단하면 원금 변동, 분배금 삭감, 총수익률 저하를 놓칠 수 있습니다.",
    method: "최근 12개월(TTM) 분배율을 기본 정렬 기준으로 사용합니다. 커버드콜 ETF와 일반 배당주 ETF는 전략 배지를 통해 구분합니다.",
  },
  "monthly-dividend": {
    title: "월분배 ETF 순위",
    intro: "월분배 ETF는 매월 분배금을 지급하는 구조의 ETF입니다. 매월 같은 금액이 보장되지 않으며, 분배 재원과 전략을 함께 확인해야 합니다.",
    method: "월 분배 주기 ETF를 중심으로 최근 12개월 분배율, 최근 월 분배금, 지급 횟수, 1년 총수익률을 함께 표시합니다.",
  },
  "dividend-growth": {
    title: "분배금 성장 ETF 순위",
    intro: "분배금 성장 ETF는 현재 분배율보다 장기 분배금 증가와 재무 건전성을 함께 보는 접근입니다. 운용 기간이 짧으면 성장률은 N/A로 표시합니다.",
    method: "분배금 성장 성격 ETF를 대상으로 3년/5년 연평균 성장률(CAGR), 연속 증가 연수, 5년 총수익률을 함께 봅니다.",
  },
};

function EtfRankingPage() {
  const { slug } = useParams();
  const [region, setRegion] = useState("all");
  const [assetType, setAssetType] = useState("all");
  const [excludeCoveredCall, setExcludeCoveredCall] = useState(false);

  const query = useQuery({
    queryKey: ["etf-ranking", slug, region, assetType, excludeCoveredCall],
    queryFn: async () => {
      const response = await etfMockApi.getRanking(slug, { region, assetType });
      return {
        ...response,
        data: {
          ...response.data,
          items: excludeCoveredCall ? response.data.items.filter((etf) => !etf.category.includes("커버드콜")) : response.data.items,
        },
      };
    },
    retry: false,
  });

  if (query.isError && query.error?.message?.includes("찾을 수 없습니다")) return <Navigate to="/404" replace />;

  const items = query.data?.data?.items || [];
  const ranking = query.data?.data?.ranking;
  const copy = rankingCopy[slug] || { title: ranking?.title || "ETF 순위", intro: ranking?.description || "", method: "최근 데이터 기준으로 정렬합니다." };
  const counts = {
    all: MOCK_ETFS.length,
    domestic: MOCK_ETFS.filter((etf) => etf.listingRegion === "domestic").length,
    overseas: MOCK_ETFS.filter((etf) => etf.listingRegion === "overseas").length,
  };

  return (
    <section className="grid gap-5">
      <Seo title={copy.title} description={copy.intro} path={`/etf/rankings/${slug}`} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">ETF Ranking</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{copy.title}</h2>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{copy.intro}</p>
          </div>
          <MarketSegmentedControl counts={counts} value={region} onChange={setRegion} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <select className="form-control max-w-xs bg-slate-50 dark:bg-slate-800" value={assetType} onChange={(event) => setAssetType(event.target.value)}>
            <option value="all">자산 유형 전체</option>
            <option value="equity">주식</option>
            <option value="bond">채권</option>
            <option value="reit">리츠</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <input checked={excludeCoveredCall} type="checkbox" onChange={(event) => setExcludeCoveredCall(event.target.checked)} />
            커버드콜 제외
          </label>
        </div>
      </div>

      <RankingMethodology>{copy.method} 데이터 기준일과 Mock 여부는 각 ETF 상세 페이지 및 샘플 데이터 배지로 확인할 수 있습니다.</RankingMethodology>

      {query.isLoading && <SkeletonState rows={4} />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
      {!query.isLoading && !query.isError && items.length === 0 && <EmptyState title="순위 데이터가 없습니다" description="필터를 변경하거나 다른 순위 페이지를 확인해보세요." />}

      {!query.isLoading && !query.isError && items.length > 0 && (
        <>
          <RankingTable items={items} rankingKind={slug} />
          <div className="grid gap-3 lg:hidden">
            {items.map((etf, index) => <RankingCard etf={etf} index={index} key={etf.slug} rankingKind={slug} />)}
          </div>
          <AdSlot />
        </>
      )}

      <InvestmentDisclaimer />
    </section>
  );
}

function RankingTable({ items, rankingKind }) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            {getColumns(rankingKind).map((column) => <th className="p-4" key={column.label}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((etf, index) => (
            <tr key={etf.slug}>
              {getColumns(rankingKind).map((column) => <td className="p-4 font-bold text-slate-700 dark:text-slate-300" key={column.label}>{column.render(etf, index)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankingCard({ etf, index, rankingKind }) {
  return (
    <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" to={`/etf/${etf.slug}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-3xl font-black text-slate-300">#{index + 1}</p><h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{etf.ticker}</h3><p className="text-sm font-bold text-slate-600 dark:text-slate-300">{etf.name}</p></div>
        <div className="flex flex-wrap justify-end gap-2"><EtfBadge>{etf.category}</EtfBadge><EtfBadge tone={etf.listingRegion === "domestic" ? "emerald" : "cyan"}>{etf.regionLabel}</EtfBadge></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {getColumns(rankingKind).slice(2, 6).map((column) => <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800" key={column.label}><p className="text-xs font-black text-slate-500">{column.label}</p><p className="mt-1 font-black">{column.render(etf, index)}</p></div>)}
      </div>
      {rankingKind === "monthly-dividend" && <div className="mt-4"><DistributionChart history={etf.distribution.history.slice(-4)} /></div>}
    </Link>
  );
}

function getColumns(kind) {
  const base = [
    { label: "순위", render: (_etf, index) => `#${index + 1}` },
    { label: "ETF", render: (etf) => <Link className="font-black text-slate-950 hover:text-cyan-700 dark:text-white" to={`/etf/${etf.slug}`}>{etf.ticker} · {etf.name}</Link> },
  ];
  if (kind === "monthly-dividend") {
    return [
      ...base,
      { label: "최근 12개월 분배율", render: (etf) => formatNullable(etf.distribution.ttmDistributionRate, formatPercent) },
      { label: "최근 월 분배금", render: (etf) => formatNullable(etf.distribution.latestDistribution, (value) => formatMoney(value, etf.currency)) },
      { label: "최근 12개월 지급 횟수", render: (etf) => `${etf.distribution.history.length}회` },
      { label: "분배금 변동성", render: (etf) => (etf.category.includes("커버드콜") ? "높음" : "보통") },
      { label: "1년 총수익률", render: (etf) => formatNullable(etf.performance.totalReturn.oneYear, formatPercent) },
      { label: "총보수", render: (etf) => formatNullable(etf.cost.expenseRatio, formatPercent) },
      { label: "투자 전략", render: (etf) => etf.strategy },
    ];
  }
  if (kind === "dividend-growth") {
    return [
      ...base,
      { label: "현재 분배율", render: (etf) => formatNullable(etf.distribution.ttmDistributionRate, formatPercent) },
      { label: "3년 분배금 연평균 성장률", render: (etf) => formatNullable(etf.distribution.distributionCagr3y, formatPercent) },
      { label: "5년 분배금 연평균 성장률", render: (etf) => formatNullable(etf.distribution.distributionCagr5y, formatPercent) },
      { label: "연속 분배금 증가 연수", render: (etf) => etf.distribution.annualIncreaseYears ?? "N/A" },
      { label: "5년 총수익률", render: (etf) => formatNullable(etf.performance.totalReturn.fiveYear, formatPercent) },
      { label: "총보수", render: (etf) => formatNullable(etf.cost.expenseRatio, formatPercent) },
      { label: "순자산 규모", render: (etf) => formatNullable(etf.aum, (value) => formatMoney(value, etf.currency)) },
    ];
  }
  return [
    ...base,
    { label: "최근 12개월 분배율", render: (etf) => formatNullable(etf.distribution.ttmDistributionRate, formatPercent) },
    { label: "3년 평균 분배율", render: (etf) => formatNullable(etf.distribution.distributionCagr3y, formatPercent) },
    { label: "분배 주기", render: (etf) => etf.distribution.frequency },
    { label: "1년 총수익률", render: (etf) => formatNullable(etf.performance.totalReturn.oneYear, formatPercent) },
    { label: "총보수", render: (etf) => formatNullable(etf.cost.expenseRatio, formatPercent) },
    { label: "순자산 규모", render: (etf) => formatNullable(etf.aum, (value) => formatMoney(value, etf.currency)) },
    { label: "투자 전략", render: (etf) => etf.strategy },
  ];
}

export default EtfRankingPage;
