import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { DATA_AS_OF, getEtf, getRanking } from "../../data/publicContent.js";
import { formatPercent } from "../../utils/format.js";

function EtfRankingPage() {
  const { slug } = useParams();
  const ranking = getRanking(slug);
  if (!ranking) return <Navigate to="/404" replace />;

  const rankedEtfs = ranking.etfSlugs.map(getEtf).filter(Boolean).sort((a, b) => b.dividendYield - a.dividendYield);

  return (
    <section className="grid gap-5">
      <Seo title={ranking.title} description={ranking.description} path={`/etf/rankings/${ranking.slug}`} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-emerald-700">ETF Ranking</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">{ranking.title}</h2>
        <p className="mt-2 text-sm font-bold text-slate-600">{ranking.description}</p>
        <p className="mt-2 text-xs font-bold text-slate-500">데이터 기준일: {DATA_AS_OF} · 배당률은 세전 기준 · 과거 배당금은 미래 배당금을 보장하지 않습니다.</p>
      </div>
      <div className="grid gap-3">
        {rankedEtfs.map((etf, index) => (
          <Link className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md lg:grid-cols-[72px_1fr_160px_160px]" key={etf.slug} to={`/etf/${etf.slug}`}>
            <div className="text-3xl font-black text-slate-300">#{index + 1}</div>
            <div>
              <h3 className="text-xl font-black text-slate-950">{etf.ticker} · {etf.name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">{etf.category} · {etf.suitableFor}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-500">배당률</p><p className="font-black text-emerald-700">{formatPercent(etf.dividendYield)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-500">배당 주기</p><p className="font-black text-slate-950">{etf.dividendFrequency}</p></div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default EtfRankingPage;
