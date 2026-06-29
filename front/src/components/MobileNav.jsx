import { NavLink } from "react-router-dom";
import { navigationGroups } from "../data/navigation.js";

function MobileNav() {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 no-scrollbar lg:hidden">
      {navigationGroups.flatMap((group) => group.items).map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            [
              "shrink-0 rounded-2xl px-3 py-2 text-sm font-bold",
              isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700",
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
