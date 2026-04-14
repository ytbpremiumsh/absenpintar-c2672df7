import { useState, useEffect, useCallback } from "react";

interface TypingEffectProps {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
  className?: string;
}

const TypingEffect = ({ texts, speed = 70, deleteSpeed = 40, pauseTime = 2000, className = "" }: TypingEffectProps) => {
  const [textIndex, setTextIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const currentText = texts[textIndex % texts.length];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayed === currentText) {
      // Pause before deleting
      timer = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && displayed === "") {
      // Move to next text
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % texts.length);
    } else if (isDeleting) {
      timer = setTimeout(() => {
        setDisplayed((prev) => prev.slice(0, -1));
      }, deleteSpeed);
    } else {
      timer = setTimeout(() => {
        setDisplayed(currentText.slice(0, displayed.length + 1));
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [displayed, isDeleting, currentText, speed, deleteSpeed, pauseTime, texts]);

  return (
    <span className={className}>
      <span className="bg-white/[0.12] px-1.5 py-0.5 rounded-md">{displayed}</span>
      <span className="inline-block w-[3px] h-[0.85em] bg-white animate-[blink_1s_step-end_infinite] ml-0.5 align-middle rounded-sm" />
    </span>
  );
};

export default TypingEffect;
