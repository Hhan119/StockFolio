import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import EtfDividendCalculator from "./pages/calculators/EtfDividendCalculator.jsx";
import MonthlyDividendCalculator from "./pages/calculators/MonthlyDividendCalculator.jsx";
import FireCalculator from "./pages/calculators/FireCalculator.jsx";
import RetirementCalculator from "./pages/calculators/RetirementCalculator.jsx";
import DcaCalculator from "./pages/calculators/DcaCalculator.jsx";
import AveragePriceCalculator from "./pages/calculators/AveragePriceCalculator.jsx";
import CompoundCalculator from "./pages/calculators/CompoundCalculator.jsx";
import DividendReinvestmentCalculator from "./pages/calculators/DividendReinvestmentCalculator.jsx";
import MyPortfolioPage from "./pages/portfolio/MyPortfolioPage.jsx";
import DividendGrowthTracker from "./pages/portfolio/DividendGrowthTracker.jsx";
import MonthlyDividendCalendar from "./pages/portfolio/MonthlyDividendCalendar.jsx";
import RebalancingPage from "./pages/portfolio/RebalancingPage.jsx";
import PortfolioAnalysisPage from "./pages/analysis/PortfolioAnalysisPage.jsx";
import DividendAnalysisPage from "./pages/analysis/DividendAnalysisPage.jsx";
import AiAnalysisPage from "./pages/analysis/AiAnalysisPage.jsx";
import BlogPage from "./pages/blog/BlogPage.jsx";
import BlogPostPage from "./pages/blog/BlogPostPage.jsx";
import PublicDividendCalendarPage from "./pages/dividend/PublicDividendCalendarPage.jsx";
import DividendGuidePage from "./pages/dividend/DividendGuidePage.jsx";
import EtfHubPage from "./pages/etf/EtfHubPage.jsx";
import EtfListPage from "./pages/etf/EtfListPage.jsx";
import EtfDetailPage from "./pages/etf/EtfDetailPage.jsx";
import EtfCompareListPage from "./pages/etf/EtfCompareListPage.jsx";
import EtfComparePage from "./pages/etf/EtfComparePage.jsx";
import EtfRankingPage from "./pages/etf/EtfRankingPage.jsx";
import AboutPage from "./pages/legal/AboutPage.jsx";
import ContactPage from "./pages/legal/ContactPage.jsx";
import PrivacyPage from "./pages/legal/PrivacyPage.jsx";
import TermsPage from "./pages/legal/TermsPage.jsx";
import DisclaimerPage from "./pages/legal/DisclaimerPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/calculators/etf-dividend" element={<EtfDividendCalculator />} />
          <Route path="/calculators/monthly-dividend" element={<MonthlyDividendCalculator />} />
          <Route path="/calculators/average-price" element={<AveragePriceCalculator />} />
          <Route path="/calculators/fire" element={<FireCalculator />} />
          <Route path="/calculators/retirement" element={<RetirementCalculator />} />
          <Route path="/calculators/dca" element={<DcaCalculator />} />
          <Route path="/calculators/compound" element={<CompoundCalculator />} />
          <Route path="/calculators/dividend-reinvestment" element={<DividendReinvestmentCalculator />} />
          <Route path="/etf" element={<EtfHubPage />} />
          <Route path="/etf/search" element={<EtfListPage />} />
          <Route path="/etf/compare" element={<EtfCompareListPage />} />
          <Route path="/etf/compare/:slug" element={<EtfComparePage />} />
          <Route path="/etf/rankings/:slug" element={<EtfRankingPage />} />
          <Route path="/etf/:slug" element={<EtfDetailPage />} />
          <Route path="/dividends/calendar" element={<PublicDividendCalendarPage />} />
          <Route path="/dividends/guide" element={<DividendGuidePage />} />
          <Route path="/analysis/dividend" element={<DividendAnalysisPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/portfolio/my" element={<MyPortfolioPage />} />
            <Route path="/portfolio/holdings" element={<MyPortfolioPage />} />
            <Route path="/portfolio/dividend-growth" element={<DividendGrowthTracker />} />
            <Route path="/portfolio/monthly-calendar" element={<MonthlyDividendCalendar />} />
            <Route path="/portfolio/rebalancing" element={<Navigate to="/analysis/rebalancing" replace />} />
            <Route path="/analysis/portfolio" element={<PortfolioAnalysisPage />} />
            <Route path="/analysis/rebalancing" element={<RebalancingPage />} />
            <Route path="/analysis/ai" element={<AiAnalysisPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
