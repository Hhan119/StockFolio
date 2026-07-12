import { useEffect, useMemo, useState } from "react";
import StateMessage from "../../components/ui/StateMessage.jsx";
import { portfolioService } from "../../services/portfolioService.js";
import { stockService } from "../../services/stockService.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

const chartColors = ["#22d3ee", "#34d399", "#60a5fa", "#f59e0b", "#fb7185", "#a78bfa", "#94a3b8"];
const monthLabels = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const emptyEditHoldingForm = { quantity: 1, avgPrice: "", currentPrice: "", currency: "KRW", memo: "" };
const dividendFrequencyLabels = {
  MONTHLY: "월배당",
  QUARTERLY: "분기배당",
  SEMI_ANNUAL: "반기배당",
  SEMIANNUAL: "반기배당",
  ANNUAL: "연배당",
  SPECIAL: "특별배당",
  IRREGULAR: "불규칙",
  NONE: "배당 없음",
  UNKNOWN: "정보 없음",
};
const eventStatusLabels = {
  ESTIMATED: "예상",
  DECLARED: "발표",
  CONFIRMED: "확정",
  PAID: "지급 완료",
  CORRECTED: "정정",
  CANCELLED: "취소",
};
const confidenceLabels = {
  HIGH: "신뢰도 높음",
  MEDIUM: "신뢰도 보통",
  LOW: "신뢰도 낮음",
  UNAVAILABLE: "신뢰도 없음",
};
const volatilityLabels = {
  STABLE: "안정",
  MODERATE: "보통 변동",
  HIGH: "변동 큼",
  UNAVAILABLE: "변동성 없음",
};

function isKoreanStock(stock) {
  return stock.currency === "KRW" || /^\d{5}[0-9A-Z]$/i.test(stock.ticker || "") || stock.market === "KR";
}

function buildPie(stocks = []) {
  const total = stocks.reduce((sum, stock) => sum + Number(stock.totalValue || 0), 0);
  let cursor = 0;
  const stops = stocks.map((stock, index) => {
    const value = Number(stock.totalValue || 0);
    const start = cursor;
    const end = total > 0 ? cursor + (value / total) * 100 : cursor;
    cursor = end;
    return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
  });
  return total > 0 ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#334155 0% 100%)";
}

function buildDividendInfoMap(summary) {
  const map = new Map();
  (summary?.monthly || []).forEach((month) => {
    (month.items || []).forEach((item) => {
      const info = {
        frequency: item.frequency,
        dividendPerShare: item.dividendPerShare,
      };
      if (item.stockId) map.set(`id:${item.stockId}`, info);
      if (item.stockTicker) map.set(`ticker:${String(item.stockTicker).toUpperCase()}`, info);
    });
  });
  return map;
}

function buildDistributionInfoMap(summary) {
  const map = new Map();
  (summary?.holdings || []).forEach((item) => {
    if (item.holdingId) map.set(`id:${item.holdingId}`, item);
    if (item.ticker) map.set(`ticker:${String(item.ticker).toUpperCase()}`, item);
  });
  return map;
}

function dividendInfoFor(stock, dividendInfoMap) {
  return dividendInfoMap.get(`id:${stock.id}`)
    || dividendInfoMap.get(`ticker:${String(stock.ticker || "").toUpperCase()}`)
    || null;
}

function formatDividendFrequency(frequency) {
  return dividendFrequencyLabels[frequency] || "배당 없음";
}

function formatOptionalMoney(value, currency) {
  if (value === null || value === undefined || value === "") return "정보 없음";
  return formatMoney(value, currency);
}

function formatNextPayment(info) {
  if (!info?.nextPaymentDate) return "정보 없음";
  return `${info.nextPaymentDate} ${eventStatusLabels[info.nextEventStatus] || ""}`.trim();
}

function getDistributionFrequency(info) {
  return info?.observedFrequency || info?.declaredFrequency || info?.frequency;
}

function getLatestDistributionAmount(info) {
  return info?.latestAmountPerShare ?? info?.dividendPerShare;
}

function getAnnualDistributionAmount(info) {
  return info?.estimatedAnnualGrossAmount ?? info?.totalDividend;
}

