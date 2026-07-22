import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LockManager() {
  const { user, lockScreen } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    const minutes = user?.auto_lock_minutes || 0;
    if (!user?.has_pin || !minutes) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lockScreen();
      }, minutes * 60 * 1000);
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.has_pin, user?.auto_lock_minutes, lockScreen]);

  return null;
}
