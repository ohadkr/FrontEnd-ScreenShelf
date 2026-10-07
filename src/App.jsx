import { useEffect, useState } from 'react'
import './App.css'
import { fetchShows } from './services/tvmaze'

function toPlainText(html) {
  const element = document.createElement('div')
  element.innerHTML = html
  return element.textContent ?? ''
}

function mapShow(show) {
  return {
    id: show.id,
    name: show.name,
    image: show.image?.medium ?? show.image?.original ?? null,
    summary: show.summary ? toPlainText(show.summary) : 'No summary available.',
    genres: Array.isArray(show.genres) ? show.genres : [],
    rating: show.rating?.average ?? null,
  }
}

function App() {
  const [shows, setShows] = useState([])
  const [selectedShow, setSelectedShow] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const genres = [...new Set(shows.flatMap((show) => show.genres))].sort((a, b) =>
    a.localeCompare(b),
  )
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredShows = shows.filter((show) => {
    const matchesSearch = show.name.toLocaleLowerCase().includes(normalizedQuery)
    const matchesGenre = !selectedGenre || show.genres.includes(selectedGenre)
    return matchesSearch && matchesGenre
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadShows() {
      try {
        const apiShows = await fetchShows({ signal: controller.signal })
        const mappedShows = apiShows.map(mapShow)
        setShows(mappedShows)
        setSelectedShow(mappedShows[0] ?? null)
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load shows.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadShows()
    return () => controller.abort()
  }, [])

  return (
    <main className="shows-page">
      <header className="shows-header">
        <p className="eyebrow">TV SHOW LIBRARY</p>
        <h1>Find your next favorite</h1>
        <p className="shows-intro">Browse a few shows to get started.</p>
      </header>

      <div className="shows-layout">
        <section className="shows-browser" aria-labelledby="shows-heading">
          <h2 className="section-heading" id="shows-heading">Shows</h2>
          {isLoading ? <p role="status">Loading shows…</p> : null}
          {!isLoading && error ? <p className="load-error" role="alert">{error}</p> : null}
          {!isLoading && !error ? (
            <>
              <div className="shows-filters">
                <label className="filter-field">
                  <span>Search shows</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by title"
                  />
                </label>
                <label className="filter-field">
                  <span>Genre</span>
                  <select
                    value={selectedGenre}
                    onChange={(event) => setSelectedGenre(event.target.value)}
                  >
                    <option value="">All genres</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="results-count" aria-live="polite">
                {filteredShows.length} {filteredShows.length === 1 ? 'show' : 'shows'}
              </p>
              {filteredShows.length ? (
                <ul className="shows-list">
                  {filteredShows.map((show) => (
                    <li key={show.id}>
                      <button
                        className="show-card"
                        type="button"
                        aria-pressed={selectedShow?.id === show.id}
                        onClick={() => setSelectedShow(show)}
                      >
                        {show.image ? (
                          <img className="show-poster" src={show.image} alt="" />
                        ) : (
                          <span className="show-poster show-poster-placeholder" aria-hidden="true">No image</span>
                        )}
                        <span className="show-name">{show.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-results">No shows match your search and filter.</p>
              )}
            </>
          ) : null}
        </section>

        <aside className="show-details" aria-labelledby="details-heading" aria-live="polite">
          {selectedShow ? (
            <>
              <p className="eyebrow">SHOW DETAILS</p>
              <h2 id="details-heading">{selectedShow.name}</h2>
              <p className="show-summary">{selectedShow.summary}</p>
              <div className="detail-group">
                <h3>Genres</h3>
                <ul className="genre-list">
                  {selectedShow.genres.map((genre) => (
                    <li className="genre-tag" key={genre}>{genre}</li>
                  ))}
                </ul>
              </div>
              <div className="detail-group">
                <h3>Rating</h3>
                <p className="show-rating">
                  {selectedShow.rating ?? 'Not rated'}
                  {selectedShow.rating !== null ? <span> / 10</span> : null}
                </p>
              </div>
            </>
          ) : (
            <div className="details-empty">
              <h2 id="details-heading">Choose a show</h2>
              <p>Select a show from the list to see its summary, genres, and rating.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

export default App
