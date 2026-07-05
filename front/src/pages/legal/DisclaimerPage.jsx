import Seo from "../../components/Seo.jsx";

function DisclaimerPage() {
  return (
    <article className="mx-auto grid max-w-4xl gap-5">
      <Seo title="면책 고지" description="StockFolio 투자 정보의 한계와 이용자 책임을 안내합니다." path="/disclaimer" />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Disclaimer</p>
        <h2 className="mt-2 text-4xl font-black">면책 고지</h2>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold leading-7 text-slate-600 shadow-sm">
        <p>본 사이트의 정보는 투자 참고용입니다.</p>
        <p className="mt-3">특정 종목의 매수·매도 추천이 아닙니다.</p>
        <p className="mt-3">투자 판단과 책임은 이용자 본인에게 있습니다.</p>
        <p className="mt-3">주가, 배당금, 수익률, 지급일 정보는 실제와 다를 수 있습니다.</p>
        <p className="mt-3">과거 수익률과 과거 배당금은 미래 성과를 보장하지 않습니다.</p>
        <p className="mt-3">해외 자산은 환율, 세금, 거래 시간, 현지 규정의 영향을 받을 수 있습니다.</p>
      </section>
    </article>
  );
}

export default DisclaimerPage;
