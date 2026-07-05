import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { DATA_AS_OF, getEtf } from "../../data/publicContent.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

function EtfDetailPage() {
  const { slug } = useParams();
  const etf = getEtf(slug);

  if (!etf) return <Navigate to="/404" replace />;

  const annualDividend = etf.latestDividend * (etf.dividendFrequency === "월" ? 12 : etf.dividendFrequency === "반기" ? 2 : etf.dividendFrequency === "연" ? 1 : 4);

  return (
    <article className="grid gap-5">
      <Seo title={`${etf.ticker} ETF 상세`} description={`${etf.name}의 배당률, 배당 주기, 구성 종목, 장점과 단점을 정리했습니다.`} path={`/etf/${etf.slug}`} />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-cyan-300">{etf.market} · {etf.provider}</p>
            <h2 className="mt-2 text-4xl font-black">{etf.ticker}</h2>
            <p className="mt-2 text-lg font-bold text-slate-300">{etf.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-400">현재가</p><p className="font-black">{formatMoney(etf.price, etf.currency)}</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-400">배당률</p><p className="font-black text-cyan-300">{formatPercent(etf.dividendYield)}</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-400">보수</p><p className="font-black">{formatPercent(etf.expenseRatio)}</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-400">배당 주기</p><p className="font-black">{etf.dividendFrequency}</p></div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">ETF 개요</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{etf.summary}</p>
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-700">
            배당률은 현재 가격과 최근 분배금을 바탕으로 해석해야 하며, 분배금은 ETF 운용 성과와 시장 상황에 따라 달라질 수 있습니다.
            단순 API 표보다 투자자가 확인해야 할 구조, 장점, 단점을 함께 보는 것이 중요합니다.
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">배당 정보</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">최근 1회 배당금</p><p className="mt-1 font-black">{formatMoney(etf.latestDividend, etf.currency)}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">추정 연 배당금</p><p className="mt-1 font-black">{formatMoney(annualDividend, etf.currency)}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">배당 월</p><p className="mt-1 font-black">{etf.distributionMonths.join(", ")}월</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">데이터 기준일</p><p className="mt-1 font-black">{DATA_AS_OF}</p></div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">주요 구성 종목</h3>
          <div className="mt-3 grid gap-2">
            {etf.holdings.map((holding) => <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700" key={holding}>{holding}</span>)}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">섹터 비중</h3>
          <div className="mt-3 grid gap-3">
            {etf.sectors.map(([sector, weight]) => (
              <div key={sector}>
                <div className="flex justify-between text-sm font-black"><span>{sector}</span><span>{weight}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-cyan-600" style={{ width: `${weight}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">적합한 투자자</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{etf.suitableFor}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {etf.similar.map((item) => <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700" key={item}>{item}</span>)}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <h3 className="text-xl font-black text-emerald-950">장점</h3>
          <ul className="mt-3 grid gap-2 text-sm font-bold text-emerald-900">{etf.pros.map((item) => <li key={item}>· {item}</li>)}</ul>
        </section>
        <section className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
          <h3 className="text-xl font-black text-rose-950">주의할 점</h3>
          <ul className="mt-3 grid gap-2 text-sm font-bold text-rose-900">{etf.cons.map((item) => <li key={item}>· {item}</li>)}</ul>
        </section>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-black text-slate-950">관련 계산기와 페이지</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white" to="/calculators/etf-dividend">ETF 배당 계산기</Link>
          <Link className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700" to="/dividends/calendar">배당 캘린더</Link>
          <Link className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700" to="/etf/compare">ETF 비교</Link>
        </div>
        <p className="mt-4 text-xs font-bold leading-6 text-slate-500">본 페이지의 정보는 투자 참고용이며 특정 종목 매수·매도 추천이 아닙니다. 주가, 배당금, 수익률, 지급일 정보는 실제와 다를 수 있습니다.</p>
      </div>
    </article>
  );
}

export default EtfDetailPage;
