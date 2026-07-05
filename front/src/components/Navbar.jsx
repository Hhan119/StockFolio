import { Link, useLocation, useNavigate } from "react-router-dom";
import { navigationGroups } from "../data/navigation.js";
import { useAuthStore } from "../store/authStore.js";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logoutStore = useAuthStore((state) => state.logout);
  const active = navigationGroups
    .flatMap((group) => group.items)
    .filter((item) => location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(`${item.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];

  const logout = () => {
    logoutStore();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:px-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">StockFolio</p>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white">{active?.label || "대시보드"}</h1>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200" to="/blog">
            블로그
          </Link>
          {user ? (
            <>
              <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{user.username}</span>
              <button className="btn-secondary" onClick={logout}>로그아웃</button>
            </>
          ) : (
            <Link className="btn-primary" to="/login">로그인</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
