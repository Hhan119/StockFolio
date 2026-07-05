import Seo from "../../components/Seo.jsx";

function TermsPage() {
  return (
    <article className="mx-auto grid max-w-4xl gap-5">
      <Seo title="이용약관" description="StockFolio 서비스 이용 조건과 책임 범위를 안내합니다." path="/terms" />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Terms</p>
        <h2 className="mt-2 text-4xl font-black">이용약관</h2>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold leading-7 text-slate-600 shadow-sm">
        <h3 className="text-2xl font-black text-slate-950">서비스 이용</h3>
        <p className="mt-3">StockFolio는 ETF 정보, 계산기, 포트폴리오 관리 기능을 제공합니다. 사용자는 관련 법령과 본 약관을 준수해야 하며, 타인의 계정을 무단으로 사용하거나 서비스 운영을 방해해서는 안 됩니다.</p>
        <h3 className="mt-6 text-2xl font-black text-slate-950">콘텐츠와 데이터</h3>
        <p className="mt-3">사이트의 가격, 배당금, 수익률, 지급일 데이터는 지연되거나 실제와 다를 수 있습니다. 서비스는 정보의 정확성과 완전성을 보장하지 않습니다.</p>
        <h3 className="mt-6 text-2xl font-black text-slate-950">서비스 변경</h3>
        <p className="mt-3">운영상 필요에 따라 기능, 화면, 데이터 제공 방식이 변경될 수 있습니다. 중요한 변경사항은 가능한 범위에서 공지합니다.</p>
      </section>
    </article>
  );
}

export default TermsPage;
