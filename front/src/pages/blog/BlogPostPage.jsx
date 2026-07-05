import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { getPost } from "../../data/publicContent.js";

function BlogPostPage() {
  const { slug } = useParams();
  const post = getPost(slug);

  if (!post) return <Navigate to="/404" replace />;

  return (
    <article className="mx-auto grid max-w-4xl gap-5">
      <Seo title={post.title} description={post.summary} path={`/blog/${post.slug}`} />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">{post.category} · {post.publishedAt}</p>
        <h2 className="mt-2 text-4xl font-black leading-tight">{post.title}</h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">{post.summary}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {post.sections.map((section) => (
          <p className="mb-5 text-base font-semibold leading-8 text-slate-700" key={section}>{section}</p>
        ))}
        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <h3 className="text-xl font-black text-slate-950">장점과 주의사항</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            장점은 투자 판단에 필요한 기준을 세울 수 있다는 점입니다. 단점은 모든 계산과 예시가 가정에 기반한다는 점입니다.
            실제 투자 전에는 최신 운용사 자료, 세금, 환율, 자신의 위험 감내 수준을 확인해야 합니다.
          </p>
        </div>
        <div className="mt-6">
          <h3 className="text-xl font-black text-slate-950">관련 계산기</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.relatedCalculators.map((to) => (
              <Link className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white" key={to} to={to}>{to.split("/").pop()}</Link>
            ))}
          </div>
        </div>
        <p className="mt-6 rounded-xl bg-rose-50 p-4 text-sm font-bold leading-7 text-rose-800">
          본 글은 투자 참고용 정보이며 특정 종목의 매수·매도 추천이 아닙니다. 투자 판단과 책임은 이용자 본인에게 있습니다.
        </p>
      </div>
    </article>
  );
}

export default BlogPostPage;
