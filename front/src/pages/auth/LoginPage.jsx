import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormField from "../../components/ui/FormField.jsx";
import StateMessage from "../../components/ui/StateMessage.jsx";
import { authService } from "../../services/authService.js";
import { useAuthStore } from "../../store/authStore.js";
import { validateLogin, validateSignup } from "../../utils/validation.js";

const promoItems = [
  { icon: "PF", title: "포트폴리오 빌더", text: "종목을 담고 투자 목적별 포트폴리오로 저장합니다." },
  { icon: "DV", title: "배당 캘린더", text: "보유 수량 기준 예상 배당 흐름을 월별로 확인합니다." },
  { icon: "AI", title: "분석 리포트", text: "수익률, 배당, 리밸런싱 관점으로 포트폴리오를 점검합니다." },
];

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const storeError = useAuthStore((state) => state.error);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", email: "" });
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, message: "", available: null });

  const checkUsername = async (username = form.username) => {
    if (mode !== "signup" || username.trim().length < 4) return;
    setUsernameStatus({ checking: true, message: "아이디 중복 확인 중입니다.", available: null });
    try {
      const data = await authService.checkUsername(username.trim());
      setUsernameStatus({
        checking: false,
        available: data.available,
        message: data.available ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다.",
      });
      if (!data.available) setErrors((current) => ({ ...current, username: "이미 사용 중인 아이디입니다." }));
    } catch {
      setUsernameStatus({ checking: false, available: null, message: "아이디 중복 확인에 실패했습니다." });
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = mode === "signup" ? validateSignup(form) : validateLogin(form);
    if (mode === "signup" && usernameStatus.available === false) nextErrors.username = "이미 사용 중인 아이디입니다.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      if (mode === "signup") await signup(form);
      else await login({ username: form.username, password: form.password });
      navigate(location.state?.from || "/portfolio/my");
    } catch {
      // Store handles the visible error message.
    }
  };

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    if (field === "username") setUsernameStatus({ checking: false, message: "", available: null });
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-950 sm:px-6 lg:px-10">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-sm lg:grid-cols-[1.25fr_0.95fr]">
        <aside className="relative hidden bg-slate-950 p-9 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.20),transparent_26%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <Link to="/" className="inline-flex items-center gap-3 text-white">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500 text-sm font-black text-slate-950">SF</span>
              <span>
                <strong className="block text-2xl font-black text-white">StockFolio</strong>
                <small className="font-bold text-slate-200">주식과 ETF 포트폴리오 관리</small>
              </span>
            </Link>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
                <div className="border-b border-slate-800 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Portfolio Intelligence</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-white">내 자산과 배당 흐름을 한 화면에서 관리하세요.</h2>
                  <p className="mt-3 text-sm font-bold leading-6 text-slate-200">
                    종목 검색, 보유 수량 등록, 현재가 갱신, 월별 배당 캘린더까지 투자 현황을 빠르게 정리합니다.
                  </p>
                </div>
                <div className="grid gap-3 p-5">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-sm font-bold text-slate-200">총 평가금액</p>
                      <strong className="mt-1 block text-2xl font-black text-white">18,420,000원</strong>
                      <span className="mt-2 inline-block text-sm font-black text-cyan-300">+5.17%</span>
                    </div>
                    <div className="grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#22d3ee_0_48%,#34d399_48%_72%,#a78bfa_72%_100%)]">
                      <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">비중</div>
                    </div>
                  </div>
                  {[
                    ["삼성전자", "국내", "45%"],
                    ["SCHD", "해외 ETF", "31%"],
                    ["Apple", "해외", "24%"],
                  ].map(([name, market, ratio]) => (
                    <div className="grid grid-cols-[1fr_auto] items-center rounded-xl bg-slate-950 p-3" key={name}>
                      <div>
                        <strong className="block text-sm text-white">{name}</strong>
                        <span className="text-xs font-bold text-slate-300">{market}</span>
                      </div>
                      <span className="font-black text-cyan-300">{ratio}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="font-black text-white">월배당 캘린더</h3>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                      <div className={`rounded-xl p-3 text-center text-xs font-black ${month === 7 ? "bg-cyan-500 text-slate-950" : "bg-slate-950 text-slate-200"}`} key={month}>
                        {month}월
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm font-bold text-slate-200">예상 월 배당</p>
                  <strong className="mt-2 block text-3xl font-black text-cyan-300">142,800원</strong>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">보유 수량과 배당 주기를 기준으로 자동 계산합니다.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {promoItems.map((item) => (
                <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4" key={item.title}>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/15 text-xs font-black text-cyan-300">{item.icon}</span>
                  <h2 className="mt-3 text-sm font-black text-white">{item.title}</h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid content-center bg-white p-6 text-slate-950 sm:p-9 xl:p-12">
          <Link to="/" className="mb-8 inline-flex items-center gap-3 text-slate-950 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-sm font-black text-slate-950">SF</span>
            <span>
              <strong className="block text-2xl font-black text-slate-950">StockFolio</strong>
              <small className="font-bold text-slate-500">주식과 ETF 포트폴리오 관리</small>
            </span>
          </Link>

          <div>
            <p className="text-sm font-black uppercase tracking-wider text-cyan-700">Welcome</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">{mode === "login" ? "로그인" : "회원가입"}</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">포트폴리오 저장과 분석 기능은 로그인 후 이용할 수 있습니다.</p>
          </div>

          <div className="my-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button className={`rounded-2xl py-2 text-sm font-black ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`} type="button" onClick={() => setMode("login")}>로그인</button>
            <button className={`rounded-2xl py-2 text-sm font-black ${mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`} type="button" onClick={() => setMode("signup")}>회원가입</button>
          </div>

          <form className="grid gap-3" onSubmit={submit}>
            <FormField label="아이디" placeholder="4자 이상" value={form.username} error={errors.username} onBlur={() => checkUsername()} onChange={(event) => update("username", event.target.value)} />
            {mode === "signup" && usernameStatus.message && (
              <p className={`rounded-xl px-3 py-2 text-xs font-bold ${usernameStatus.available ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-700"}`}>{usernameStatus.message}</p>
            )}
            <FormField label="비밀번호" placeholder="영문과 특수문자 포함 7자 이상" type="password" value={form.password} error={errors.password} onChange={(event) => update("password", event.target.value)} />
            {mode === "signup" && (
              <FormField label="이메일" placeholder="stockfolio@example.com" type="email" value={form.email} error={errors.email} onChange={(event) => update("email", event.target.value)} />
            )}
            <button className="min-h-12 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500" disabled={loading || usernameStatus.checking}>
              {loading ? "처리 중..." : mode === "login" ? "로그인" : "계정 만들기"}
            </button>
            <StateMessage type="error">{storeError}</StateMessage>
          </form>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
