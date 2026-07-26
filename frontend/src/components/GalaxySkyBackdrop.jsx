/** Decorative day/night sky layers for the cosmic dashboard. */
export default function GalaxySkyBackdrop({ mode = "night" }) {
  if (mode === "day") {
    return (
      <div className="galaxy-sky galaxy-sky-day" aria-hidden>
        <div className="galaxy-sky-sun" />
        <div className="galaxy-sky-ray r1" />
        <div className="galaxy-sky-ray r2" />
        <div className="galaxy-sky-cloud c1" />
        <div className="galaxy-sky-cloud c2" />
        <div className="galaxy-sky-cloud c3" />
        <div className="galaxy-sky-flare f1" />
        <div className="galaxy-sky-flare f2" />
      </div>
    );
  }

  return (
    <div className="galaxy-sky galaxy-sky-night" aria-hidden>
      <div className="galaxy-sky-moon" />
      <div className="galaxy-sky-glow g1" />
      <div className="galaxy-sky-glow g2" />
      <div className="galaxy-sky-glow g3" />
      <div className="galaxy-sky-mist" />
    </div>
  );
}
