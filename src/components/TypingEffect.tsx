import { useState, useEffect } from "react";

interface TypingEffectProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const TypingEffect = ({ text, speed = 80, className = "", onComplete }: TypingEffectProps) => {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayed("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayed((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      onComplete?.();
    }
  }, [index, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {index < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-primary animate-pulse ml-0.5 align-middle" />
      )}
    </span>
  );
};

export default TypingEffect;