function DarkMetric({ label, value, tone = "default" }) {
  const toneClass = tone === "positive" ? "text-cyan-700 dark:text-cyan-300" : tone === "negative" ? "text-rose-600 dark:text-rose-300" : "text-slate-950 dark:text-white";
  return (
    <article className="rounded-2xl bg-slate-50 p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 sm:p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <strong className={`mt-1 block text-xl font-black sm:text-2xl ${toneClass}`}>{value}</strong>
    </article>
  );
}

function MyPortfolioPage() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [detail, setDetail] = useState(null);
  const [dividendSummary, setDividendSummary] = useState(null);
  const [distributionSummary, setDistributionSummary] = useState(null);
  const [marketFilter, setMarketFilter] = useState("ALL");
  const [searchMarket, setSearchMarket] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [modalStock, setModalStock] = useState(null);
  const [holdingForm, setHoldingForm] = useState({ quantity: 1, averagePrice: "", currency: "USD", memo: "" });
  const [editingStock, setEditingStock] = useState(null);
  const [editHoldingForm, setEditHoldingForm] = useState(emptyEditHoldingForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stocks = detail?.stocks || [];
  const filteredStocks = stocks.filter((stock) => {
    if (marketFilter === "KR") return isKoreanStock(stock);
    if (marketFilter === "US") return !isKoreanStock(stock);
    return true;
  });

  const totalCost = Number(detail?.totalCost || 0);
  const totalValue = Number(detail?.totalValue || 0);
  const totalProfit = Number(detail?.totalProfitLoss || 0);
  const totalReturn = Number(detail?.totalProfitLossRate || 0);
  const estimatedAnnualDividend = Number(distributionSummary?.estimatedAnnualGrossAmount ?? dividendSummary?.annualEstimated ?? 0);
  const filteredTotalValue = filteredStocks.reduce((sum, stock) => sum + Number(stock.totalValue || 0), 0);
  const pieStyle = useMemo(() => ({ background: buildPie(filteredStocks) }), [filteredStocks]);
  const topHoldings = [...filteredStocks].sort((a, b) => Number(b.totalValue || 0) - Number(a.totalValue || 0)).slice(0, 5);
  const legacyDividendInfoMap = useMemo(() => buildDividendInfoMap(dividendSummary), [dividendSummary]);
  const distributionInfoMap = useMemo(() => buildDistributionInfoMap(distributionSummary), [distributionSummary]);

  const loadPortfolios = async () => {
    const data = await portfolioService.list();
    setPortfolios(data);
    const nextId = selectedPortfolioId && data.some((portfolio) => String(portfolio.id) === String(selectedPortfolioId))
      ? String(selectedPortfolioId)
      : data.length
        ? String(data[0].id)
        : "";
    setSelectedPortfolioId(nextId);
    if (!nextId) {
      setDetail(null);
      setDividendSummary(null);
      setDistributionSummary(null);
    }
  };

  const loadDetail = async (portfolioId) => {
    if (!portfolioId) {
      setDetail(null);
      setDividendSummary(null);
      setDistributionSummary(null);
      return;
    }
    const portfolioDetail = await portfolioService.detail(portfolioId);
    const [legacyDividendResult, distributionResult] = await Promise.allSettled([
      portfolioService.dividendSummary(portfolioId),
      portfolioService.distributionSummary(portfolioId),
    ]);
    setDetail(portfolioDetail);
    setDividendSummary(legacyDividendResult.status === "fulfilled" ? legacyDividendResult.value : null);
    setDistributionSummary(distributionResult.status === "fulfilled" ? distributionResult.value : null);
  };

  useEffect(() => {
    loadPortfolios().catch(() => setError("포트폴리오 목록을 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    loadDetail(selectedPortfolioId).catch(() => setError("포트폴리오 상세 정보를 불러오지 못했습니다."));
  }, [selectedPortfolioId]);

  const ensurePortfolio = async () => {
    if (selectedPortfolioId) return Number(selectedPortfolioId);
    const created = await portfolioService.create({ name: "메인 포트폴리오", description: "기본 보유종목", initialCapital: 0 });
    await loadPortfolios();
    setSelectedPortfolioId(String(created.id));
    return created.id;
  };

  const search = async (event) => {
    event.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const data = await stockService.search(keyword.trim(), searchMarket);
      setResults(data);
      if (!data.length) setMessage("검색 결과가 없습니다. 종목명 또는 티커로 다시 검색해보세요.");
    } catch {
      setError("종목 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (stock) => {
    setModalStock(stock);
    setHoldingForm({
      quantity: 1,
      averagePrice: stock.currentPrice ? String(stock.currentPrice) : "",
      currency: stock.currency || (stock.market === "KR" ? "KRW" : "USD"),
      memo: "",
    });
  };

  const saveHolding = async (event) => {
    event.preventDefault();
    if (!modalStock) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const portfolioId = await ensurePortfolio();
      const detailResult = await stockService.detail(modalStock.ticker);
      const currentPrice = Number(detailResult.currentPrice || modalStock.currentPrice || 0);
      await portfolioService.addStock({
        portfolioId,
        ticker: modalStock.ticker,
        name: modalStock.name,
        quantity: Number(holdingForm.quantity),
        averagePrice: Number(holdingForm.averagePrice || currentPrice || 1),
        currentPrice: currentPrice || Number(holdingForm.averagePrice || 1),
        sector: modalStock.exchange || modalStock.market,
        currency: holdingForm.currency,
        memo: holdingForm.memo,
      });

      setModalStock(null);
      setMessage(`${modalStock.name} 보유종목을 저장했습니다.`);
      await loadPortfolios();
      await loadDetail(portfolioId);
    } catch {
      setError("보유종목 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = async () => {
    if (!stocks.length) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      for (const stock of stocks) {
        const market = isKoreanStock(stock) ? "KR" : "US";
        const quote = await stockService.quote(market, stock.ticker);
        if (Number(quote.currentPrice) > 0) await portfolioService.updatePrice(stock.id, quote.currentPrice);
      }
      await loadDetail(selectedPortfolioId);
      setMessage("현재가를 갱신했습니다.");
    } catch {
      setError("현재가 갱신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const removeHolding = async (stock) => {
    if (!window.confirm(`${stock.name} 보유종목을 제거할까요?`)) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await portfolioService.removeStock(stock.id);
      await loadDetail(selectedPortfolioId);
      setMessage(`${stock.name} 보유종목을 제거했습니다.`);
    } catch {
      setError("보유종목 제거에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const openEditHolding = (stock) => {
    setEditingStock(stock);
    setEditHoldingForm({
      quantity: stock.quantity || 1,
      avgPrice: stock.avgPrice || "",
      currentPrice: stock.currentPrice || "",
      currency: stock.currency || "KRW",
      memo: stock.memo || "",
    });
  };

  const closeEditHolding = () => {
    setEditingStock(null);
    setEditHoldingForm(emptyEditHoldingForm);
  };

  const updateHolding = async (event) => {
    event.preventDefault();
    if (!editingStock) return;

    const quantity = Number(editHoldingForm.quantity || 0);
    const avgPrice = Number(editHoldingForm.avgPrice || 0);
    const currentPrice = Number(editHoldingForm.currentPrice || 0);
    if (quantity <= 0 || avgPrice <= 0) {
      setError("수량과 평균 매수가는 0보다 커야 합니다.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");
    try {
      const editedName = editingStock.name;
      await portfolioService.updateStock(editingStock.id, {
        ticker: editingStock.ticker,
        name: editingStock.name,
        quantity,
        avgPrice,
        currentPrice: currentPrice > 0 ? currentPrice : avgPrice,
        sector: editingStock.sector,
        currency: editHoldingForm.currency || editingStock.currency,
        memo: editHoldingForm.memo,
      });
      closeEditHolding();
      await loadPortfolios();
      await loadDetail(selectedPortfolioId);
      setMessage(`${editedName} 보유종목을 수정했습니다.`);
    } catch {
      setError("보유종목 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!editingStock) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeEditHolding();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingStock]);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-slate-950 p-3 text-slate-100 ring-1 ring-slate-800/80 sm:p-4 lg:p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-wider text-cyan-300">내 포트폴리오</p>
          <h2 className="text-2xl font-black text-white sm:text-3xl">보유자산</h2>
          <p className="mt-1 max-w-3xl text-sm font-bold text-slate-400">모바일, 태블릿, 노트북, 데스크탑 화면에 맞춰 자산과 보유종목을 정리합니다.</p>
        </div>
        <div className="grid w-full min-w-0 gap-2 sm:w-auto sm:min-w-[280px]">
          <label className="grid gap-1 text-xs font-black uppercase tracking-wider text-slate-500">
            포트폴리오 선택
            <select
              className="form-control border-slate-800 bg-slate-900 text-sm font-black text-white"
              disabled={!portfolios.length || loading}
              value={selectedPortfolioId}
              onChange={(event) => {
                setSelectedPortfolioId(event.target.value);
                setMessage("");
                setError("");
              }}
            >
              {!portfolios.length && <option value="">저장된 포트폴리오 없음</option>}
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name} · {portfolio.stockCount || 0}개 종목
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm hover:bg-cyan-300" onClick={refreshPrices} disabled={loading || !selectedPortfolioId}>현재가 갱신</button>
        </div>
      </div>

      <section className="mb-4 max-w-full rounded-2xl border border-slate-700/80 bg-slate-900 p-3 shadow-sm sm:p-4">
        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="grid min-w-0 gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Total Asset</p>
                <strong className="mt-1 block truncate text-3xl font-black text-white sm:text-4xl">{formatMoney(totalValue)}</strong>
                <p className={`mt-1 text-sm font-black ${totalProfit >= 0 ? "text-cyan-300" : "text-rose-300"}`}>{formatMoney(totalProfit)} ({formatPercent(totalReturn)})</p>
              </div>
              <div className="grid w-full grid-cols-3 rounded-2xl bg-slate-950 p-1 text-sm font-black md:w-auto">
                {[["ALL", "전체"], ["KR", "국내"], ["US", "해외"]].map(([value, label]) => (
                  <button key={value} className={`rounded-2xl px-3 py-2 transition ${marketFilter === value ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`} onClick={() => setMarketFilter(value)} type="button">{label}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))]">
              <DarkMetric label="투자금" value={formatMoney(totalCost)} />
              <DarkMetric label="평가손익" value={formatMoney(totalProfit)} tone={totalProfit >= 0 ? "positive" : "negative"} />
              <DarkMetric label="연 배당" value={formatMoney(estimatedAnnualDividend)} tone="positive" />
              <DarkMetric label="월 배당" value={formatMoney(estimatedAnnualDividend / 12)} tone="positive" />
            </div>
          </div>

          <aside className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full shadow-sm sm:h-32 sm:w-32" style={pieStyle}>
                <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-950 text-center ring-1 ring-slate-800 sm:h-20 sm:w-20">
                  <span className="text-[10px] font-black text-slate-500">종목</span>
                  <strong className="text-lg font-black text-white">{filteredStocks.length}</strong>
                </div>
              </div>
              <div className="grid min-w-0 flex-1 gap-2">
                {topHoldings.map((stock, index) => {
                  const ratio = filteredTotalValue > 0 ? (Number(stock.totalValue || 0) / filteredTotalValue) * 100 : 0;
                  return (
                    <div className="flex items-center justify-between gap-3 text-sm font-bold" key={stock.id}>
                      <span className="flex min-w-0 items-center gap-2">
                        <i className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                        <span className="truncate text-slate-300">{stock.name}</span>
                      </span>
                      <span className="shrink-0 text-white">{ratio.toFixed(1)}%</span>
                    </div>
                  );
                })}
                {!topHoldings.length && <p className="text-sm font-bold text-slate-500">보유종목을 등록하면 비중이 표시됩니다.</p>}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 gap-4">
          <section className="min-w-0 rounded-2xl border border-slate-700/80 bg-slate-900 p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-white">종목 검색</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">국내 주식은 KRX Open API, 해외 주식은 FMP 기준으로 우선 조회합니다.</p>
              </div>
              <div className="grid grid-cols-3 rounded-2xl bg-slate-950 p-1 text-xs font-black">
                {[["ALL", "전체"], ["KR", "국내"], ["US", "해외"]].map(([value, label]) => (
                  <button
                    className={`rounded-xl px-3 py-2 transition ${searchMarket === value ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
                    key={value}
                    type="button"
                    onClick={() => {
                      setSearchMarket(value);
                      setResults([]);
                      setMessage("");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={search}>
              <input className="form-control min-h-10 border-slate-800 bg-slate-950 py-2 text-white" placeholder={searchMarket === "KR" ? "삼성전자, 005930, SK하이닉스" : searchMarket === "US" ? "AAPL, SCHD, Tesla" : "삼성전자, 005930, AAPL"} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
              <button className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 shadow-sm hover:bg-cyan-300" disabled={loading}>{loading ? "검색 중" : "검색"}</button>
            </form>

            <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-2 sm:max-h-64 lg:max-h-72">
              {results.map((item) => (
                <article className="grid min-w-0 gap-2 rounded-xl bg-slate-900 p-2.5 hover:bg-slate-800 sm:grid-cols-[minmax(0,1fr)_auto]" key={`${item.market}-${item.ticker}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-white">{item.name}</strong>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-black text-slate-300">{item.ticker}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-black text-slate-300">{item.market === "KR" ? "국내" : "해외"}</span>
                      {item.dividendAvailable && <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[11px] font-black text-cyan-200">배당</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                    <strong className="text-sm text-white">{formatMoney(item.currentPrice, item.currency)}</strong>
                    <button className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-300 sm:mt-1" onClick={() => openModal(item)} type="button">등록</button>
                  </div>
                </article>
              ))}
              {!results.length && <p className="p-3 text-sm font-bold text-slate-500">검색 결과가 여기에 표시됩니다.</p>}
            </div>
          </section>

          <section className="max-w-full overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-sm">
            <div className="border-b border-slate-800 p-4">
              <h3 className="font-black text-white">보유종목</h3>
              <p className="mt-1 text-sm font-bold text-slate-500">동일 종목은 수량과 평균단가가 자동 합산됩니다.</p>
            </div>
            <div className="table-scroll hidden max-w-full overflow-x-auto pb-2 lg:block" tabIndex={0}>
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">종목</th>
                    <th>매수 정보</th>
                    <th>평가</th>
                    <th>손익</th>
                    <th>분배금</th>
                    <th>다음 지급</th>
                    <th className="pr-4">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock) => {
                    const dividendInfo = dividendInfoFor(stock, distributionInfoMap) || dividendInfoFor(stock, legacyDividendInfoMap);
                    return (
                      <tr className="border-t border-slate-800 hover:bg-slate-800/70" key={stock.id}>
                        <td className="px-4 py-3">
                          <strong className="block max-w-[220px] truncate font-black text-white">{stock.name}</strong>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-black text-slate-300">{stock.ticker}</span>
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-black text-slate-300">{isKoreanStock(stock) ? "국내" : "해외"}</span>
                          </div>
                        </td>
                        <td>
                          <strong className="block text-slate-100">{Number(stock.quantity || 0).toLocaleString()}주</strong>
                          <span className="text-xs font-bold text-slate-500">평단 {formatMoney(stock.avgPrice, stock.currency)}</span>
                        </td>
                        <td>
                          <strong className="block text-slate-100">{formatMoney(stock.totalValue, stock.currency)}</strong>
                          <span className="text-xs font-bold text-slate-500">현재 {formatMoney(stock.currentPrice, stock.currency)}</span>
                        </td>
                        <td className={Number(stock.profitLoss) >= 0 ? "font-black text-cyan-300" : "font-black text-rose-300"}>
                          <strong className="block">{formatMoney(stock.profitLoss, stock.currency)}</strong>
                          <span className="text-xs">{formatPercent(stock.profitLossRate)}</span>
                        </td>
                        <td className="min-w-[220px] py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs font-black text-cyan-200">
                              {formatDividendFrequency(getDistributionFrequency(dividendInfo))}
                            </span>
                            {dividendInfo?.paymentsLast12Months > 0 && <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-black text-slate-300">최근 12개월 {dividendInfo.paymentsLast12Months}회</span>}
                            {dividendInfo?.coveredCallLike && <span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs font-black text-amber-200">분배금 변동 가능</span>}
                            {dividendInfo?.specialDistributionIncluded && <span className="rounded-full bg-violet-400/15 px-2 py-1 text-xs font-black text-violet-200">특별분배 포함</span>}
                          </div>
                          <div className="mt-2 grid gap-0.5 text-xs font-bold text-slate-400">
                            <span>1회 {formatOptionalMoney(getLatestDistributionAmount(dividendInfo), stock.currency)}</span>
                            <span>최근 12개월 {formatOptionalMoney(dividendInfo?.trailingTwelveMonthsAmountPerShare, stock.currency)}</span>
                            <span>예상 연 {formatOptionalMoney(getAnnualDistributionAmount(dividendInfo), stock.currency)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="grid gap-1">
                            <span className="font-black text-slate-200">{formatNextPayment(dividendInfo)}</span>
                            <span className="text-xs text-slate-500">{confidenceLabels[dividendInfo?.estimateConfidence] || "신뢰도 없음"} · {volatilityLabels[dividendInfo?.distributionVolatility] || "변동성 없음"}</span>
                          </div>
                        </td>
                        <td className="pr-4">
                          <div className="flex gap-1">
                            <button className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-cyan-500 hover:text-slate-950" onClick={() => openEditHolding(stock)} type="button">수정</button>
                            <button className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-rose-600 hover:text-white" onClick={() => removeHolding(stock)} type="button">제거</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 p-3 lg:hidden">
              {filteredStocks.map((stock) => {
                const dividendInfo = dividendInfoFor(stock, distributionInfoMap) || dividendInfoFor(stock, legacyDividendInfoMap);
                return (
                  <article className="rounded-2xl border border-slate-800 bg-slate-950 p-3" key={stock.id}>
                    <div className="flex justify-between gap-3"><strong>{stock.name}</strong><span className={Number(stock.profitLossRate) >= 0 ? "font-black text-cyan-300" : "font-black text-rose-300"}>{formatPercent(stock.profitLossRate)}</span></div>
                    <p className="mt-1 text-sm font-bold text-slate-500">{stock.ticker}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <span>수량 {stock.quantity}</span>
                      <span>평가 {formatMoney(stock.totalValue, stock.currency)}</span>
                      <span>평단 {formatMoney(stock.avgPrice, stock.currency)}</span>
                      <span>현재 {formatMoney(stock.currentPrice, stock.currency)}</span>
                      <span>패턴 {formatDividendFrequency(getDistributionFrequency(dividendInfo))}</span>
                      <span>최근 1회 {formatOptionalMoney(getLatestDistributionAmount(dividendInfo), stock.currency)}</span>
                      <span>최근 12개월 {formatOptionalMoney(dividendInfo?.trailingTwelveMonthsAmountPerShare, stock.currency)}</span>
                      <span>예상 연 {formatOptionalMoney(getAnnualDistributionAmount(dividendInfo), stock.currency)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs font-black text-cyan-200">{eventStatusLabels[dividendInfo?.nextEventStatus] || "정보 없음"}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-black text-slate-300">{confidenceLabels[dividendInfo?.estimateConfidence] || "신뢰도 없음"}</span>
                      {dividendInfo?.coveredCallLike && <span className="rounded-full bg-amber-400/15 px-2 py-1 text-xs font-black text-amber-200">분배금 변동 가능</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-black text-slate-200 hover:bg-cyan-500 hover:text-slate-950" onClick={() => openEditHolding(stock)} type="button">수정</button>
                      <button className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-black text-slate-200 hover:bg-rose-600 hover:text-white" onClick={() => removeHolding(stock)} type="button">제거</button>
                    </div>
                  </article>
                );
              })}
              {!filteredStocks.length && <p className="rounded-2xl bg-slate-950 p-4 text-sm font-bold text-slate-500">해당 구분의 보유종목이 없습니다.</p>}
            </div>
          </section>
        </main>

        <aside className="grid min-w-0 content-start gap-4">
          <section className="rounded-2xl border border-slate-700/80 bg-slate-900 p-4 shadow-sm">
            <h3 className="font-black text-white">배당금</h3>
            <div className="mt-3 grid gap-2">
              {(dividendSummary?.monthly || []).slice(0, 12).map((month) => (
                <div className="rounded-2xl bg-slate-950 p-3 text-sm font-bold" key={month.month}>
                  <div className="flex items-center justify-between">
                    <span>{monthLabels[month.month - 1]} 예상</span>
                    <span className="text-cyan-300">{formatMoney(month.estimatedTotal)}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    {(month.items || []).slice(0, 3).map((item) => (
                      <p className="flex justify-between gap-2" key={item.id}>
                        <span className="truncate">{item.stockName}</span>
                        <span>{formatMoney(item.totalDividend)}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {!dividendSummary && <p className="rounded-2xl bg-slate-950 p-4 text-sm font-bold text-slate-500">배당 정보를 등록하면 월별 예상 금액이 표시됩니다.</p>}
            </div>
          </section>
        </aside>
      </section>

      <StateMessage type="success">{message}</StateMessage>
      <StateMessage type="error">{error}</StateMessage>

      {modalStock && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4">
          <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900 p-5 text-white shadow-sm" onSubmit={saveHolding}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-300">보유종목 등록</p>
                <h3 className="mt-1 text-2xl font-black">{modalStock.name}</h3>
                <p className="text-sm font-bold text-slate-500">{modalStock.ticker}</p>
              </div>
              <button className="rounded-2xl bg-slate-800 px-3 py-2 text-sm font-black" onClick={() => setModalStock(null)} type="button">닫기</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">현재가<input className="form-control border-slate-800 bg-slate-950 text-white" readOnly value={modalStock.currentPrice || 0} /></label>
              <label className="grid gap-1 text-sm font-bold">통화<input className="form-control border-slate-800 bg-slate-950 text-white" value={holdingForm.currency} onChange={(event) => setHoldingForm({ ...holdingForm, currency: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-bold">평균 매수가<input className="form-control border-slate-800 bg-slate-950 text-white" type="number" min="0" step="0.01" value={holdingForm.averagePrice} onChange={(event) => setHoldingForm({ ...holdingForm, averagePrice: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-bold">수량<input className="form-control border-slate-800 bg-slate-950 text-white" type="number" min="1" value={holdingForm.quantity} onChange={(event) => setHoldingForm({ ...holdingForm, quantity: event.target.value })} /></label>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm font-bold leading-6 text-cyan-100 sm:col-span-2">
                저장하면 배당 가능 여부, 배당 주기, 예상 주당 배당금은 백엔드에서 자동 추정해 월배당 캘린더에 연결합니다.
              </div>
              <label className="grid gap-1 text-sm font-bold sm:col-span-2">메모<input className="form-control border-slate-800 bg-slate-950 text-white" value={holdingForm.memo} onChange={(event) => setHoldingForm({ ...holdingForm, memo: event.target.value })} /></label>
            </div>
            <button className="mt-5 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 hover:bg-cyan-300" disabled={loading}>저장</button>
          </form>
        </div>
      )}

      {editingStock && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4">
          <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900 p-5 text-white shadow-sm" onSubmit={updateHolding}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-300">보유종목 수정</p>
                <h3 className="mt-1 text-2xl font-black">{editingStock.name}</h3>
                <p className="text-sm font-bold text-slate-500">{editingStock.ticker}</p>
              </div>
              <button className="rounded-2xl bg-slate-800 px-3 py-2 text-sm font-black" onClick={closeEditHolding} type="button">닫기</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold">수량<input className="form-control border-slate-800 bg-slate-950 text-white" type="number" min="1" value={editHoldingForm.quantity} onChange={(event) => setEditHoldingForm({ ...editHoldingForm, quantity: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-bold">평균 매수가<input className="form-control border-slate-800 bg-slate-950 text-white" type="number" min="0" step="0.01" value={editHoldingForm.avgPrice} onChange={(event) => setEditHoldingForm({ ...editHoldingForm, avgPrice: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-bold">현재가<input className="form-control border-slate-800 bg-slate-950 text-white" type="number" min="0" step="0.01" value={editHoldingForm.currentPrice} onChange={(event) => setEditHoldingForm({ ...editHoldingForm, currentPrice: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-bold">통화<input className="form-control border-slate-800 bg-slate-950 text-white" value={editHoldingForm.currency} onChange={(event) => setEditHoldingForm({ ...editHoldingForm, currency: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-bold sm:col-span-2">메모<input className="form-control border-slate-800 bg-slate-950 text-white" value={editHoldingForm.memo} onChange={(event) => setEditHoldingForm({ ...editHoldingForm, memo: event.target.value })} /></label>
            </div>
            <button className="mt-5 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 hover:bg-cyan-300" disabled={loading}>수정 저장</button>
          </form>
        </div>
      )}
    </section>
  );
}

export default MyPortfolioPage;
