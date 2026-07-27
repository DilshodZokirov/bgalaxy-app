import { useEffect, useState } from "react";

const SCRIPT = [
  "Salom! Men Ziyo.",
  "BG (Business Galaxy) platformasining AI yordamchisiman.",
  "Uchrashuvlaringizni rejalashtiraman, hujjatlarni tahlil qilaman va jamoangizga har doim yordam beraman.",
  "Ro'yxatdan o'ting — birga ishlashni boshlaymiz!",
];

export default function RafiqWidget() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      while (!cancelled) {
        for (let i = 1; i <= SCRIPT.length; i++) {
          setTyping(true);
          await wait(900);
          if (cancelled) return;
          setTyping(false);
          setVisibleCount(i);
          await wait(1500);
          if (cancelled) return;
        }
        await wait(2200);
        if (cancelled) return;
        setVisibleCount(0);
        await wait(400);
      }
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rafiq-widget rafiq-widget-slim">
      <div className="rafiq-widget-header">
        <div>
          <div className="title">AI Ziyo</div>
          <div className="status">
            <span className="dot" />
            Onlayn · suhbat
          </div>
        </div>
      </div>
      <div className="rafiq-chat-log">
        {SCRIPT.slice(0, visibleCount).map((line, i) => (
          <div className="rafiq-line" key={i}>
            {line}
          </div>
        ))}
        {typing && (
          <div className="rafiq-typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </div>
  );
}
