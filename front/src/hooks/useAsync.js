import { useCallback, useState } from "react";

export function useAsync(asyncFunction) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError("");
      try {
        return await asyncFunction(...args);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "요청 처리 중 오류가 발생했습니다.");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction],
  );

  return { run, loading, error, setError };
}
