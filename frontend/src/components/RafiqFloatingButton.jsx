import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getActiveCompanyId, setActiveCompanyId } from "../hooks/useCompany";

const WAKE_WORD = "ziyo";

const SpeechRecognitionAPI =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function RafiqFloatingButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | listening | thinking | speaking
  const recognitionRef = useRef(null);
  const awaitingCommandRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (location.pathname.startsWith("/rafiq")) return undefined; // the dedicated page is text-only, avoid mic contention
    if (!enabled || !SpeechRecognitionAPI) return undefined;

    stoppedRef.current = false;
    startListening();

    return () => {
      stoppedRef.current = true;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, [enabled, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  function startListening() {
    if (stoppedRef.current) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "uz-UZ";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus("listening");
    recognition.onerror = () => {};
    recognition.onend = () => {
      if (!stoppedRef.current) {
        // Keep the wake-word listener alive in the background.
        setTimeout(() => startListening(), 300);
      }
    };
    recognition.onresult = (event) => {
      const said = event.results[event.results.length - 1][0].transcript.trim();
      const lower = said.toLowerCase();

      if (awaitingCommandRef.current) {
        awaitingCommandRef.current = false;
        handleCommand(said);
        return;
      }

      if (lower.includes(WAKE_WORD)) {
        const afterWake = said.slice(lower.indexOf(WAKE_WORD) + WAKE_WORD.length).trim();
        if (afterWake.length > 2) {
          handleCommand(afterWake);
        } else {
          awaitingCommandRef.current = true;
          setStatus("listening");
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // already running — ignore
    }
  }

  async function handleCommand(text) {
    setStatus("thinking");
    try {
      const activeCompanyId = getActiveCompanyId();
      const reply = await api.sendRafiqMessage(text, activeCompanyId);
      speak(reply.content);
      if (reply.client_action?.type === "navigate") {
        if (reply.client_action.set_active_company_id) {
          setActiveCompanyId(reply.client_action.set_active_company_id);
        }
        setTimeout(() => navigate(reply.client_action.path), 900);
      }
    } catch {
      speak("Kechirasiz, javob bera olmadim.");
    }
  }

  function speak(text) {
    if (!window.speechSynthesis) {
      setStatus("listening");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "uz-UZ";
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("listening");
    window.speechSynthesis.speak(utterance);
  }

  if (location.pathname.startsWith("/rafiq")) return null;

  const icons = { idle: "🤖", listening: "🎙️", thinking: "💭", speaking: "🔊" };

  return (
    <button
      className="rafiq-fab"
      onClick={() => setEnabled((v) => !v)}
      title={
        enabled
          ? `Faol — "${WAKE_WORD}" deb ayting, keyin buyrug'ingizni gapiring (bosib o'chirish mumkin)`
          : "O'chirilgan — yoqish uchun bosing"
      }
    >
      {enabled ? icons[status] : "🤖"} Ziyo
    </button>
  );
}
