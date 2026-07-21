import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import { AdSlot, EmptyState, ErrorState, InvestmentDisclaimer, SkeletonState } from "../../components/etf/index.jsx";
import { etfMarketService } from "../../services/etfMarketService.js";
import { formatExpenseRatio, formatMoney, formatPercent } from "../../utils/format.js";

const supportedKinds = new Set(["high-dividend", "monthly-dividend", "dividend-growth", "covered-call", "korea-listed-monthly"]);

const marketValue = (region) => ({ all: "ALL", domestic: "KR", overseas: "US" }[region] || "ALL");

const metric = (value, formatter = formatPercent) => value == null ? "N/A" : formatter(value);

function EtfRankingPage() {
  const { slug } = useParams();
  const [region, setRegion] = useState(slug === "korea-listed-monthly" ? "domestic" : "all");
  const [assetType, setAssetType] = useState("all");
  const [excludeCoveredCall, setExcludeCoveredCall] = useState(false);

  const query = useQuery({
    queryKey: ["etf-standard-ranking", slug, region, excludeCoveredCall],
    queryFn: () => etfMarketService.getRanking(slug, {
      market: marketValue(region),
      excludeCoveredCall,
    }),
    enabled: supportedKinds.has(slug),
    staleTime: 60 * 60_000,
    retry: false,
  });

  const groups = useMemo(() => (query.data?.groups || []).map((group) => ({
    ...group,
    items: group.items.filter((item) => assetType === "all" || assetMatches(item.etf.classification.assetType, assetType)),
  })).filter((group) => group.items.length), [assetType, query.data]);

  const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  if (!supportedKinds.has(slug)) return <Navigate replace to="/404" />;

  return (
    <section className="grid gap-5">
      <Seo title={query.data?.title || "ETF 랭킹"} description="동일 비교군 안에서 분배금, 성과, 비용, 유동성, 데이터 품질을 함께 평가합니다." path={`/etf/rankings/${slug}`} />

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Peer Group Ranking</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{query.data?.title || "ETF 랭킹"}</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              {query.data?.description || "같은 성격의 ETF끼리 비교해 목적에 맞는 후보를 좁힙니다."}
            </p>
          </div>
          <MarketSegmentedControl counts={{}} value={region} onChange={setRegion} />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select className="form-control max-w-xs bg-slate-50 dark:bg-slate-800" value={assetType} onChange={(event) => setAssetType(event.target.value)}>
            <option value="all">자산 유형 전체</option>
            <option value="equity">주식</option>
            <option value="bond">채권</option>
            <option value="reit">리츠</option>
          </select>
          <label className="flex min-h-12 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <input checked={excludeCoveredCall} type="checkbox" onChange={(event) => setExcludeCoveredCall(event.target.checked)} />
            커버드콜 제외
          </label>
          <span className="text-sm font-black text-slate-500 dark:text-slate-400">분석 대상 {itemCount}개</span>
        </div>
      </header>

      <MethodologySummary data={query.data} />

      {query.isLoading && <SkeletonState rows={5} />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
      {!query.isLoading && !query.isError && groups.length === 0 && (
        <EmptyState title="조건에 맞는 분석 가능 ETF가 없습니다" description="시장 또는 자산 유형 필터를 변경해보세요. 데이터가 부족한 ETF는 순위에서 제외될 수 있습니다." />
      )}

      {groups.map((group) => <RankingGroup group={group} key={group.peerGroup} />)}

      {groups.length > 0 && <AdSlot />}
      <InvestmentDisclaimer />
    </section>
  );
}

function MethodologySummary({ data }) {
  if (!data) return null;
  const weights = Object.entries(data.weights || {});
  return (
    <aside className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-5 dark:border-cyan-900 dark:bg-cyan-950/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">산정 기준 v{data.methodologyVersion}</h3>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">5~95 백분위 윈저라이징 후 같은 비교군 안에서 점수를 계산합니다. 결측치는 데이터 품질 감점에 반영합니다.</p>
        </div>
        <Link className="btn-muted shrink-0 text-sm" to="/etf/methodology">전체 방법론</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {weights.map(([name, weight]) => <span className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200" key={name}>{weightLabel(name)} {weight}%</span>)}
      </div>
    </aside>
  );
}

function RankingGroup({ group }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{group.peerGroup}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{group.label}</h3>
        </div>
        <span className="text-sm font-black text-slate-500">{group.items.length}개</span>
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 2xl:block">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              {['순위', 'ETF', '종합점수', '현재가', 'TTM 분배율', '지급 횟수', '총보수', 'AUM', '데이터 품질'].map((label) => <th className="p-4" key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {group.items.map((item) => <RankingRow item={item} key={item.etf.ticker} />)}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 2xl:hidden">
        {group.items.map((item) => <RankingCard item={item} key={item.etf.ticker} />)}
      </div>
    </section>
  );
}

function RankingRow({ item }) {
  const { etf } = item;
  return (
    <tr className="align-middle transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <td className="p-4 text-xl font-black text-slate-400">#{item.peerRank}</td>
      <td className="p-4">
        <Link className="font-black text-slate-950 hover:text-cyan-700 dark:text-white" to={`/etf/${etf.ticker.toLowerCase()}`}>{etf.ticker}</Link>
        <p className="mt-1 max-w-xs truncate text-xs font-bold text-slate-500">{etf.name}</p>
      </td>
      <td className="p-4"><ScoreBadge value={item.score.overall} /></td>
      <td className="p-4 font-black">{metric(etf.metrics.currentPrice, (value) => formatMoney(value, etf.currency))}</td>
      <td className="p-4 font-black text-emerald-700 dark:text-emerald-300">{metric(etf.metrics.ttmDistributionYield)}</td>
      <td className="p-4 font-black">{etf.metrics.paymentCountTtm ?? "N/A"}회</td>
      <td className="p-4 font-black">{metric(etf.metrics.expenseRatio, formatExpenseRatio)}</td>
      <td className="p-4 font-black">{metric(etf.metrics.aum, (value) => formatMoney(value, etf.currency))}</td>
      <td className="p-4"><QualityBadge quality={etf.dataQuality} /></td>
    </tr>
  );
}

function RankingCard({ item }) {
  const { etf } = item;
  return (
    <Link className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-900" to={`/etf/${etf.ticker.toLowerCase()}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-500">비교군 #{item.peerRank}</p>
          <h4 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{etf.ticker}</h4>
          <p className="mt-1 truncate text-sm font-bold text-slate-600 dark:text-slate-300">{etf.name}</p>
        </div>
        <ScoreBadge value={item.score.overall} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <MiniMetric label="현재가" value={metric(etf.metrics.currentPrice, (value) => formatMoney(value, etf.currency))} />
        <MiniMetric label="TTM 분배율" value={metric(etf.metrics.ttmDistributionYield)} />
        <MiniMetric label="지급 횟수" value={`${etf.metrics.paymentCountTtm ?? "N/A"}회`} />
        <MiniMetric label="총보수" value={metric(etf.metrics.expenseRatio, formatExpenseRatio)} />
      </div>
      <div className="mt-3"><QualityBadge quality={etf.dataQuality} /></div>
    </Link>
  );
}

function MiniMetric({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs font-black text-slate-500">{label}</p><p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p></div>;
}

function ScoreBadge({ value }) {
  return <span className="inline-flex min-w-14 justify-center rounded-xl bg-cyan-600 px-3 py-2 font-black text-white">{Number(value || 0).toFixed(1)}</span>;
}

function QualityBadge({ quality }) {
  const tone = quality?.status === "ANALYZABLE" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : quality?.status === "PARTIAL" ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200" : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200";
  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-black ${tone}`}>{quality?.score ?? 0}점 · {quality?.status || "N/A"}</span>;
}

function assetMatches(value = "", selected) {
  if (selected === "bond") return value.includes("BOND");
  if (selected === "reit") return value === "REIT";
  return value === "EQUITY";
}

function weightLabel(value) {
  return ({
    distributionYield: "분배율", distributionStability: "분배 안정성", paymentRegularity: "지급 규칙성",
    distributionVolatility: "분배 변동성", distributionGrowth3y: "3년 성장", distributionGrowth5y: "5년 성장",
    distributionContinuity: "연속 성장", return3y: "3년 성과", return5y: "5년 성과",
    drawdown: "위험", cost: "비용", liquidity: "유동성",
  }[value] || value);
}

export default EtfRankingPage;
