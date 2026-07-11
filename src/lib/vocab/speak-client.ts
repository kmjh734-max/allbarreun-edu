/** Browser TTS via Web Speech API (no API key). */
export function speakEnglish(
  text: string,
  options?: { rate?: number }
): boolean {
  if (typeof window === "undefined") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  const synth = window.speechSynthesis;
  if (!synth) return false;

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = "en-US";
  utterance.rate = options?.rate ?? 0.92;
  synth.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined"
  );
}
