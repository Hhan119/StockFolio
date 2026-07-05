import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import { DATA_AS_OF, getEtf, getRanking, isDomesticEtf, matchesMarketFilter } from "../../data/publicContent.js";
import { formatPercent } from "../../utils/format.js";

function EtfRankingPage() {
  const { slug } = useParams();
  const [marketFilter, setMarketFilter] = useState("all");
  const ranking = getRanking(slug);

  const rankingEtfs = useMemo(() => (ranking ? ranking.etfSlugs.map(getEtf).filter(Boolean) : []), [ranking]);
  const counts = useMemo(
    () => ({
      all: rankingEtfs.length,
      domestic: rankingEtfs.filter(isDomesticEtf).length,
      overseas: rankingEtfs.filter((etf) => !isDomesticEtf(etf)).length,
    }),
    [rankingEtfs],
  );
  const rankedEtfs = useMemo(
    () => rankingEtfs.filter((etf) => matchesMarketFilter(etf, marketFilter)).sort((a, b) => b.dividendYield - a.dividendYield),
    [marketFilter, rankingEtfs],
  );

  if (!ranking) return <Navigate to="/404" replace />;

  return (
    <section className="grid gap-5">
      <Seo title={ranking.title} description={ranking.description} path={`/etf/rankings/${ranking.slug}`} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">ETF Ranking</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{ranking.title}</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">{ranking.description}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">데이터 기준일: {DATA_AS_OF} · 배당률은 세전 기준 · 과거 배당금은 미래 배당금을 보장하지 않습니다.</p>
          </div>
          <MarketSegmentedControl counts={counts} value={marketFilter} onChange={setMarketFilter} />
        </div>
      </div>
      <div className="grid gap-3">
        {rankedEtfs.map((etf, index) => (
          <Link className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md lg:grid-cols-[72px_1fr_160px_160px]" key={etf.slug} to={`/etf/${etf.slug}`}>
            <div className="text-3xl font-black text-slate-300">#{index + 1}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-slate-950">{etf.ticker} · {etf.name}</h3>
                <span className={["rounded-xl px-3 py-1 text-xs font-black", isDomesticEtf(etf) ? "bg-emerald-50 text-emerald-700" : "bg-cyan-50 text-cyan-700"].join(" ")}>
                  {isDomesticEtf(etf) ? "국내" : "해외"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">{etf.category} · {etf.suitableFor}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-500">배당률</p><p className="font-black text-emerald-700">{formatPercent(etf.dividendYield)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-500">배당 주기</p><p className="font-black text-slate-950">{etf.dividendFrequency}</p></div>
          </Link>
        ))}
      </div>
      {rankedEtfs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">선택한 시장의 순위 데이터가 없습니다</p>
          <p className="mt-2 text-sm font-bold text-slate-500">전체를 선택하거나 다른 순위 페이지를 확인해보세요.</p>
        </div>
      )}
    </section>
  );
}

export default EtfRankingPage;
