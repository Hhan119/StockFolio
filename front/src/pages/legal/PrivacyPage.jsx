import Seo from "../../components/Seo.jsx";

function PrivacyPage() {
  return (
    <article className="mx-auto grid max-w-4xl gap-5">
      <Seo title="개인정보처리방침" description="StockFolio 개인정보 수집, 이용, 보관, Google 광고 쿠키 안내입니다." path="/privacy" />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Privacy</p>
        <h2 className="mt-2 text-4xl font-black">개인정보처리방침</h2>
        <p className="mt-3 text-sm font-semibold text-slate-300">시행일: 2026-07-05</p>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold leading-7 text-slate-600 shadow-sm">
        <h3 className="text-2xl font-black text-slate-950">수집하는 정보</h3>
        <p className="mt-3">회원가입과 로그인 과정에서 아이디, 이메일, 비밀번호 해시, OAuth 로그인 식별자 등 서비스 제공에 필요한 정보를 처리할 수 있습니다. 포트폴리오 기능 사용 시 사용자가 입력한 보유 종목, 수량, 평균단가, 메모가 저장될 수 있습니다.</p>
        <h3 className="mt-6 text-2xl font-black text-slate-950">이용 목적</h3>
        <p className="mt-3">수집한 정보는 로그인, 포트폴리오 저장, 보유 종목 분석, 배당 캘린더 계산, 서비스 안정화, 부정 이용 방지, 문의 대응에 사용됩니다.</p>
        <h3 className="mt-6 text-2xl font-black text-slate-950">Google 광고와 쿠키</h3>
        <p className="mt-3">Google 및 서드 파티 공급업체는 쿠키를 사용해 사용자가 이전에 본 사이트 또는 다른 웹사이트에 방문한 기록을 바탕으로 광고를 게재할 수 있습니다. Google의 광고 쿠키 사용으로 Google과 파트너는 사용자의 본 사이트 방문 및 인터넷상의 다른 사이트 방문 기록을 토대로 광고를 게재할 수 있습니다.</p>
        <p className="mt-3">사용자는 Google 광고 설정에서 개인 맞춤 광고를 거부할 수 있으며, 일부 서드 파티 공급업체의 개인 맞춤 광고 쿠키 사용은 관련 광고 선택 도구를 통해 거부할 수 있습니다. 브라우저 설정에서 쿠키 저장을 제한하거나 삭제할 수도 있습니다.</p>
        <h3 className="mt-6 text-2xl font-black text-slate-950">보관과 파기</h3>
        <p className="mt-3">회원 정보는 서비스 이용 기간 동안 보관하며, 탈퇴 또는 목적 달성 시 관련 법령과 내부 정책에 따라 삭제합니다. 단, 분쟁 대응이나 법적 의무 이행을 위해 필요한 정보는 일정 기간 보관될 수 있습니다.</p>
        <h3 className="mt-6 text-2xl font-black text-slate-950">문의</h3>
        <p className="mt-3">개인정보 관련 문의는 contact@stockfolio.example 로 접수할 수 있습니다.</p>
      </section>
    </article>
  );
}

export default PrivacyPage;
