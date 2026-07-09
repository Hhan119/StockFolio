import { Link, useLocation } from "react-router-dom";
import { isNavigationItemActive, navigationGroups } from "../data/navigation.js";

function MobileNav() {
  const { pathname } = useLocation();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 no-scrollbar dark:border-slate-800 dark:bg-slate-950 lg:hidden">
      {navigationGroups.flatMap((group) => group.items).map((item) => {
        const active = isNavigationItemActive(pathname, item);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={[
              "shrink-0 rounded-2xl px-3 py-2 text-sm font-bold transition-colors",
              active ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
            ].join(" ")}
            key={item.path}
            to={item.path}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileNav;
