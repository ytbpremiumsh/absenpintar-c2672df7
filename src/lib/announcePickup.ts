/**
 * Announces a student pickup using the Web Speech API.
 * Uses a short delay and resume workaround to prevent
 * the speech from being cut off by DOM changes (popups, re-renders).
 */
let announceTimeout: ReturnType<typeof setTimeout> | null = null;
let resumeInterval: ReturnType<typeof setInterval> | null = null;

export function announcePickup(studentName: string, className: string, type: "picked_up" | "dismissed" = "picked_up") {
  if (!("speechSynthesis" in window)) return;

  // Clear any pending announcement
  if (announceTimeout) clearTimeout(announceTimeout);
  if (resumeInterval) clearInterval(resumeInterval);

  // Small delay to let DOM settle (popup rendering)
  announceTimeout = setTimeout(() => {
    window.speechSynthesis.cancel();

    const actionText = type === "dismissed"
      ? "sudah pulang"
      : "telah dijemput";
    const text = `Perhatian. ${studentName}, kelas ${className}, ${actionText}. Terima kasih.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find Indonesian voice
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.startsWith("id"));
    if (idVoice) utterance.voice = idVoice;

    // Chrome bug workaround: periodically call resume() to prevent
    // the browser from pausing/stopping the speech mid-sentence.
    utterance.onstart = () => {
      resumeInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          if (resumeInterval) clearInterval(resumeInterval);
        }
      }, 3000);
    };

    utterance.onend = () => {
      if (resumeInterval) clearInterval(resumeInterval);
    };

    utterance.onerror = () => {
      if (resumeInterval) clearInterval(resumeInterval);
    };

    window.speechSynthesis.speak(utterance);
  }, 500);
}
