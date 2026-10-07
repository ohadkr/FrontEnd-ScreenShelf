import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchShowEpisodes, fetchShows } from './services/tvmaze'

vi.mock('./services/tvmaze', () => ({
  fetchShowEpisodes: vi.fn(),
  fetchShows: vi.fn(),
}))

const testShows = [
  {
    id: 1,
    name: 'Zeta Show',
    image: { medium: 'https://example.com/zeta.jpg' },
    summary: '<p>Zeta summary</p>',
    genres: ['Drama'],
    rating: { average: 9 },
    status: 'Running',
    premiered: '2020-01-01',
    network: { name: 'Example Network' },
  },
  {
    id: 2,
    name: 'Alpha Show',
    image: null,
    summary: '<p>Alpha summary</p>',
    genres: ['Comedy'],
    rating: { average: 8 },
    status: 'Ended',
    premiered: '2015-04-10',
    network: null,
  },
  {
    id: 3,
    name: 'Unrated Drama',
    image: { medium: 'https://example.com/unrated.jpg' },
    summary: null,
    genres: ['Drama'],
    rating: { average: null },
    status: null,
    premiered: null,
    network: null,
  },
]

async function renderLoadedApp() {
  fetchShows.mockResolvedValue(testShows)
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('button', { name: 'Show details for Alpha Show' })
  return user
}

