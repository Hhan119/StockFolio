import { Outlet } from "react-router-dom";
import MobileNav from "../components/MobileNav.jsx";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";

function AppLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen min-w-0 overflow-x-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden" data-app-scroll>
          <Navbar />
          <MobileNav />
          <div className="min-w-0 max-w-full overflow-x-hidden p-4 lg:p-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
