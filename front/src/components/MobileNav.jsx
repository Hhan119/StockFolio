import { NavLink } from "react-router-dom";
import { navigationGroups } from "../data/navigation.js";

function MobileNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 no-scrollbar dark:border-slate-800 dark:bg-slate-950 lg:hidden">
      {navigationGroups.flatMap((group) => group.items).map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            [
              "shrink-0 rounded-2xl px-3 py-2 text-sm font-bold",
              isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
            ].join(" ")
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileNav;
