export type BrowserSpeechSynthesisVoice = {
  name: string;
  lang: string;
  localService?: boolean;
  voiceURI?: string;
};

function scoreVoice(voice: BrowserSpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  let score = 0;

  if (lang.startsWith("de-de")) score += 40;
  else if (lang.startsWith("de")) score += 32;
  else if (lang.startsWith("en")) score += 4;

  if (name.includes("google")) score += 28;
  if (name.includes("neural") || name.includes("natural") || name.includes("premium")) score += 20;
  if (name.includes("siri") || name.includes("anna") || name.includes("petra")) score += 12;

  if (name.includes("desktop")) score -= 24;
  if (name.includes("microsoft")) score -= 10;
  if (name.includes("sam")) score -= 40;
  if (name.includes("espeak")) score -= 30;

  if (voice.localService === false) score += 4;

  return score;
}

export function pickPreferredSpeechSynthesisVoice<T extends BrowserSpeechSynthesisVoice>(voices: T[]): T | null {
  if (!voices.length) return null;

  return [...voices].sort((left, right) => scoreVoice(right) - scoreVoice(left))[0] ?? null;
}
