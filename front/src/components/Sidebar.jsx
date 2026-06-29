import { NavLink } from "react-router-dom";
import { navigationGroups } from "../data/navigation.js";

function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-950 px-5 py-6 text-white lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-sm font-black">SF</div>
        <div>
          <p className="text-lg font-black leading-tight">StockFolio</p>
          <p className="text-xs font-semibold text-slate-400">Dividend investing OS</p>
        </div>
      </div>

      <nav className="space-y-6">
        {navigationGroups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-2 text-xs font-black uppercase tracking-wider text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "block rounded-2xl px-3 py-2 text-sm font-bold transition",
                      isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
