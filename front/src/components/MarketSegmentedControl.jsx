const filters = [
  { key: "all", label: "전체" },
  { key: "domestic", label: "국내" },
  { key: "overseas", label: "해외" },
];

function MarketSegmentedControl({ value, onChange, counts = {} }) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
      {filters.map((filter) => {
        const active = value === filter.key;
        return (
          <button
            className={[
              "rounded-xl px-4 py-2 text-sm font-black transition",
              active ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white",
            ].join(" ")}
            key={filter.key}
            type="button"
            onClick={() => onChange(filter.key)}
          >
            {filter.label}
            {typeof counts[filter.key] === "number" && <span className="ml-2 text-xs opacity-70">{counts[filter.key]}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default MarketSegmentedControl;
