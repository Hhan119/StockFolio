import { Navigate, useParams } from "react-router-dom";
import { comparisons, getComparisonEtfs } from "../../data/publicContent.js";

function EtfComparePage() {
  const { slug } = useParams();
  const comparison = comparisons.find((item) => item.slug === slug);
  if (!comparison) return <Navigate replace to="/404" />;
  const tickers = getComparisonEtfs(comparison).map((etf) => etf.ticker).join(",");
  return <Navigate replace to={`/etf/compare?tickers=${encodeURIComponent(tickers)}`} />;
}

export default EtfComparePage;
