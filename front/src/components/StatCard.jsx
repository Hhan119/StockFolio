function StatCard({ label, value, tone = "default" }) {
  const toneClass = tone === "positive" ? "text-cyan-700" : tone === "negative" ? "text-rose-700" : "text-slate-950";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
      <strong className={`mt-2 block text-2xl font-black ${toneClass}`}>{value}</strong>
    </article>
  );
}

export default StatCard;
