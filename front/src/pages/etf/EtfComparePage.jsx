import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { AdSlot, EmptyState, ErrorState, EtfCompareTable, InvestmentDisclaimer, SkeletonState } from "../../components/etf/index.jsx";
import { etfMockApi } from "../../services/etfMockApi.js";

function EtfComparePage() {
  const { slug } = useParams();
  const query = useQuery({
    queryKey: ["etf-comparison-preset", slug],
    queryFn: () => etfMockApi.getComparisonPreset(slug),
    retry: false,
  });

  if (query.isLoading) return <SkeletonState rows={3} />;
  if (query.isError && query.error?.message?.includes("찾을 수 없습니다")) return <Navigate to="/404" replace />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;

  const comparison = query.data?.data;
  if (!comparison) return <EmptyState title="비교 데이터가 없습니다" />;

  return (
    <article className="grid gap-5">
      <Seo title={comparison.title} description={comparison.summary} path={`/etf/compare/${comparison.slug}`} />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">ETF Compare</p>
        <h2 className="mt-2 text-4xl font-black">{comparison.title}</h2>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300">{comparison.summary}</p>
        <Link className="mt-4 inline-flex rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950" to={`/etf/compare?tickers=${comparison.etfs.map((etf) => etf.ticker).join(",")}`}>
          비교 도구에서 열기
        </Link>
      </div>
      <EtfCompareTable etfs={comparison.etfs} />
      <AdSlot />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-2xl font-black text-slate-950 dark:text-white">비교 해석</h3>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
          각 ETF는 투자 대상, 분배 주기, 비용, 위험 지표가 다릅니다. 차이가 큰 항목은 투자 목적에 따라 중요도가 달라질 수 있으며, 좋음/나쁨으로 단정하지 않습니다.
        </p>
      </section>
      <InvestmentDisclaimer />
    </article>
  );
}

export default EtfComparePage;
