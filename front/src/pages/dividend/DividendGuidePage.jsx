import { Link } from "react-router-dom";
import Seo from "../../components/Seo.jsx";

const sections = [
  {
    title: "배당률이란 무엇인가",
    body: "배당률은 보통 1년 동안 받을 것으로 예상되는 배당금 또는 분배금을 현재 가격으로 나눈 값입니다. 가격이 하락하면 배당률이 높아 보일 수 있으므로 단순히 숫자가 높다는 이유만으로 좋은 상품이라고 볼 수 없습니다.",
  },
  {
    title: "분배금과 배당금의 차이",
    body: "ETF는 보유 자산에서 발생한 배당, 이자, 옵션 프리미엄 등을 투자자에게 분배금 형태로 지급할 수 있습니다. 일반 주식의 배당금과 투자자 현금흐름 측면에서는 비슷하지만 재원과 지속성은 ETF 전략에 따라 다릅니다.",
  },
  {
    title: "월배당과 분기배당",
    body: "월배당은 현금흐름 관리가 편하지만 안정성을 보장하지 않습니다. 분기배당은 지급 빈도가 낮아도 장기 배당 성장이나 총수익률이 더 좋을 수 있습니다.",
  },
  {
    title: "세전과 세후 배당",
    body: "실제로 사용할 수 있는 금액은 세후 배당금입니다. 해외 ETF는 원천징수세와 환율 영향을 받고, 국내 상장 해외 ETF는 상품 구조와 계좌 유형에 따라 과세 방식이 달라질 수 있습니다.",
  },
];

function DividendGuidePage() {
  return (
    <article className="grid gap-5">
      <Seo title="배당금 기초 가이드" description="배당률, 분배금, 월배당 ETF, 세전/세후 배당금의 차이를 설명합니다." path="/dividends/guide" />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Dividend Guide</p>
        <h2 className="mt-2 text-4xl font-black">배당금 기초 가이드</h2>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300">ETF 배당 투자를 시작하기 전에 배당률, 분배금, 지급 주기, 세금, 환율을 함께 이해해야 합니다.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={section.title}>
            <h3 className="text-2xl font-black text-slate-950">{section.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-2xl font-black text-slate-950">함께 보면 좋은 페이지</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white" to="/calculators/etf-dividend">ETF 배당 계산기</Link>
          <Link className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700" to="/calculators/monthly-dividend">월배당 계산기</Link>
          <Link className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700" to="/etf/rankings/monthly-dividend">월배당 ETF 순위</Link>
        </div>
      </div>
    </article>
  );
}

export default DividendGuidePage;
