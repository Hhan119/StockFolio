import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";
import { blogPosts, comparisons, etfs, rankingPages } from "../data/publicContent.js";

const quickLinks = [
  { label: "ETF 배당 계산기", to: "/calculators/etf-dividend", description: "보유 수량 기준 세전/세후 배당금을 계산합니다." },
  { label: "월배당 계산기", to: "/calculators/monthly-dividend", description: "목표 월 배당금을 위한 필요 투자금을 계산합니다." },
  { label: "ETF 상세", to: "/etf", description: "배당률, 분배 주기, 장단점을 정리합니다." },
  { label: "ETF 비교", to: "/etf/compare", description: "투자 목적별로 ETF 두 개를 비교합니다." },
];

function HomePage() {
  return (
    <section className="grid gap-5">
      <Seo title="ETF 배당 투자 계산기와 포트폴리오 관리" description="ETF 배당 계산기, 월배당 계산기, ETF 상세/비교/랭킹, 배당 캘린더를 제공하는 투자 정보 플랫폼입니다." path="/" />

      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm lg:p-8">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">StockFolio</p>
        <h2 className="mt-2 max-w-4xl text-3xl font-black leading-tight lg:text-5xl">ETF 배당 투자 정보를 계산하고 비교하는 공개 플랫폼</h2>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
          계산기는 프론트에서 즉시 동작하고, ETF 상세/비교/랭킹/배당 캘린더는 정적 기준 데이터를 함께 제공합니다.
          개인 포트폴리오는 로그인 후 관리하고, 공개 영역은 백엔드 장애와 분리해 안정적으로 볼 수 있게 구성했습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950" to="/calculators/etf-dividend">계산기 시작</Link>
          <Link className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-black text-white" to="/etf">ETF 둘러보기</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={link.to} to={link.to}>
            <h3 className="font-black text-slate-950">{link.label}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{link.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">ETF</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">상세 페이지 {etfs.length}개</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">운용사, 배당률, 분배 주기, 구성 종목, 장단점, 적합 투자자를 함께 정리했습니다.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {etfs.slice(0, 8).map((etf) => (
              <Link className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700" key={etf.slug} to={`/etf/${etf.slug}`}>{etf.ticker}</Link>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-cyan-700">Compare</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">ETF 비교 {comparisons.length}개</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">단순 수치 비교보다 투자 목적에 따라 어떤 차이가 중요한지 설명합니다.</p>
          <Link className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white" to="/etf/compare">비교 목록 보기</Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-rose-700">Guide</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">블로그 글 {blogPosts.length}개</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">배당률, 월배당, FIRE, 세금, 리밸런싱 같은 기초 주제를 공개 콘텐츠로 제공합니다.</p>
          <Link className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white" to="/blog">블로그 보기</Link>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Ranking</p>
            <h3 className="text-2xl font-black text-slate-950">공개 랭킹 페이지</h3>
          </div>
          <p className="text-sm font-bold text-slate-500">데이터 기준일과 산정 기준을 함께 표시합니다.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {rankingPages.map((ranking) => (
            <Link className="rounded-xl bg-slate-50 p-4 text-sm font-black text-slate-800 hover:bg-slate-900 hover:text-white" key={ranking.slug} to={`/etf/rankings/${ranking.slug}`}>
              {ranking.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomePage;
