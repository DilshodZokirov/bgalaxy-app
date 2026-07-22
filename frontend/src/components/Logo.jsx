export default function Logo({ withTagline = false, compact = false }) {
  return (
    <div className="logo">
      <span className="logo-mark">BG</span>
      {!compact && (
        <span>
          BG
          <span className="logo-sub">(Business Galaxy)</span>
          {withTagline && <span className="logo-sub">One Galaxy. Endless Business.</span>}
        </span>
      )}
    </div>
  );
}
