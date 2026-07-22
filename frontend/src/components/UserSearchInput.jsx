import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

export default function UserSearchInput({ onSelect, selected, onClear }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchUsers(query.trim());
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearched(true);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  if (selected) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--panel-2)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 12px",
        }}
      >
        <div className="avatar-circle" style={{ width: 28, height: 28, fontSize: 11 }}>
          {selected.full_name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5 }}>{selected.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{selected.email}</div>
        </div>
        <button
          type="button"
          className="secondary"
          style={{ width: "auto", padding: "5px 10px", fontSize: 12 }}
          onClick={onClear}
        >
          O'zgartirish
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        placeholder="Ism yoki email bo'yicha qidiring..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <div
          style={{
            marginTop: 4,
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}
        >
          {results.length > 0
            ? results.map((u) => (
                <div
                  key={u.id}
                  onClick={() => {
                    onSelect(u);
                    setQuery("");
                    setResults([]);
                  }}
                  style={{
                    padding: "10px 12px",
                    fontSize: 13.5,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div>{u.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{u.email}</div>
                </div>
              ))
            : searched && (
                <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-dim)" }}>
                  Hech narsa topilmadi — bu email BG (Business Galaxy)'da ro'yxatdan o'tmagan.
                </div>
              )}
        </div>
      )}
    </div>
  );
}
