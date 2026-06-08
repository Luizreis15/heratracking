import { useEffect, useRef, useState } from "react";

export function useTypewriter(
  text: string,
  active: boolean,
  charDelay = 18,
): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const prevTextRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idxRef = useRef(0);

  useEffect(() => {
    if (!active || !text) {
      setDisplayed(text ?? "");
      setDone(true);
      return;
    }

    // If text grew (new content appended), continue from where we left off
    if (text.startsWith(prevTextRef.current)) {
      // resume from current position
    } else {
      // completely new text — reset
      idxRef.current = 0;
      setDisplayed("");
      setDone(false);
    }
    prevTextRef.current = text;

    const type = () => {
      if (idxRef.current >= text.length) {
        setDone(true);
        return;
      }
      idxRef.current += 1;
      setDisplayed(text.slice(0, idxRef.current));
      timerRef.current = setTimeout(type, charDelay);
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(type, charDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, active, charDelay]);

  return { displayed, done };
}
