/**
 * Announces attendance using Web Speech API + plays a chime sound.
 */
let announceTimeout: ReturnType<typeof setTimeout> | null = null;
let resumeInterval: ReturnType<typeof setInterval> | null = null;

const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playChime(type: "datang" | "pulang") {
  if (!audioCtx) return;
  // Resume context if suspended (autoplay policy)
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "datang") {
    // Ascending two-tone chime
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, now);      // C5
    osc.frequency.setValueAtTime(659, now + 0.15); // E5
    osc.frequency.setValueAtTime(784, now + 0.3);  // G5
  } else {
    // Descending tone for pulang
    osc.type = "sine";
    osc.frequency.setValueAtTime(784, now);       // G5
    osc.frequency.setValueAtTime(659, now + 0.15); // E5
    osc.frequency.setValueAtTime(523, now + 0.3);  // C5
  }

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc.start(now);
  osc.stop(now + 0.5);
}

export function announceAttendance(
  studentName: string,
  className: string,
  attendanceType: "datang" | "pulang" = "datang",
  status?: string
) {
  if (!("speechSynthesis" in window)) {
    playChime(attendanceType);
    return;
  }

  if (announceTimeout) clearTimeout(announceTimeout);
  if (resumeInterval) clearInterval(resumeInterval);

  // Play chime first
  playChime(attendanceType);

  announceTimeout = setTimeout(() => {
    window.speechSynthesis.cancel();

    const actionText = attendanceType === "pulang"
      ? "telah absen pulang"
      : "telah absen datang";
    const text = `${studentName}, kelas ${className}, ${actionText}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.startsWith("id"));
    if (idVoice) utterance.voice = idVoice;

    utterance.onstart = () => {
      resumeInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          if (resumeInterval) clearInterval(resumeInterval);
        }
      }, 3000);
    };
    utterance.onend = () => { if (resumeInterval) clearInterval(resumeInterval); };
    utterance.onerror = () => { if (resumeInterval) clearInterval(resumeInterval); };

    window.speechSynthesis.speak(utterance);
  }, 600);
}
