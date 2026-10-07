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

function readFavorites() {
  try {
    const storedFavorites = JSON.parse(localStorage.getItem('tv-show-favorites') ?? '[]')
    return Array.isArray(storedFavorites) ? storedFavorites : []
  } catch {
    return []
  }
}

function ShowPoster({ image, name, className = 'show-poster' }) {
  const [failedImage, setFailedImage] = useState(null)

  if (!image || failedImage === image) {
    return (
      <span className={`${className} show-poster-placeholder`} role="img" aria-label={`${name} poster unavailable`}>
        Poster unavailable
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
  const [sortOrder, setSortOrder] = useState('popular')
  const [activeView, setActiveView] = useState('browse')
  const [favoriteIds, setFavoriteIds] = useState(readFavorites)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState('')
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
    const matchesView = activeView !== 'favorites' || favoriteIds.includes(show.id)
    return matchesSearch && matchesGenre && matchesRating && matchesView
  })

  filteredShows.sort((first, second) => {
    if (sortOrder === 'rating') {
      return (second.rating ?? -1) - (first.rating ?? -1) || first.name.localeCompare(second.name)
    }
    if (sortOrder === 'popular') {
      return (second.rating ?? -1) - (first.rating ?? -1) || first.name.localeCompare(second.name)
    }
    return first.name.localeCompare(second.name)
  })

  const hasActiveFilters = Boolean(searchQuery || selectedGenre || minimumRating)

  useEffect(() => {
    const controller = new AbortController()

    async function loadShows() {
      try {
        const apiShows = await fetchShows({ signal: controller.signal })
        setShows(apiShows.map(mapShow))
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

  useEffect(() => {
    if (!selectedShow) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') setSelectedShow(null)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedShow])

  function toggleFavorite(showId) {
    const nextFavorites = favoriteIds.includes(showId)
      ? favoriteIds.filter((id) => id !== showId)
      : [...favoriteIds, showId]
    setFavoriteIds(nextFavorites)

    try {
      localStorage.setItem('tv-show-favorites', JSON.stringify(nextFavorites))
      setStorageError('')
    } catch {
      setStorageError('Favorites could not be saved on this device.')
    }
  }

  function clearFilters() {
    setSearchQuery('')
    setSelectedGenre('')
    setMinimumRating('')
    setSortOrder('popular')
  }

  function retryShows() {
    setIsLoading(true)
    setError('')
    setRetryCount((count) => count + 1)
  }

  return (
    <main className="shows-page">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ScreenShelf home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>ScreenShelf</span>
        </a>
        <nav className="view-tabs" aria-label="Show collections">
          <button
            className={`view-tab ${activeView === 'browse' ? 'is-active' : ''}`}
            type="button"
            aria-pressed={activeView === 'browse'}
            onClick={() => setActiveView('browse')}
          >
            Explore
          </button>
          <button
            className={`view-tab ${activeView === 'favorites' ? 'is-active' : ''}`}
            type="button"
            aria-pressed={activeView === 'favorites'}
            onClick={() => setActiveView('favorites')}
          >
            Favorites <span className="favorite-count">{favoriteIds.length}</span>
          </button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">YOUR NEXT WATCH STARTS HERE</p>
          <h1>Stories worth<br />staying in for.</h1>
          <p className="hero-description">
            Find something new to love from a world of series, handpicked for your next night in.
          </p>
          <a className="hero-cta" href="#catalog">Explore the collection <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <span className="hero-star star-one">✦</span>
          <span className="hero-star star-two">✧</span>
          <span className="hero-ticket">TONIGHT’S<br />FEATURE</span>
          <span className="hero-art-title">A good story<br /><em>finds you.</em></span>
          <span className="hero-art-caption">CURATED FOR YOUR NEXT WATCH</span>
        </div>
      </section>

      {storageError ? <p className="storage-notice" role="status">{storageError}</p> : null}

      <section className="genre-section" aria-labelledby="genre-heading">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">PICK A MOOD</p>
            <h2 id="genre-heading">Explore by genre</h2>
          </div>
          {selectedGenre ? (
            <button className="text-button" type="button" onClick={() => setSelectedGenre('')}>
              Clear genre
            </button>
          ) : null}
        </div>
        <div className="genre-chips" aria-label="Filter by genre">
          <button
            className={`genre-chip ${!selectedGenre ? 'is-active' : ''}`}
            type="button"
            aria-pressed={!selectedGenre}
            onClick={() => setSelectedGenre('')}
          >
            <span aria-hidden="true">✦</span> All genres
          </button>
          {genres.map((genre) => (
            <button
              className={`genre-chip ${selectedGenre === genre ? 'is-active' : ''}`}
              key={genre}
              type="button"
              aria-pressed={selectedGenre === genre}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      <section className="catalog-section" id="catalog" aria-labelledby="catalog-heading">
        <div className="catalog-title-row">
          <div>
            <p className="eyebrow">{activeView === 'favorites' ? 'YOUR PERSONAL COLLECTION' : 'THE COLLECTION'}</p>
            <h2 id="catalog-heading">{activeView === 'favorites' ? 'Your favorites' : 'Find your next favorite'}</h2>
          </div>
          <p className="catalog-count">
            {activeView === 'favorites' ? favoriteIds.length : shows.length} titles
          </p>
        </div>

        {isLoading ? <p className="status-message" role="status">Gathering your shows…</p> : null}
        {!isLoading && error ? (
          <div className="error-panel" role="alert">
            <p>{error}</p>
            <button className="primary-button" type="button" onClick={retryShows}>
              Try again
            </button>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="catalog-toolbar">
              <label className="search-field">
                <span className="visually-hidden">Search shows</span>
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search shows, genres..."
                />
              </label>
              <label className="toolbar-select">
                <span className="visually-hidden">Minimum rating</span>
                <select value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)}>
                  <option value="">Any rating</option>
                  <option value="7">7+ rating</option>
                  <option value="8">8+ rating</option>
                  <option value="9">9+ rating</option>
                </select>
              </label>
              <label className="toolbar-select">
                <span className="visually-hidden">Sort by</span>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                  <option value="popular">Top rated</option>
                  <option value="title">Title A–Z</option>
                </select>
              </label>
              {hasActiveFilters ? (
                <button className="text-button clear-button" type="button" onClick={clearFilters}>Clear filters</button>
              ) : null}
            </div>

            <div className="result-line">
              <p className="results-count" aria-live="polite">
                Showing <strong>{filteredShows.length}</strong> {filteredShows.length === 1 ? 'show' : 'shows'}
                {selectedGenre ? <> in <strong>{selectedGenre}</strong></> : null}
              </p>
            </div>

            {filteredShows.length ? (
              <ul className="shows-grid">
                {filteredShows.map((show, index) => {
                  const isFavorite = favoriteIds.includes(show.id)
                  return (
                    <li className="show-tile" key={show.id} style={{ '--tile-index': index % 12 }}>
                      <button
                        className="show-tile-main"
                        type="button"
                        aria-label={`Show details for ${show.name}`}
                        onClick={() => setSelectedShow(show)}
                      >
                        <span className="tile-poster-wrap">
                          <ShowPoster image={show.image} name={show.name} className="tile-poster" />
                          <span className="poster-rating">
                            <span aria-hidden="true">★</span> {show.rating ?? 'NR'}
                          </span>
                        </span>
                        <span className="tile-info">
                          <span className="tile-name">{show.name}</span>
                          <span className="tile-genres">{show.genres.slice(0, 2).join(' · ') || 'Series'}</span>
                        </span>
                      </button>
                      <button
                        className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`}
                        type="button"
                        aria-label={`${isFavorite ? 'Remove' : 'Add'} ${show.name} ${isFavorite ? 'from' : 'to'} favorites`}
                        aria-pressed={isFavorite}
                        onClick={() => toggleFavorite(show.id)}
                      >
                        <span aria-hidden="true">{isFavorite ? '♥' : '♡'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">{activeView === 'favorites' ? '♡' : '⌕'}</span>
                <h3>{activeView === 'favorites' ? 'Your watchlist is waiting' : 'No shows found'}</h3>
                <p>
                  {activeView === 'favorites'
                    ? 'Tap the heart on any show to save it here for later.'
                    : 'Try another title or clear your filters to see more shows.'}
                </p>
                {hasActiveFilters ? (
                  <button className="text-button" type="button" onClick={clearFilters}>Clear filters</button>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top"><span className="brand-mark" aria-hidden="true">S</span>ScreenShelf</a>
        <p>Made for finding the stories you’ll love.</p>
        <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">Show data by TVmaze</a>
      </footer>

      {selectedShow ? (
        <div className="dialog-backdrop" onClick={() => setSelectedShow(null)}>
          <section
            className="show-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="dialog-close" type="button" aria-label="Close show details" onClick={() => setSelectedShow(null)}>
              ×
            </button>
            <div className="dialog-top">
              <ShowPoster image={selectedShow.image} name={selectedShow.name} className="details-poster" />
              <div className="dialog-title">
                <p className="eyebrow">SHOW DETAILS</p>
                <h2 id="details-heading">{selectedShow.name}</h2>
                <p className="dialog-rating"><span aria-hidden="true">★</span> {selectedShow.rating ?? 'Not rated'}{selectedShow.rating !== null ? ' / 10' : ''}</p>
                <button
                  className={`dialog-favorite ${favoriteIds.includes(selectedShow.id) ? 'is-favorite' : ''}`}
                  type="button"
                  aria-pressed={favoriteIds.includes(selectedShow.id)}
                  onClick={() => toggleFavorite(selectedShow.id)}
                >
                  {favoriteIds.includes(selectedShow.id) ? '♥ Saved to favorites' : '♡ Add to favorites'}
                </button>
              </div>
            </div>
            <p className="show-summary">{selectedShow.summary}</p>
            <ul className="genre-list">
              {selectedShow.genres.map((genre) => (
                <li className="genre-tag" key={genre}>{genre}</li>
              ))}
            </ul>
            <dl className="show-metadata">
              <div><dt>Status</dt><dd>{selectedShow.status ?? 'Unknown'}</dd></div>
              <div><dt>Premiered</dt><dd>{selectedShow.premiered ?? 'Unknown'}</dd></div>
              <div><dt>Network</dt><dd>{selectedShow.network ?? 'Unknown'}</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
