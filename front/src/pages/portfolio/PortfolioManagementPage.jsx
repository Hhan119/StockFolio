import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { portfolioService } from "../../services/portfolioService.js";
import { stockService } from "../../services/stockService.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

const emptyPortfolioForm = { name: "", description: "" };
const emptyHoldingForm = { quantity: 1, averagePrice: "", memo: "" };
const emptyEditStockForm = { quantity: 1, avgPrice: "", currentPrice: "", currency: "KRW", memo: "" };

function PortfolioManagementPage() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [portfolioForm, setPortfolioForm] = useState(emptyPortfolioForm);
  const [searchMarket, setSearchMarket] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [holdingForm, setHoldingForm] = useState(emptyHoldingForm);
  const [draftHoldings, setDraftHoldings] = useState([]);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [editStockForm, setEditStockForm] = useState(emptyEditStockForm);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSummary = useMemo(
    () => portfolios.find((portfolio) => String(portfolio.id) === String(selectedId)),
    [portfolios, selectedId],
  );

  const draftSummary = useMemo(() => {
    const totalCost = draftHoldings.reduce((sum, item) => sum + item.averagePrice * item.quantity, 0);
    const totalValue = draftHoldings.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);
    const profit = totalValue - totalCost;
    const profitRate = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    return { totalCost, totalValue, profit, profitRate };
  }, [draftHoldings]);

  const loadPortfolios = async (nextSelectedId = selectedId) => {
    const data = await portfolioService.list();
    setPortfolios(data);
    if (!data.length) {
      setSelectedId("");
      setSelectedDetail(null);
      return;
    }

    const nextId = nextSelectedId && data.some((item) => String(item.id) === String(nextSelectedId))
      ? String(nextSelectedId)
      : String(data[0].id);
    setSelectedId(nextId);
  };

  const loadSelectedDetail = async (portfolioId) => {
    setSelectedDetail(portfolioId ? await portfolioService.detail(portfolioId) : null);
  };

  useEffect(() => {
    loadPortfolios().catch(() => setError("포트폴리오 목록을 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    loadSelectedDetail(selectedId).catch(() => setError("선택한 포트폴리오를 불러오지 못했습니다."));
  }, [selectedId]);

  const searchStocks = async (event) => {
    event.preventDefault();
    if (!keyword.trim()) return;
    setSearching(true);
    setMessage("");
    setError("");
    try {
      const data = await stockService.search(keyword.trim(), searchMarket);
      setResults(data);
      if (!data.length) setMessage("검색 결과가 없습니다. 종목명이나 티커를 다시 입력해보세요.");
    } catch {
      setError("종목 검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const pickStock = (stock) => {
    setSelectedStock(stock);
    setHoldingForm({
      quantity: 1,
      averagePrice: stock.currentPrice ? String(stock.currentPrice) : "",
      memo: "",
    });
  };

  const addDraftHolding = (event) => {
    event.preventDefault();
    if (!selectedStock) return;

    const quantity = Number(holdingForm.quantity || 0);
    const averagePrice = Number(holdingForm.averagePrice || selectedStock.currentPrice || 0);
    const currentPrice = Number(selectedStock.currentPrice || averagePrice || 0);
    if (quantity <= 0 || averagePrice <= 0) {
      setError("수량과 평균단가는 0보다 커야 합니다.");
      return;
    }

    const key = `${selectedStock.market}-${selectedStock.ticker}`.toUpperCase();
    setDraftHoldings((current) => {
      const existing = current.find((item) => item.key === key);
      if (!existing) {
        return [
          ...current,
          {
            key,
            market: selectedStock.market,
            ticker: selectedStock.ticker,
            name: selectedStock.name,
            currency: selectedStock.currency || (selectedStock.market === "KR" ? "KRW" : "USD"),
            exchange: selectedStock.exchange || selectedStock.market,
            quantity,
            averagePrice,
            currentPrice,
            memo: holdingForm.memo,
          },
        ];
      }

      return current.map((item) => {
        if (item.key !== key) return item;
        const nextQuantity = item.quantity + quantity;
        const nextAveragePrice = ((item.averagePrice * item.quantity) + (averagePrice * quantity)) / nextQuantity;
        return {
          ...item,
          quantity: nextQuantity,
          averagePrice: Number(nextAveragePrice.toFixed(2)),
          currentPrice,
          memo: holdingForm.memo || item.memo,
        };
      });
    });

    setSelectedStock(null);
    setHoldingForm(emptyHoldingForm);
    setMessage(`${selectedStock.name} 종목을 임시 포트폴리오에 담았습니다.`);
  };

  const removeDraftHolding = (key) => {
    setDraftHoldings((current) => current.filter((item) => item.key !== key));
  };

  const openEditStock = (stock) => {
    setEditingStock(stock);
    setEditStockForm({
      quantity: stock.quantity || 1,
      avgPrice: stock.avgPrice || "",
      currentPrice: stock.currentPrice || "",
      currency: stock.currency || "KRW",
      memo: stock.memo || "",
    });
  };

  const closeEditStock = () => {
    setEditingStock(null);
    setEditStockForm(emptyEditStockForm);
  };

  const updateSavedStock = async (event) => {
    event.preventDefault();
    if (!editingStock) return;
    const quantity = Number(editStockForm.quantity || 0);
    const avgPrice = Number(editStockForm.avgPrice || 0);
    const currentPrice = Number(editStockForm.currentPrice || 0);
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
        currency: editStockForm.currency || editingStock.currency,
        memo: editStockForm.memo,
      });
      closeEditStock();
      await loadPortfolios(selectedId);
      await loadSelectedDetail(selectedId);
      setMessage(`${editedName} 정보를 수정했습니다.`);
    } catch {
      setError("종목 정보 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const removeSavedStock = async (stock) => {
    if (!stock?.id || !window.confirm(`${stock.name} 종목을 이 포트폴리오에서 삭제할까요?`)) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await portfolioService.removeStock(stock.id);
      await loadPortfolios(selectedId);
      await loadSelectedDetail(selectedId);
      setMessage(`${stock.name} 종목을 삭제했습니다.`);
    } catch {
      setError("종목 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const savePortfolio = async () => {
    if (!portfolioForm.name.trim()) {
      setError("포트폴리오 이름을 입력해주세요.");
      return;
    }
    if (!draftHoldings.length) {
      setError("저장할 종목을 먼저 담아주세요.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");
    try {
      const created = await portfolioService.create({
        name: portfolioForm.name.trim(),
        description: portfolioForm.description.trim(),
        initialCapital: draftSummary.totalCost,
      });

      for (const holding of draftHoldings) {
        await portfolioService.addStock({
          portfolioId: created.id,
          ticker: holding.ticker,
          name: holding.name,
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          currentPrice: holding.currentPrice,
          sector: holding.exchange,
          currency: holding.currency,
          memo: holding.memo,
        });
      }

      setPortfolioForm(emptyPortfolioForm);
      setDraftHoldings([]);
      setSelectedStock(null);
      setResults([]);
      await loadPortfolios(created.id);
      await loadSelectedDetail(created.id);
      setMessage("종목 묶음을 새 포트폴리오로 저장했습니다. 배당 정보는 가능한 경우 자동 연결됩니다.");
    } catch {
      setError("포트폴리오 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedPortfolio = async () => {
    if (!selectedId || !window.confirm("선택한 포트폴리오를 삭제할까요? 보유종목도 함께 삭제됩니다.")) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await portfolioService.remove(selectedId);
      await loadPortfolios("");
      setMessage("포트폴리오를 삭제했습니다.");
    } catch {
      setError("포트폴리오 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const selectedStocks = selectedDetail?.stocks || [];

  return (
    <section className="grid gap-4">
      <header className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm lg:p-8">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Portfolio Builder</p>
        <div className="mt-2 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="max-w-4xl text-3xl font-black leading-tight lg:text-5xl">내 포트폴리오</h2>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
              종목을 먼저 담고, 그 묶음을 하나의 포트폴리오로 저장하세요. 저장된 포트폴리오는 오른쪽에서 선택해 다시 볼 수 있습니다.
            </p>
          </div>
          <Link className="btn-ghost-dark text-sm" to="/portfolio/holdings">
            보유종목 화면으로 이동
          </Link>
        </div>
      </header>

      {(message || error) && (
        <p className={`rounded-2xl px-4 py-3 text-sm font-black ${error ? "bg-rose-50 text-rose-700" : "bg-cyan-50 text-cyan-800"}`}>
          {error || message}
        </p>
      )}

      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 gap-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="grid content-start gap-3">
                <div className="flex min-h-11 items-center">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">1. 포트폴리오 정보</h3>
                </div>
                <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                  포트폴리오 이름
                  <input
                    className="form-control bg-slate-50 dark:bg-slate-800"
                    placeholder="예: 장기 배당 포트폴리오"
                    value={portfolioForm.name}
                    onChange={(event) => setPortfolioForm({ ...portfolioForm, name: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                  설명
                  <input
                    className="form-control bg-slate-50 dark:bg-slate-800"
                    placeholder="투자 목적이나 전략을 적어주세요"
                    value={portfolioForm.description}
                    onChange={(event) => setPortfolioForm({ ...portfolioForm, description: event.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="투자금" value={formatMoney(draftSummary.totalCost)} />
                  <Metric label="평가금액" value={formatMoney(draftSummary.totalValue)} />
                  <Metric label="예상손익" value={formatMoney(draftSummary.profit)} tone={draftSummary.profit >= 0 ? "positive" : "negative"} />
                  <Metric label="수익률" value={formatPercent(draftSummary.profitRate)} tone={draftSummary.profitRate >= 0 ? "positive" : "negative"} />
                </div>
              </div>

              <div className="grid content-start gap-3">
                <div className="flex min-h-11 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">2. 종목 검색 후 담기</h3>
                  <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1 text-xs font-black dark:bg-slate-800">
                    {[["ALL", "전체"], ["KR", "국내"], ["US", "해외"]].map(([value, label]) => (
                      <button
                        className={`rounded-xl px-3 py-2 transition ${searchMarket === value ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"}`}
                        key={value}
                        onClick={() => {
                          setSearchMarket(value);
                          setResults([]);
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={searchStocks}>
                  <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    종목명 또는 티커
                    <input
                      className="form-control bg-slate-50 dark:bg-slate-800"
                      placeholder="삼성전자, 두산, AAPL, SCHD"
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                    />
                  </label>
                  <button className="btn-muted min-h-11 self-end text-sm" disabled={searching}>
                    {searching ? "검색 중" : "검색"}
                  </button>
                </form>

                <div className="grid max-h-52 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                  {results.map((item) => {
                    const active = selectedStock?.ticker === item.ticker;
                    return (
                      <button
                        className={`rounded-xl p-3 text-left transition ${active ? "bg-cyan-600 text-white" : "bg-white text-slate-900 hover:bg-cyan-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
                        key={`${item.market}-${item.ticker}`}
                        onClick={() => pickStock(item)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <strong className={`block truncate text-sm font-black ${active ? "text-white" : "text-slate-950 dark:text-white"}`}>{item.name}</strong>
                            <span className={active ? "text-xs font-bold text-cyan-50" : "text-xs font-bold text-slate-500 dark:text-slate-400"}>
                              {item.ticker} · {item.market === "KR" ? "국내" : "해외"}
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-black">{formatMoney(item.currentPrice, item.currency)}</span>
                        </div>
                      </button>
                    );
                  })}
                  {!results.length && <p className="p-3 text-sm font-bold text-slate-500 dark:text-slate-400">검색하면 여기에 종목 목록이 표시됩니다.</p>}
                </div>

                {selectedStock && (
                  <form className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" onSubmit={addDraftHolding}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-lg font-black text-slate-950 dark:text-white">{selectedStock.name}</strong>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{selectedStock.ticker} · 현재가 {formatMoney(selectedStock.currentPrice, selectedStock.currency)}</span>
                      </div>
                      <button className="text-sm font-black text-slate-400 hover:text-slate-950 dark:hover:text-white" onClick={() => setSelectedStock(null)} type="button">
                        취소
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <NumberInput label="수량" value={holdingForm.quantity} onChange={(value) => setHoldingForm({ ...holdingForm, quantity: value })} />
                      <NumberInput label="평균단가" step="0.01" value={holdingForm.averagePrice} onChange={(value) => setHoldingForm({ ...holdingForm, averagePrice: value })} />
                      <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                        메모
                        <input className="form-control bg-slate-50 dark:bg-slate-800" value={holdingForm.memo} onChange={(event) => setHoldingForm({ ...holdingForm, memo: event.target.value })} />
                      </label>
                    </div>
                    <button className="btn-muted mt-3 min-h-12 w-full text-sm">
                      임시 포트폴리오에 담기
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Draft Holdings</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">저장 전 종목 묶음</h3>
              </div>
              <button className="btn-muted min-h-12 text-sm" disabled={loading || !draftHoldings.length} onClick={savePortfolio} type="button">
                이 구성으로 포트폴리오 저장
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="py-3">종목</th>
                    <th>티커</th>
                    <th>수량</th>
                    <th>평균단가</th>
                    <th>현재가</th>
                    <th>평가금액</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {draftHoldings.map((holding) => (
                    <tr className="border-b border-slate-100 dark:border-slate-800" key={holding.key}>
                      <td className="py-3 font-black text-slate-950 dark:text-white">{holding.name}</td>
                      <td className="font-bold text-slate-500 dark:text-slate-400">{holding.ticker}</td>
                      <td>{holding.quantity.toLocaleString("ko-KR")}</td>
                      <td>{formatMoney(holding.averagePrice, holding.currency)}</td>
                      <td>{formatMoney(holding.currentPrice, holding.currency)}</td>
                      <td>{formatMoney(holding.currentPrice * holding.quantity, holding.currency)}</td>
                      <td>
                        <button className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:text-slate-200" onClick={() => removeDraftHolding(holding.key)} type="button">
                          제거
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!draftHoldings.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">아직 담은 종목이 없습니다. 위에서 종목을 검색해 추가해주세요.</p>}
            </div>
          </section>

          <SavedPortfolioDetail
            detail={selectedDetail}
            loading={loading}
            onDelete={deleteSelectedPortfolio}
            onEditStock={openEditStock}
            onRemoveStock={removeSavedStock}
            stocks={selectedStocks}
          />
        </main>

        <aside className="grid min-w-0 content-start gap-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Saved</p>
                <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">저장된 포트폴리오</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">{portfolios.length}개</span>
                <button className="btn-muted px-3 py-1.5 text-xs 2xl:hidden" type="button" onClick={() => setSavedPanelOpen((open) => !open)}>
                  {savedPanelOpen ? "접기" : "보기"}
                </button>
              </div>
            </div>
            <div className={`${savedPanelOpen ? "grid" : "hidden 2xl:grid"} mt-4 max-h-[620px] gap-2 overflow-y-auto pr-1`}>
              {portfolios.map((portfolio) => {
                const active = String(portfolio.id) === String(selectedId);
                const profit = Number(portfolio.totalProfitLoss || 0);
                return (
                  <button
                    className={`rounded-2xl border p-4 text-left transition ${active ? "border-cyan-400 bg-cyan-50 text-cyan-950 dark:bg-cyan-950 dark:text-cyan-100" : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
                    key={portfolio.id}
                    onClick={() => setSelectedId(String(portfolio.id))}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-base font-black text-slate-950 dark:text-white">{portfolio.name}</strong>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{portfolio.stockCount}개 종목</span>
                      </div>
                      <span className={profit >= 0 ? "text-xs font-black text-cyan-700 dark:text-cyan-300" : "text-xs font-black text-rose-600 dark:text-rose-300"}>
                        {formatPercent(portfolio.totalProfitLossRate)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                      <span className="rounded-xl bg-white/70 px-2 py-1 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">투자금 {formatMoney(portfolio.totalCost)}</span>
                      <span className="rounded-xl bg-white/70 px-2 py-1 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">평가 {formatMoney(portfolio.totalValue)}</span>
                    </div>
                    <p className={profit >= 0 ? "mt-1 text-sm font-black text-cyan-700 dark:text-cyan-300" : "mt-1 text-sm font-black text-rose-600 dark:text-rose-300"}>
                      {formatMoney(portfolio.totalProfitLoss)}
                    </p>
                  </button>
                );
              })}
              {!portfolios.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">저장된 포트폴리오가 없습니다.</p>}
            </div>
          </section>
        </aside>
      </div>

      {editingStock && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4">
          <form className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white" onSubmit={updateSavedStock}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Edit Holding</p>
                <h3 className="mt-1 text-2xl font-black">{editingStock.name}</h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{editingStock.ticker}</p>
              </div>
              <button className="btn-muted text-sm" type="button" onClick={closeEditStock}>
                닫기
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <NumberInput label="수량" value={editStockForm.quantity} onChange={(value) => setEditStockForm({ ...editStockForm, quantity: value })} />
              <NumberInput label="평균 매수가" step="0.01" value={editStockForm.avgPrice} onChange={(value) => setEditStockForm({ ...editStockForm, avgPrice: value })} />
              <NumberInput label="현재가" step="0.01" value={editStockForm.currentPrice} onChange={(value) => setEditStockForm({ ...editStockForm, currentPrice: value })} />
              <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                통화
                <input className="form-control bg-slate-50 dark:bg-slate-800" value={editStockForm.currency} onChange={(event) => setEditStockForm({ ...editStockForm, currency: event.target.value })} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200 sm:col-span-2">
                메모
                <input className="form-control bg-slate-50 dark:bg-slate-800" value={editStockForm.memo} onChange={(event) => setEditStockForm({ ...editStockForm, memo: event.target.value })} />
              </label>
            </div>

            <button className="btn-muted mt-5 min-h-12 w-full text-sm" disabled={loading}>
              수정 저장
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function SavedPortfolioDetail({ detail, stocks, onDelete, onEditStock, onRemoveStock, loading }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Selected Portfolio</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{detail?.name || "선택된 포트폴리오 없음"}</h3>
          {detail?.description && <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{detail.description}</p>}
        </div>
        {detail && (
          <button className="btn-muted text-sm hover:bg-rose-600 hover:text-white" disabled={loading} onClick={onDelete} type="button">
            포트폴리오 삭제
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="투자금" value={formatMoney(detail?.totalCost || 0)} />
        <Metric label="평가금액" value={formatMoney(detail?.totalValue || 0)} />
        <Metric label="평가손익" value={formatMoney(detail?.totalProfitLoss || 0)} tone={Number(detail?.totalProfitLoss || 0) >= 0 ? "positive" : "negative"} />
        <Metric label="수익률" value={formatPercent(detail?.totalProfitLossRate || 0)} tone={Number(detail?.totalProfitLossRate || 0) >= 0 ? "positive" : "negative"} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="py-3">종목</th>
              <th>티커</th>
              <th>수량</th>
              <th>평균단가</th>
              <th>현재가</th>
              <th>투자금</th>
              <th>평가금액</th>
              <th>손익</th>
              <th>수익률</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr className="border-b border-slate-100 dark:border-slate-800" key={stock.id}>
                <td className="py-3 font-black text-slate-950 dark:text-white">{stock.name}</td>
                <td className="font-bold text-slate-500 dark:text-slate-400">{stock.ticker}</td>
                <td>{Number(stock.quantity || 0).toLocaleString("ko-KR")}</td>
                <td>{formatMoney(stock.avgPrice, stock.currency)}</td>
                <td>{formatMoney(stock.currentPrice, stock.currency)}</td>
                <td>{formatMoney(stock.totalCost, stock.currency)}</td>
                <td>{formatMoney(stock.totalValue, stock.currency)}</td>
                <td className={Number(stock.profitLoss || 0) >= 0 ? "font-black text-cyan-700 dark:text-cyan-300" : "font-black text-rose-600 dark:text-rose-300"}>
                  {formatMoney(stock.profitLoss, stock.currency)}
                </td>
                <td className={Number(stock.profitLossRate || 0) >= 0 ? "font-black text-cyan-700" : "font-black text-rose-600"}>
                  {formatPercent(stock.profitLossRate)}
                </td>
                <td>
                  <div className="flex gap-1">
                    <button className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-cyan-600 hover:text-white dark:bg-slate-800 dark:text-slate-200" type="button" onClick={() => onEditStock(stock)}>
                      수정
                    </button>
                    <button className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:text-slate-200" type="button" onClick={() => onRemoveStock(stock)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!stocks.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">선택한 포트폴리오에 등록된 종목이 없습니다.</p>}
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "default" }) {
  const toneClass = tone === "positive" ? "text-cyan-700 dark:text-cyan-300" : tone === "negative" ? "text-rose-600 dark:text-rose-300" : "text-slate-950 dark:text-white";
  return (
    <article className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <strong className={`mt-1 block text-lg font-black ${toneClass}`}>{value}</strong>
    </article>
  );
}

function NumberInput({ label, value, onChange, step = "1" }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <input
        className="form-control bg-slate-50 dark:bg-slate-800"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

export default PortfolioManagementPage;
