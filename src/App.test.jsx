import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchShows } from './services/tvmaze'

vi.mock('./services/tvmaze', () => ({
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

    await user.click(screen.getByRole('button', { name: 'Show details for Zeta Show' }))
    expect(window.location.hash).toBe('#/shows/1')
    expect(screen.getByRole('heading', { name: 'Zeta Show' })).not.toBeNull()
    expect(document.documentElement).toBe(documentElement)

    await user.click(screen.getByRole('button', { name: 'Back to all shows' }))
    expect(window.location.hash).toBe('#/browse')
    expect(screen.getByRole('heading', { name: 'Explore by genre' })).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Favorites 0' }))
    expect(window.location.hash).toBe('#/favorites')
    expect(screen.getByRole('heading', { name: 'Your favorites' })).not.toBeNull()
  })
})
