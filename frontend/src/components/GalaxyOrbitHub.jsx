import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const ORBITS = [
  { n: 1, label: "KORXONA", icon: "🏢", to: "/companies", color: "#3b82f6", angle: 210 },
  { n: 2, label: "VIRTUAL OFFICE", icon: "🏙️", to: "/office", color: "#8b5cf6", angle: 255 },
  { n: 3, label: "MEETING", icon: "🎥", to: "/meetings", color: "#06b6d4", angle: 300 },
  { n: 4, label: "BUXGALTERIYA", icon: "🧾", to: "/accounting", color: "#f59e0b", angle: 345 },
  { n: 5, label: "VAZIFALAR", icon: "🗂️", to: "/tasks", color: "#10b981", angle: 30 },
  { n: 6, label: "DASHBOARD", icon: "📊", to: "/dashboard", color: "#2563eb", angle: 75 },
  { n: 7, label: "CHAT", icon: "💬", to: "/chat", color: "#38bdf8", angle: 120 },
  { n: 8, label: "ANALITIKA", icon: "📈", to: "/analytics", color: "#ec4899", angle: 165 },
];

function polar(angleDeg, radiusPct) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: 50 + radiusPct * Math.cos(rad),
    y: 50 + radiusPct * Math.sin(rad),
  };
}

function Starfield() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.2,
      a: Math.random() * 0.7 + 0.2,
      s: Math.random() * 0.25 + 0.05,
    }));

    function resize() {
      const parent = canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const star of stars) {
        const twinkle = 0.55 + Math.sin(t * 0.002 * star.s + star.x * 20) * 0.45;
        ctx.beginPath();
        ctx.fillStyle = `rgba(226,232,240,${star.a * twinkle})`;
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="orbit-starfield" aria-hidden />;
}

export default function GalaxyOrbitHub({ companyName }) {
  const navigate = useNavigate();

  return (
    <div className="orbit-hub" aria-label="Business Galaxy navigatsiya">
      <Starfield />

      <div className="orbit-nebula n1" />
      <div className="orbit-nebula n2" />
      <div className="orbit-deco-planet p-blue" />
      <div className="orbit-deco-planet p-purple" />
      <div className="orbit-deco-planet p-cyan" />
      <div className="orbit-deco-planet p-amber" />

      <div className="orbit-system">
        <div className="orbit-ring ring-outer" />
        <div className="orbit-ring ring-mid" />
        <div className="orbit-ring ring-inner" />
        <div className="orbit-ring-glow" />

        <button type="button" className="orbit-core" onClick={() => navigate("/dashboard")}>
          <span className="orbit-core-swirl" />
          <span className="orbit-core-halo" />
          <span className="orbit-core-mark">BG</span>
          <span className="orbit-core-title">BUSINESS GALAXY</span>
          {companyName && <span className="orbit-core-sub">{companyName}</span>}
        </button>

        {ORBITS.map((item) => {
          const pos = polar(item.angle, 41);
          return (
            <button
              key={item.n}
              type="button"
              className="orbit-planet"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                "--planet": item.color,
              }}
              onClick={() => navigate(item.to)}
            >
              <span className="orbit-planet-ball">
                <span className="orbit-planet-num">{item.n}</span>
                <span className="orbit-planet-icon">{item.icon}</span>
              </span>
              <span className="orbit-planet-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
