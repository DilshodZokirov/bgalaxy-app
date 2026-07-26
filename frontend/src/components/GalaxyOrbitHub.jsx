import { useNavigate } from "react-router-dom";

const ORBITS = [
  { n: 1, label: "KORXONA", icon: "🏢", to: "/companies", color: "#60a5fa", angle: -90 },
  { n: 2, label: "VIRTUAL OFFICE", icon: "🏙️", to: "/office", color: "#a78bfa", angle: -45 },
  { n: 3, label: "MEETING", icon: "🎥", to: "/meetings", color: "#22d3ee", angle: 0 },
  { n: 4, label: "BUXGALTERIYA", icon: "🧾", to: "/accounting", color: "#fbbf24", angle: 45 },
  { n: 5, label: "VAZIFALAR", icon: "🗂️", to: "/tasks", color: "#34d399", angle: 90 },
  { n: 6, label: "CHAT", icon: "💬", to: "/chat", color: "#38bdf8", angle: 135 },
  { n: 7, label: "ANALITIKA", icon: "📈", to: "/analytics", color: "#f472b6", angle: 180 },
  { n: 8, label: "AI ZIYO", icon: "🤖", to: "/rafiq", color: "#c084fc", angle: 225 },
];

function polar(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 + radius * Math.sin(rad),
  };
}

export default function GalaxyOrbitHub({ companyName }) {
  const navigate = useNavigate();

  return (
    <div className="orbit-hub" aria-label="Business Galaxy navigatsiya">
      <div className="orbit-hub-glow" />
      <div className="orbit-ring orbit-ring-a" />
      <div className="orbit-ring orbit-ring-b" />
      <div className="orbit-ring orbit-ring-c" />

      <div className="orbit-core" onClick={() => navigate("/dashboard")}>
        <div className="orbit-core-spin" />
        <div className="orbit-core-mark">BG</div>
        <div className="orbit-core-title">BUSINESS GALAXY</div>
        {companyName && <div className="orbit-core-sub">{companyName}</div>}
      </div>

      {ORBITS.map((item) => {
        const pos = polar(item.angle, 38);
        return (
          <button
            key={item.n}
            type="button"
            className="orbit-planet"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              "--planet": item.color,
              animationDelay: `${item.n * 0.12}s`,
            }}
            onClick={() => navigate(item.to)}
          >
            <span className="orbit-planet-num">{item.n}</span>
            <span className="orbit-planet-icon">{item.icon}</span>
            <span className="orbit-planet-label">{item.label}</span>
          </button>
        );
      })}

      <span className="orbit-dust d1" />
      <span className="orbit-dust d2" />
      <span className="orbit-dust d3" />
      <span className="orbit-dust d4" />
    </div>
  );
}
