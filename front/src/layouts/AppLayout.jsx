import { Outlet } from "react-router-dom";
import MobileNav from "../components/MobileNav.jsx";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Navbar />
          <MobileNav />
          <div className="p-4 lg:p-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
