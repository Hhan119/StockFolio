import Seo from "../../components/Seo.jsx";

function AboutPage() {
  return (
    <article className="mx-auto grid max-w-4xl gap-5">
      <Seo title="서비스 소개" description="StockFolio의 목적, 공개 콘텐츠, 회원 기능을 소개합니다." path="/about" />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">About</p>
        <h2 className="mt-2 text-4xl font-black">StockFolio 소개</h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">ETF 배당 투자 정보와 개인 포트폴리오 관리를 한 곳에서 다루는 투자 정보 플랫폼입니다.</p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-black text-slate-950">서비스 방향</h3>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
          공개 영역에서는 ETF 계산기, ETF 상세/비교, 배당 랭킹, 배당 캘린더, 투자 가이드를 제공합니다.
          회원 영역에서는 사용자가 직접 보유 종목을 등록하고 평가금액, 수익률, 예상 배당금, 개인 배당 캘린더를 확인할 수 있도록 합니다.
        </p>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
          StockFolio의 콘텐츠는 투자 판단을 돕기 위한 참고 자료이며, 특정 종목의 매수 또는 매도 추천을 목적으로 하지 않습니다.
        </p>
      </section>
    </article>
  );
}

export default AboutPage;
