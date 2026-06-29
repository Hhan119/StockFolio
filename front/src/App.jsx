import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import EtfDividendCalculator from "./pages/calculators/EtfDividendCalculator.jsx";
import FireCalculator from "./pages/calculators/FireCalculator.jsx";
import RetirementCalculator from "./pages/calculators/RetirementCalculator.jsx";
import DcaCalculator from "./pages/calculators/DcaCalculator.jsx";
import AveragePriceCalculator from "./pages/calculators/AveragePriceCalculator.jsx";
import MyPortfolioPage from "./pages/portfolio/MyPortfolioPage.jsx";
import DividendGrowthTracker from "./pages/portfolio/DividendGrowthTracker.jsx";
import MonthlyDividendCalendar from "./pages/portfolio/MonthlyDividendCalendar.jsx";
import RebalancingPage from "./pages/portfolio/RebalancingPage.jsx";
import PortfolioAnalysisPage from "./pages/analysis/PortfolioAnalysisPage.jsx";
import DividendAnalysisPage from "./pages/analysis/DividendAnalysisPage.jsx";
import AiAnalysisPage from "./pages/analysis/AiAnalysisPage.jsx";
import BlogPage from "./pages/blog/BlogPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/portfolio/my" replace />} />
          <Route path="/calculators/etf-dividend" element={<EtfDividendCalculator />} />
          <Route path="/calculators/average-price" element={<AveragePriceCalculator />} />
          <Route path="/calculators/fire" element={<FireCalculator />} />
          <Route path="/calculators/retirement" element={<RetirementCalculator />} />
          <Route path="/calculators/dca" element={<DcaCalculator />} />
          <Route path="/portfolio/monthly-calendar" element={<MonthlyDividendCalendar />} />
          <Route path="/analysis/dividend" element={<DividendAnalysisPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/portfolio/my" element={<MyPortfolioPage />} />
            <Route path="/portfolio/dividend-growth" element={<DividendGrowthTracker />} />
            <Route path="/portfolio/rebalancing" element={<Navigate to="/analysis/rebalancing" replace />} />
            <Route path="/analysis/portfolio" element={<PortfolioAnalysisPage />} />
            <Route path="/analysis/rebalancing" element={<RebalancingPage />} />
            <Route path="/analysis/ai" element={<AiAnalysisPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
