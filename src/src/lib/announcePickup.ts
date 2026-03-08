/**
 * Announces a student pickup using the Web Speech API.
 */
export function announcePickup(studentName: string, className: string) {
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const text = `Perhatian. ${studentName}, kelas ${className}, sudah dijemput oleh wali murid. Terima kasih.`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Try to find Indonesian voice
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => v.lang.startsWith("id"));
  if (idVoice) utterance.voice = idVoice;

  window.speechSynthesis.speak(utterance);
}
