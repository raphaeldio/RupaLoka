/**
 * Suara pemandu (Web Speech API, bahasa Indonesia) untuk pengguna tuna netra yang tidak
 * memakai pembaca layar. Pengguna pembaca layar cukup memakai wilayah aria-live; suara ini
 * opsional (tombol "Suara pemandu") agar tidak bertabrakan dengan suara pembaca layar.
 */
export const speechAvailable = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

export function speak(text: string): void {
  if (!speechAvailable() || !text) return
  const synth = window.speechSynthesis
  synth.cancel() // kalimat baru menggantikan yang lama
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'id-ID'
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('id'))
  if (voice) u.voice = voice
  u.rate = 1
  synth.speak(u)
}

export function stopSpeaking(): void {
  if (speechAvailable()) window.speechSynthesis.cancel()
}
