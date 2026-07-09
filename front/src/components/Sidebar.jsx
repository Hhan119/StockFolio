import { Link, useLocation } from "react-router-dom";
import { isNavigationItemActive, navigationGroups } from "../data/navigation.js";

const groupTones = [
  "bg-cyan-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-slate-400",
];

function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-800/80 bg-slate-950 text-white lg:block">
      <div className="flex h-full flex-col">
        <Link className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 transition hover:border-cyan-500/50 hover:bg-slate-900" to="/">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-base font-black text-slate-950">SF</div>
          <div>
            <p className="text-base font-black leading-none">StockFolio</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">투자 포트폴리오 관리</p>
          </div>
        </Link>

        <nav aria-label="주요 메뉴" className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-5 no-scrollbar">
          <div className="space-y-4">
            {navigationGroups.map((group, groupIndex) => {
              const groupActive = group.items.some((item) => isNavigationItemActive(pathname, item));
              const tone = groupTones[groupIndex % groupTones.length];

              return (
                <section key={group.label}>
                  <div className="mb-1.5 flex items-center gap-2 px-2">
                    <span className={`h-2 w-2 rounded-full ${groupActive ? tone : "bg-slate-800"}`} />
                    <p className={`text-[11px] font-black uppercase tracking-wider ${groupActive ? "text-slate-200" : "text-slate-500"}`}>
                      {group.label}
                    </p>
                  </div>

                  <div className="grid gap-1">
                    {group.items.map((item) => {
                      const active = isNavigationItemActive(pathname, item);

                      return (
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={[
                            "flex min-h-10 items-center justify-between rounded-xl border px-3 py-2 text-sm font-extrabold transition-colors",
                            active
                              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100 shadow-[inset_3px_0_0_rgba(34,211,238,0.9)]"
                              : "border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/80 hover:text-slate-100",
                          ].join(" ")}
                          key={item.path}
                          to={item.path}
                        >
                          <span className="min-w-0 truncate">{item.label}</span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
