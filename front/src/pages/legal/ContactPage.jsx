import Seo from "../../components/Seo.jsx";

function ContactPage() {
  return (
    <article className="mx-auto grid max-w-4xl gap-5">
      <Seo title="문의하기" description="StockFolio 오류, 데이터 수정, 제휴 문의 안내입니다." path="/contact" />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Contact</p>
        <h2 className="mt-2 text-4xl font-black">문의하기</h2>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-black text-slate-950">문의 채널</h3>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
          서비스 오류, 데이터 수정 요청, 제휴 문의는 아래 이메일로 보내주세요. 문의 시 페이지 주소, 사용 환경, 재현 방법을 함께 보내주시면 확인이 빠릅니다.
        </p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm font-black text-slate-500">이메일</p>
          <p className="mt-1 text-xl font-black text-slate-950">contact@stockfolio.example</p>
        </div>
      </section>
    </article>
  );
}

export default ContactPage;
