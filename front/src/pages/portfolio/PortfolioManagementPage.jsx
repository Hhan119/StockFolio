import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { portfolioService } from "../../services/portfolioService.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

const emptyForm = { name: "", description: "", initialCapital: 0 };

function PortfolioManagementPage() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "", initialCapital: "" });
  const [editForm, setEditForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSummary = useMemo(
    () => portfolios.find((portfolio) => String(portfolio.id) === String(selectedId)),
    [portfolios, selectedId],
  );

  const loadPortfolios = async (nextSelectedId = selectedId) => {
    const data = await portfolioService.list();
    setPortfolios(data);
    if (data.length === 0) {
      setSelectedId("");
      setDetail(null);
      return;
    }
    const nextId = nextSelectedId && data.some((item) => String(item.id) === String(nextSelectedId))
      ? String(nextSelectedId)
      : String(data[0].id);
    setSelectedId(nextId);
  };

  const loadDetail = async (portfolioId) => {
    if (!portfolioId) {
      setDetail(null);
      setEditForm(emptyForm);
      return;
    }
    const data = await portfolioService.detail(portfolioId);
    setDetail(data);
    setEditForm({
      name: data.name || "",
      description: data.description || "",
      initialCapital: data.initialCapital ?? 0,
    });
  };

  useEffect(() => {
    loadPortfolios().catch(() => setError("포트폴리오 목록을 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    loadDetail(selectedId).catch(() => setError("포트폴리오 상세 정보를 불러오지 못했습니다."));
  }, [selectedId]);

  const createPortfolio = async (event) => {
    event.preventDefault();
    if (!createForm.name.trim()) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const created = await portfolioService.create({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        initialCapital: Number(createForm.initialCapital || 0),
      });
      setCreateForm({ name: "", description: "", initialCapital: "" });
      await loadPortfolios(created.id);
      setMessage("새 포트폴리오를 저장했습니다.");
    } catch {
      setError("포트폴리오 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const updatePortfolio = async (event) => {
    event.preventDefault();
    if (!selectedId || !editForm.name.trim()) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await portfolioService.update(selectedId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        initialCapital: Number(editForm.initialCapital || 0),
      });
      await loadPortfolios(selectedId);
      await loadDetail(selectedId);
      setMessage("포트폴리오 정보를 수정했습니다.");
    } catch {
      setError("포트폴리오 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const deletePortfolio = async () => {
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

  const stocks = detail?.stocks || [];

  return (
    <section className="grid gap-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Portfolio Manager</p>
        <div className="mt-2 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-3xl font-black">내 포트폴리오</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold text-slate-400">
              투자 목적별로 여러 포트폴리오를 저장하고, 각 포트폴리오의 평가금액과 수익률을 따로 관리합니다.
            </p>
          </div>
          <Link className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300" to="/portfolio/holdings">
            보유종목 등록하기
          </Link>
        </div>
      </header>

      {(message || error) && (
        <p className={`rounded-2xl px-4 py-3 text-sm font-black ${error ? "bg-rose-50 text-rose-700" : "bg-cyan-50 text-cyan-800"}`}>
          {error || message}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="grid gap-4">
          <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {portfolios.map((portfolio) => {
              const active = String(portfolio.id) === String(selectedId);
              const profit = Number(portfolio.totalProfitLoss || 0);
              return (
                <button
                  className={[
                    "rounded-2xl border p-4 text-left shadow-sm transition",
                    active ? "border-cyan-400 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900 hover:border-cyan-300",
                  ].join(" ")}
                  key={portfolio.id}
                  onClick={() => setSelectedId(String(portfolio.id))}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-lg font-black">{portfolio.name}</strong>
                      <span className={active ? "text-sm font-bold text-slate-400" : "text-sm font-bold text-slate-500"}>
                        {portfolio.stockCount}개 종목
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-black ${profit >= 0 ? "bg-cyan-500/15 text-cyan-300" : "bg-rose-500/15 text-rose-300"}`}>
                      {formatPercent(portfolio.totalProfitLossRate)}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-1">
                    <span className={active ? "text-xs font-black text-slate-500" : "text-xs font-black text-slate-400"}>평가금액</span>
                    <strong className="text-2xl font-black">{formatMoney(portfolio.totalValue)}</strong>
                  </div>
                </button>
              );
            })}
            {!portfolios.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm font-bold text-slate-500">
                아직 저장된 포트폴리오가 없습니다. 오른쪽에서 새 포트폴리오를 만들어주세요.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Selected Portfolio</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">{detail?.name || selectedSummary?.name || "선택된 포트폴리오 없음"}</h3>
              </div>
              {selectedId && (
                <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-rose-600" disabled={loading} onClick={deletePortfolio} type="button">
                  삭제
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
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3">종목</th>
                    <th>티커</th>
                    <th>수량</th>
                    <th>현재가</th>
                    <th>평가금액</th>
                    <th>수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.slice(0, 8).map((stock) => (
                    <tr className="border-b border-slate-100" key={stock.id}>
                      <td className="py-3 font-black text-slate-950">{stock.name}</td>
                      <td className="font-bold text-slate-500">{stock.ticker}</td>
                      <td>{Number(stock.quantity || 0).toLocaleString("ko-KR")}</td>
                      <td>{formatMoney(stock.currentPrice, stock.currency)}</td>
                      <td>{formatMoney(stock.totalValue, stock.currency)}</td>
                      <td className={Number(stock.profitLossRate || 0) >= 0 ? "font-black text-cyan-700" : "font-black text-rose-600"}>
                        {formatPercent(stock.profitLossRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!stocks.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">이 포트폴리오에 등록된 보유종목이 없습니다.</p>}
            </div>
          </section>
        </main>

        <aside className="grid content-start gap-4">
          <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={createPortfolio}>
            <h3 className="text-xl font-black text-slate-950">새 포트폴리오 저장</h3>
            <div className="mt-4 grid gap-3">
              <TextInput label="이름" value={createForm.name} onChange={(value) => setCreateForm({ ...createForm, name: value })} placeholder="예: 장기 배당 포트폴리오" />
              <TextInput label="설명" value={createForm.description} onChange={(value) => setCreateForm({ ...createForm, description: value })} placeholder="투자 목적이나 전략" />
              <TextInput label="초기 자본" type="number" value={createForm.initialCapital} onChange={(value) => setCreateForm({ ...createForm, initialCapital: value })} />
            </div>
            <button className="mt-4 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 hover:bg-cyan-300" disabled={loading}>
              저장
            </button>
          </form>

          <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={updatePortfolio}>
            <h3 className="text-xl font-black text-slate-950">선택 포트폴리오 수정</h3>
            <div className="mt-4 grid gap-3">
              <TextInput label="이름" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} />
              <TextInput label="설명" value={editForm.description} onChange={(value) => setEditForm({ ...editForm, description: value })} />
              <TextInput label="초기 자본" type="number" value={editForm.initialCapital} onChange={(value) => setEditForm({ ...editForm, initialCapital: value })} />
            </div>
            <button className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800" disabled={loading || !selectedId}>
              수정 저장
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "default" }) {
  const toneClass = tone === "positive" ? "text-cyan-700" : tone === "negative" ? "text-rose-600" : "text-slate-950";
  return (
    <article className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
      <strong className={`mt-1 block text-xl font-black ${toneClass}`}>{value}</strong>
    </article>
  );
}

function TextInput({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input
        className="form-control bg-slate-50"
        min={type === "number" ? 0 : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

export default PortfolioManagementPage;
