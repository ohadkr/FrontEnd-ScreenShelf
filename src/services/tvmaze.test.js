import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchShowEpisodes, fetchShows } from './tvmaze'

describe('fetchShows', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('fetchShowEpisodes', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('loads the episode list for a show', async () => {
      const episodes = [{ id: 1, name: 'Pilot', season: 1 }]
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(episodes),
      })
      vi.stubGlobal('fetch', fetch)

      await expect(fetchShowEpisodes(42)).resolves.toEqual(episodes)
      expect(fetch).toHaveBeenCalledWith('https://api.tvmaze.com/shows/42/episodes', { signal: undefined })
    })

    it('throws when the episode request fails or returns an unexpected response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
      await expect(fetchShowEpisodes(42)).rejects.toThrow('TVmaze episode request failed (404)')

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ error: 'unexpected' }),
      }))
      await expect(fetchShowEpisodes(42)).rejects.toThrow('TVmaze returned an unexpected episode response')
    })
  })

  it('returns the TVmaze show array', async () => {
    const shows = [{ id: 1, name: 'Example' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(shows),
    }))

    await expect(fetchShows()).resolves.toEqual(shows)
  })

  it('throws when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }))

    await expect(fetchShows()).rejects.toThrow('TVmaze request failed (503)')
  })

  it('throws when the response is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ error: 'unexpected' }),
    }))

    await expect(fetchShows()).rejects.toThrow('TVmaze returned an unexpected response')
  })
})