describe('show browser', () => {
  beforeEach(() => {
    fetchShows.mockReset()
    fetchShowEpisodes.mockReset().mockResolvedValue([])
    localStorage.clear()
    window.history.replaceState(null, '', '#/browse')
  })

  it('searches and filters shows, then clears the filters', async () => {
    const user = await renderLoadedApp()
    const search = screen.getByRole('searchbox', { name: 'Search shows' })
    const genre = screen.getByRole('button', { name: 'Drama, 2 shows' })

    await user.type(search, 'zeta')
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(1)

    await user.clear(search)
    await user.click(genre)
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(search.value).toBe('')
    expect(screen.getByRole('button', { name: 'Drama, 2 shows' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(3)
  })

  it('searches genre names and filters using the compact genre cards', async () => {
    const user = await renderLoadedApp()
    const search = screen.getByRole('searchbox', { name: 'Search shows' })

    await user.type(search, 'comedy')
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Show details for Alpha Show' })).not.toBeNull()

    await user.clear(search)
    await user.click(screen.getByRole('button', { name: 'Comedy, 1 show' }))
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Show details for Alpha Show' })).not.toBeNull()
  })

  it('filters out unrated shows at a minimum rating and sorts highest-rated first', async () => {
    const user = await renderLoadedApp()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Minimum rating' }), '8')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'popular')

    const cards = screen.getAllByRole('button', { name: /Show details for/ })
    expect(cards).toHaveLength(2)
    expect(cards[0].getAttribute('aria-label')).toBe('Show details for Zeta Show')
    expect(cards[1].getAttribute('aria-label')).toBe('Show details for Alpha Show')
  })

  it('filters by status, network, and premiere year together', async () => {
    const user = await renderLoadedApp()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Running')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Network' }), 'Example Network')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Premiere year' }), '2020')

    const cards = screen.getAllByRole('button', { name: /Show details for/ })
    expect(cards).toHaveLength(1)
    expect(cards[0].getAttribute('aria-label')).toBe('Show details for Zeta Show')
  })

  it('loads more results in batches and resets pagination when filters change', async () => {
    fetchShows.mockResolvedValue([
      ...testShows,
      ...Array.from({ length: 62 }, (_, index) => ({
        id: index + 4,
        name: `Sample Show ${index + 4}`,
        image: null,
        summary: null,
        genres: ['Drama'],
        rating: { average: 7 },
        status: 'Running',
        premiered: '2020-01-01',
        network: { name: 'Example Network' },
      })),
    ])
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: 'Show details for Alpha Show' })
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(30)

    await user.click(screen.getByRole('button', { name: /Load more shows/ }))
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(60)

    await user.type(screen.getByRole('searchbox', { name: 'Search shows' }), 'zeta')
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Load more shows/ })).toBeNull()
  })

  it('updates the details panel with the selected show metadata', async () => {
    const user = await renderLoadedApp()
    await user.click(screen.getByRole('button', { name: 'Show details for Alpha Show' }))

    const details = screen.getByRole('region', { name: 'Alpha Show' })
    expect(within(details).getByText('Alpha summary')).not.toBeNull()
    expect(within(details).getByRole('heading', { name: 'Alpha Show' })).not.toBeNull()
    expect(within(details).getByText('Comedy')).not.toBeNull()
    expect(details.querySelector('.show-page-rating')?.textContent).toContain('8')
    expect(within(details).getByText('Ended')).not.toBeNull()
    expect(within(details).getByText('2015-04-10')).not.toBeNull()
    expect(within(details).getAllByText('Unknown')).toHaveLength(1)
  })

  it('shows a fallback when a poster is missing or fails to load', async () => {
    await renderLoadedApp()

    expect(screen.getByRole('img', { name: 'Alpha Show poster unavailable' })).not.toBeNull()
    fireEvent.error(screen.getByRole('img', { name: 'Zeta Show poster' }))
    expect(screen.getByRole('img', { name: 'Zeta Show poster unavailable' })).not.toBeNull()
  })

  it('shows an API error and retries successfully', async () => {
    fetchShows
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(testShows)
    const user = userEvent.setup()
    render(<App />)

    expect((await screen.findByRole('alert')).textContent).toContain('Network unavailable')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show details for Alpha Show' })).not.toBeNull()
    })
    expect(fetchShows).toHaveBeenCalledTimes(2)
  })

  it('adds and removes favorites and persists them between renders', async () => {
    const user = await renderLoadedApp()
    const addFavorite = screen.getByRole('button', { name: 'Add Alpha Show to favorites' })
    await user.click(addFavorite)

    expect(localStorage.getItem('tv-show-favorites')).toBe('[2]')
    await user.click(screen.getByRole('button', { name: /Favorites/ }))
    expect(screen.getByRole('button', { name: 'Show details for Alpha Show' })).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Remove Alpha Show from favorites' }))
    expect(localStorage.getItem('tv-show-favorites')).toBe('[]')
    expect(screen.getByText('Your watchlist is waiting')).not.toBeNull()
  })

  it('navigates between browse, show details, and favorites without reloading the document', async () => {
    const user = await renderLoadedApp()
    const documentElement = document.documentElement

    await user.type(screen.getByRole('searchbox', { name: 'Search shows' }), 'zeta')
    await user.click(screen.getByRole('button', { name: 'Show details for Zeta Show' }))
    expect(window.location.hash).toBe('#/shows/1')
    expect(screen.getByRole('heading', { name: 'Zeta Show' })).not.toBeNull()
    expect(document.documentElement).toBe(documentElement)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Zeta Show' }))

    await user.click(screen.getByRole('button', { name: 'Back to all shows' }))
    expect(window.location.hash).toBe('#/browse')
    expect(screen.getByRole('heading', { name: 'Explore by genre' })).not.toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Search shows' }).value).toBe('zeta')
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Find your next favorite' }))

    await user.click(screen.getByRole('button', { name: 'Favorites 0' }))
    expect(window.location.hash).toBe('#/favorites')
    expect(screen.getByRole('heading', { name: 'Your favorites' })).not.toBeNull()
  })

  it('opens a shareable show URL directly', async () => {
    window.history.replaceState(null, '', '#/shows/2')
    fetchShows.mockResolvedValue(testShows)
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Alpha Show' })).not.toBeNull()
    expect(window.location.hash).toBe('#/shows/2')
    expect(document.title).toBe('Alpha Show | ScreenShelf')
    await waitFor(() => expect(localStorage.getItem('tv-show-recent')).toBe('[2]'))
  })

  it('saves the dark theme preference between visits', async () => {
    const user = await renderLoadedApp()
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(document.querySelector('.shows-page').classList.contains('theme-dark')).toBe(true)
    expect(localStorage.getItem('tv-show-theme')).toBe('dark')
  })

  it('offers a shareable URL on the show page', async () => {
    const user = await renderLoadedApp()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    await user.click(screen.getByRole('button', { name: 'Show details for Zeta Show' }))
    await user.click(screen.getByRole('button', { name: 'Share show' }))

    expect(window.location.hash).toBe('#/shows/1')
    expect(await screen.findByText('Show link copied.')).not.toBeNull()
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#/shows/1'))
  })

  it('lets me surprise myself with a show from the current results', async () => {
    const user = await renderLoadedApp()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    await user.click(screen.getByRole('button', { name: 'Surprise me' }))

    expect(await screen.findByRole('heading', { name: 'Zeta Show' })).not.toBeNull()
    expect(window.location.hash).toBe('#/shows/1')
    random.mockRestore()
  })

  it('saves watchlist statuses and filters the catalog by status', async () => {
    const user = await renderLoadedApp()
    await user.click(screen.getByRole('button', { name: 'Show details for Zeta Show' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Watch status for Zeta Show' }), 'watching')

    expect(JSON.parse(localStorage.getItem('tv-show-watch-statuses'))).toEqual({ 1: 'watching' })
    await user.click(screen.getByRole('button', { name: 'Back to all shows' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Watchlist status' }), 'watching')

    expect(screen.getAllByRole('button', { name: /Show details for/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Show details for Zeta Show' })).not.toBeNull()
  })

  it('compares up to three shows side by side', async () => {
    fetchShows.mockResolvedValue([
      ...testShows,
      { ...testShows[0], id: 4, name: 'Fourth Show' },
    ])
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: 'Show details for Fourth Show' })

    for (const name of ['Zeta Show', 'Alpha Show', 'Unrated Drama']) {
      const tile = screen.getByRole('button', { name: `Show details for ${name}` }).closest('li')
      await user.click(within(tile).getByRole('button', { name: 'Compare' }))
    }
    const fourthTile = screen.getByRole('button', { name: 'Show details for Fourth Show' }).closest('li')
    await user.click(within(fourthTile).getByRole('button', { name: 'Compare' }))

    expect(screen.getByRole('heading', { name: 'Compare shows (3/3)' })).not.toBeNull()
    expect(screen.getByText('Compare up to 3 shows at a time.')).not.toBeNull()
    expect(screen.getByRole('table', { name: 'Show ratings, genres, status, and premiere dates' })).not.toBeNull()
  })

  it('shows episode counts and recommendations with a provider search link', async () => {
    fetchShowEpisodes.mockResolvedValue([
      { id: 101, season: 1, number: 1, name: 'Pilot', airdate: '2020-01-01' },
      { id: 102, season: 2, number: 1, name: 'New Start', airdate: '2021-01-01' },
    ])
    const user = await renderLoadedApp()
    await user.click(screen.getByRole('button', { name: 'Show details for Zeta Show' }))

    expect(await screen.findByText('2 seasons · 2 episodes')).not.toBeNull()
    expect(screen.getByText('Pilot')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Similar shows' })).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Search where to watch' }).getAttribute('href')).toContain('where%20to%20watch%20Zeta%20Show')
  })

  it('records recently viewed shows and provides collection import and export', async () => {
    const user = await renderLoadedApp()
    await user.click(screen.getByRole('button', { name: 'Show details for Alpha Show' }))
    await user.click(screen.getByRole('button', { name: 'Back to all shows' }))
    expect(screen.getByRole('heading', { name: 'Recently viewed' })).not.toBeNull()
    expect(localStorage.getItem('tv-show-recent')).toBe('[2]')

    await user.click(screen.getByRole('button', { name: /Favorites/ }))
    const createObjectURL = vi.fn().mockReturnValue('blob:screenshelf')
    const revokeObjectURL = vi.fn()
    const clickDownload = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    await user.click(screen.getByRole('button', { name: 'Export collection' }))
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickDownload).toHaveBeenCalledOnce()
    clickDownload.mockRestore()
    expect(await screen.findByText('Your collection was exported.')).not.toBeNull()

    const importFile = new File([
      JSON.stringify({ version: 1, favoriteIds: [1], watchStatuses: { 1: 'planned' } }),
    ], 'screenshelf.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Import ScreenShelf collection file'), importFile)
    expect(await screen.findByText('Your collection was imported.')).not.toBeNull()
    expect(localStorage.getItem('tv-show-favorites')).toBe('[1]')
    expect(localStorage.getItem('tv-show-watch-statuses')).toBe('{"1":"planned"}')
  })
})
