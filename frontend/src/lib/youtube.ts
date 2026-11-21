/** ID video dari tautan YouTube (youtube.com/watch?v=… atau youtu.be/…); null bila bukan tautan YouTube. */
export function youtubeId(url: string): string | null {
  const m = /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[&?#].*)?$/.exec(url)
  return m ? m[1] : null
}

/** URL sematan mode privasi (youtube-nocookie: tanpa cookie pelacak sebelum video diputar). */
export const youtubeEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`
