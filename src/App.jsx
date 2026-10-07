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
    status: show.status ?? null,
    premiered: show.premiered ?? null,
    network: show.network?.name ?? show.webChannel?.name ?? null,
  }
}

function ShowPoster({ image, name, className = 'show-poster' }) {
  const [failedImage, setFailedImage] = useState(null)

  if (!image || failedImage === image) {
    return (
      <span className={`${className} show-poster-placeholder`} role="img" aria-label={`${name} poster unavailable`}>
        No image
      </span>
    )
  }

  return (
    <img
      className={className}
      src={image}
      alt={`${name} poster`}
      onError={() => setFailedImage(image)}
    />
  )
}

function App() {
  const [shows, setShows] = useState([])
  const [selectedShow, setSelectedShow] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [minimumRating, setMinimumRating] = useState('')
  const [sortOrder, setSortOrder] = useState('title')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const genres = [...new Set(shows.flatMap((show) => show.genres))].sort((a, b) =>
    a.localeCompare(b),
  )
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredShows = shows.filter((show) => {
    const matchesSearch = show.name.toLocaleLowerCase().includes(normalizedQuery)
    const matchesGenre = !selectedGenre || show.genres.includes(selectedGenre)
    const matchesRating =
      !minimumRating || (show.rating !== null && show.rating >= Number(minimumRating))
    return matchesSearch && matchesGenre && matchesRating
  })
  filteredShows.sort((first, second) => {
    if (sortOrder === 'rating') {
      return (second.rating ?? -1) - (first.rating ?? -1) || first.name.localeCompare(second.name)
    }
    return first.name.localeCompare(second.name)
  })

  const hasActiveFilters = Boolean(searchQuery || selectedGenre || minimumRating)

  useEffect(() => {
    const controller = new AbortController()

    async function loadShows() {
      setIsLoading(true)
      setError('')
      try {
        const apiShows = await fetchShows({ signal: controller.signal })
        const mappedShows = apiShows.map(mapShow)
        setShows(mappedShows)
        setSelectedShow((currentShow) =>
          mappedShows.find((show) => show.id === currentShow?.id) ?? mappedShows[0] ?? null,
        )
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
  }, [retryCount])

  function clearFilters() {
    setSearchQuery('')
    setSelectedGenre('')
    setMinimumRating('')
    setSortOrder('title')
  }

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
                <label className="filter-field">
                  <span>Minimum rating</span>
                  <select
                    value={minimumRating}
                    onChange={(event) => setMinimumRating(event.target.value)}
                  >
                    <option value="">Any rating</option>
                    <option value="7">7 and up</option>
                    <option value="8">8 and up</option>
                    <option value="9">9 and up</option>
                  </select>
                </label>
                <label className="filter-field">
                  <span>Sort by</span>
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  >
                    <option value="title">Title (A–Z)</option>
                    <option value="rating">Rating (highest first)</option>
                  </select>
                </label>
              </div>
              {hasActiveFilters ? (
                <button className="clear-filters" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
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
                        aria-label={`Show details for ${show.name}`}
                        aria-pressed={selectedShow?.id === show.id}
                        onClick={() => setSelectedShow(show)}
                      >
                        <ShowPoster image={show.image} name={show.name} />
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
              <div className="details-heading">
                <ShowPoster
                  image={selectedShow.image}
                  name={selectedShow.name}
                  className="details-poster"
                />
                <h2 id="details-heading">{selectedShow.name}</h2>
              </div>
              <p className="show-summary">{selectedShow.summary}</p>
              <dl className="show-metadata">
                <div>
                  <dt>Status</dt>
                  <dd>{selectedShow.status ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt>Premiered</dt>
                  <dd>{selectedShow.premiered ?? 'Unknown'}</dd>
                </div>
                <div>
                  <dt>Network</dt>
                  <dd>{selectedShow.network ?? 'Unknown'}</dd>
                </div>
              </dl>
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
          ) : error ? (
            <div className="details-empty">
              <h2 id="details-heading">Shows unavailable</h2>
              <p>There was a problem loading the show list.</p>
              <button
                className="retry-button"
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Try again
              </button>
            </div>
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
