function StateMessage({ type = "info", children }) {
  if (!children) return null;
  const styles = {
    info: "bg-slate-50 text-slate-600",
    error: "bg-rose-50 text-rose-700",
    success: "bg-emerald-50 text-emerald-700",
  };

  return <p className={`rounded-2xl p-3 text-sm font-black ${styles[type]}`}>{children}</p>;
}

export default StateMessage;
