import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchShows } from './tvmaze'

describe('fetchShows', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
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
