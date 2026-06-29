import { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { api } from "../../services/api.js";

function BlogPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get("/api/blog/posts").then((response) => setPosts(response.data));
  }, []);

  return (
    <section>
      <PageHeader eyebrow="blog" title="블로그" description="배당 투자, FIRE, 은퇴 준비와 관련된 콘텐츠를 관리합니다." />
      <div className="grid gap-3 xl:grid-cols-3">
        {posts.map((post) => (
          <article className="metric-card" key={post.id}>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">{post.category}</p>
            <h3 className="mt-2 text-lg font-black">{post.title}</h3>
            <p className="mt-2 text-sm font-medium text-slate-600">{post.summary}</p>
            <p className="mt-4 text-xs font-bold text-slate-500">{post.publishedAt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BlogPage;
