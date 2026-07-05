import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

function NotFoundPage() {
  return (
    <section className="grid min-h-[60vh] place-items-center">
      <Seo title="페이지를 찾을 수 없습니다" description="요청한 페이지를 찾을 수 없습니다." path="/404" />
      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-700">404</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">페이지를 찾을 수 없습니다</h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">주소가 변경되었거나 삭제된 페이지일 수 있습니다. 공개 계산기나 ETF 목록으로 이동해 다시 확인해보세요.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link className="btn-dark text-sm" to="/">홈</Link>
          <Link className="btn-muted text-sm" to="/etf">ETF 목록</Link>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
