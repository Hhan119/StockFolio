import { Link } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { DATA_AS_OF, etfs } from "../../data/publicContent.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

function EtfListPage() {
  return (
    <section className="grid gap-5">
      <Seo title="ETF 검색과 상세 정보" description="배당 ETF, 월배당 ETF, 성장 ETF의 배당률, 분배 주기, 장단점을 확인합니다." path="/etf" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-emerald-700">ETF Directory</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">ETF 검색</h2>
        <p className="mt-2 text-sm font-bold text-slate-600">데이터 기준일: {DATA_AS_OF}. 가격과 배당 정보는 정적 예시 데이터이며 실제 투자 전 운용사와 거래소 자료를 확인하세요.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {etfs.map((etf) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={etf.slug} to={`/etf/${etf.slug}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black text-slate-950">{etf.ticker}</p>
                <h3 className="mt-1 font-black text-slate-800">{etf.name}</h3>
              </div>
              <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{etf.category}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{etf.summary}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500">현재가</p>
                <p className="mt-1 font-black text-slate-950">{formatMoney(etf.price, etf.currency)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500">배당률</p>
                <p className="mt-1 font-black text-emerald-700">{formatPercent(etf.dividendYield)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500">주기</p>
                <p className="mt-1 font-black text-slate-950">{etf.dividendFrequency}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default EtfListPage;
