import { Link } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import { blogPosts } from "../../data/publicContent.js";

function BlogPage() {
  return (
    <section className="grid gap-5">
      <Seo title="투자 가이드 블로그" description="배당 투자, ETF, FIRE, 은퇴 준비, 적립식 투자 관련 공개 가이드를 제공합니다." path="/blog" />
      <PageHeader eyebrow="blog" title="블로그" description="배당 투자, ETF, FIRE, 은퇴 준비와 관련된 공개 가이드 콘텐츠입니다." />
      <div className="grid gap-3 xl:grid-cols-3">
        {blogPosts.map((post) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={post.slug} to={`/blog/${post.slug}`}>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">{post.category}</p>
            <h3 className="mt-2 text-lg font-black text-slate-950">{post.title}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{post.summary}</p>
            <p className="mt-4 text-xs font-bold text-slate-500">{post.publishedAt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default BlogPage;
