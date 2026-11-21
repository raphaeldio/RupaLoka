import { describe, expect, it } from 'vitest'
import { youtubeEmbed, youtubeId } from './youtube'

describe('youtubeId', () => {
  it('mengenali tautan watch dan youtu.be', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=gxwPUVEXPtI')).toBe('gxwPUVEXPtI')
    expect(youtubeId('https://youtu.be/CNhLfbH3Nlc?t=10')).toBe('CNhLfbH3Nlc')
    expect(youtubeId('https://youtube.com/watch?v=VRAXz6ayIeY&list=x')).toBe('VRAXz6ayIeY')
  })
  it('menolak tautan lain', () => {
    expect(youtubeId('https://vimeo.com/123')).toBeNull()
    expect(youtubeId('javascript:alert(1)')).toBeNull()
    expect(youtubeId('https://www.youtube.com/watch?v=short')).toBeNull()
  })
  it('membuat URL sematan nocookie', () => {
    expect(youtubeEmbed('gxwPUVEXPtI')).toBe('https://www.youtube-nocookie.com/embed/gxwPUVEXPtI?rel=0')
  })
})
