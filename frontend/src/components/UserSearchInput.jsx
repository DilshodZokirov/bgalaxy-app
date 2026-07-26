import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";

export default function UserSearchInput({
  onSelect,
  selected,
  onClear,
  disabledIds = [],
  disabledLabel = "Allaqachon a'zo",
  placeholder = "Ism yoki email yozing...",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);
  const blocked = useMemo(() => new Set((disabledIds || []).map(String)), [disabledIds]);

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
      <div className="user-search-selected">
        <div className="avatar-circle user-search-avatar">{selected.full_name.slice(0, 2).toUpperCase()}</div>
        <div className="user-search-selected-copy">
          <div className="user-search-name">{selected.full_name}</div>
          <div className="user-search-email">{selected.email}</div>
        </div>
        <button type="button" className="secondary user-search-change" onClick={onClear}>
          O'zgartirish
        </button>
      </div>
    );
  }

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <div className="user-search-dropdown">
          {results.length > 0
            ? results.map((u) => {
                const isDisabled = blocked.has(String(u.id));
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`user-search-option ${isDisabled ? "is-disabled" : ""}`}
                    disabled={isDisabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (isDisabled) return;
                      onSelect(u);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <div className="user-search-option-main">
                      <div className="user-search-name">{u.full_name}</div>
                      <div className="user-search-email">{u.email}</div>
                    </div>
                    {isDisabled ? (
                      <span className="user-search-badge">{disabledLabel}</span>
                    ) : (
                      <span className="user-search-add">+</span>
                    )}
                  </button>
                );
              })
            : searched && (
                <div className="user-search-empty">
                  Hech narsa topilmadi — bu email BG (Business Galaxy)'da ro'yxatdan o'tmagan.
                </div>
              )}
        </div>
      )}
    </div>
  );
}
