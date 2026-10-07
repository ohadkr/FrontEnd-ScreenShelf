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
    const favorites = JSON.parse(localStorage.getItem('tv-show-favorites') ?? '[]')
    return Array.isArray(favorites) ? favorites : []
  } catch {
    return []
  }
}

function readRoute() {
  const path = window.location.hash.replace(/^#/, '')
  const showRoute = path.match(/^\/shows\/(\d+)(?:\?from=(favorites))?$/)

  if (showRoute) {
    return { page: 'show', showId: Number(showRoute[1]), from: showRoute[2] ?? 'browse' }
  }
  if (path === '/favorites') return { page: 'favorites', showId: null, from: 'browse' }
  return { page: 'browse', showId: null, from: 'browse' }
}

function ShowPoster({ image, name, className = 'tile-poster' }) {
  const [failedImage, setFailedImage] = useState(null)

  if (!image || failedImage === image) {
    return (
      <span className={`${className} show-poster-placeholder`} role="img" aria-label={`${name} poster unavailable`}>
        Poster unavailable
      </span>
    )
  }

  return <img className={className} src={image} alt={`${name} poster`} onError={() => setFailedImage(image)} />
}

function App() {
  const [shows, setShows] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [minimumRating, setMinimumRating] = useState('')
  const [sortOrder, setSortOrder] = useState('popular')
  const [route, setRoute] = useState(readRoute)
  const [favoriteIds, setFavoriteIds] = useState(readFavorites)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const isBrowsePage = route.page === 'browse'
  const isFavoritesPage = route.page === 'favorites'
  const isShowPage = route.page === 'show'
  const selectedShow = shows.find((show) => show.id === route.showId) ?? null
  const genres = [...new Set(shows.flatMap((show) => show.genres))].sort((a, b) => a.localeCompare(b))
  const genreCounts = genres.map((name) => ({
    name,
    count: shows.filter((show) => show.genres.includes(name)).length,
  }))
  const query = searchQuery.trim().toLocaleLowerCase()
  const filteredShows = shows.filter((show) => (
    (
      show.name.toLocaleLowerCase().includes(query)
      || show.genres.some((genre) => genre.toLocaleLowerCase().includes(query))
    )
    && (!selectedGenre || show.genres.includes(selectedGenre))
    && (!minimumRating || (show.rating !== null && show.rating >= Number(minimumRating)))
    && (!isFavoritesPage || favoriteIds.includes(show.id))
  ))

  filteredShows.sort((first, second) => {
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
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadShows()
    return () => controller.abort()
  }, [retryCount])

  useEffect(() => {
    function handleRouteChange() {
      setRoute(readRoute())
    }

    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  function navigate(path) {
    if (window.location.hash === `#${path}`) {
      setRoute(readRoute())
      return
    }
    window.history.pushState(null, '', `#${path}`)
    setRoute(readRoute())
  }

  function openShow(showId) {
    navigate(`/shows/${showId}${isFavoritesPage ? '?from=favorites' : ''}`)
  }

  function openFavorites() {
    setSearchQuery('')
    setSelectedGenre('')
    setMinimumRating('')
    navigate('/favorites')
  }

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

  function selectGenre(genre) {
    setSelectedGenre(genre)
    navigate('/browse')
    window.setTimeout(() => {
      const catalog = document.getElementById('catalog')
      if (typeof catalog?.scrollIntoView === 'function') {
        catalog.scrollIntoView({ behavior: 'smooth' })
      }
    }, 0)
  }

  function renderShowGrid() {
    return filteredShows.length ? (
      <ul className="shows-grid">
        {filteredShows.map((show, index) => {
          const isFavorite = favoriteIds.includes(show.id)
          return (
            <li className="show-tile" key={show.id} style={{ '--tile-index': index % 12 }}>
              <button className="show-tile-main" type="button" aria-label={`Show details for ${show.name}`} onClick={() => openShow(show.id)}>
                <span className="tile-poster-wrap">
                  <ShowPoster image={show.image} name={show.name} />
                  <span className="poster-rating"><span aria-hidden="true">★</span> {show.rating ?? 'NR'}</span>
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
        <span className="empty-icon" aria-hidden="true">{isFavoritesPage ? '♡' : '⌕'}</span>
        <h3>{isFavoritesPage ? 'Your watchlist is waiting' : 'No shows found'}</h3>
        <p>{isFavoritesPage ? 'Save shows with the heart button and they’ll be waiting here.' : 'Try another title or clear your filters to see more shows.'}</p>
        {isFavoritesPage ? (
          <button className="text-button" type="button" onClick={() => navigate('/browse')}>Explore shows</button>
        ) : hasActiveFilters ? (
          <button className="text-button" type="button" onClick={clearFilters}>Clear filters</button>
        ) : null}
      </div>
    )
  }

  return (
    <main className="shows-page">
      <header className="site-header">
        <a className="brand" href="#/browse" aria-label="ScreenShelf home" onClick={(event) => {
          event.preventDefault()
          navigate('/browse')
        }}>
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>ScreenShelf</span>
        </a>
        <nav className="view-tabs" aria-label="Show collections">
          <button className={`view-tab ${isBrowsePage ? 'is-active' : ''}`} type="button" aria-current={isBrowsePage ? 'page' : undefined} onClick={() => navigate('/browse')}>
            Explore
          </button>
          <button className={`view-tab ${isFavoritesPage ? 'is-active' : ''}`} type="button" aria-current={isFavoritesPage ? 'page' : undefined} onClick={openFavorites}>
            Favorites <span className="favorite-count">{favoriteIds.length}</span>
          </button>
        </nav>
      </header>

      {isBrowsePage ? (
        <>
          <section className="hero" id="top">
            <div className="hero-copy">
              <p className="eyebrow">YOUR NEXT WATCH STARTS HERE</p>
              <h1>Stories worth<br />staying in for.</h1>
              <p className="hero-description">Find something new to love from a world of series, handpicked for your next night in.</p>
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

          <section className="genre-section" aria-labelledby="genre-heading">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">PICK A MOOD</p>
                <h2 id="genre-heading">Explore by genre</h2>
              </div>
              {selectedGenre ? <button className="text-button" type="button" onClick={() => setSelectedGenre('')}>Clear genre</button> : null}
            </div>
            <div className="genre-grid" aria-label="Browse by genre">
              {genreCounts.map(({ name, count }, index) => (
                <button
                  className={`genre-card genre-card-${index % 6} ${selectedGenre === name ? 'is-active' : ''}`}
                  key={name}
                  type="button"
                  aria-label={`${name}, ${count} ${count === 1 ? 'show' : 'shows'}`}
                  aria-pressed={selectedGenre === name}
                  onClick={() => selectGenre(name)}
                >
                  <span className="genre-card-symbol" aria-hidden="true">{['✦', '◒', '✧', '◈', '✺', '◌'][index % 6]}</span>
                  <span className="genre-card-copy">
                    <span className="genre-card-name">{name}</span>
                    <span className="genre-card-count">{count} {count === 1 ? 'show' : 'shows'}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {storageError ? <p className="storage-notice" role="status">{storageError}</p> : null}

      {!isShowPage ? (
        <section className="catalog-section" id="catalog" aria-labelledby="catalog-heading">
          <div className="catalog-title-row">
            <div>
              <p className="eyebrow">{isFavoritesPage ? 'YOUR PERSONAL COLLECTION' : 'THE COLLECTION'}</p>
              <h1 id="catalog-heading">{isFavoritesPage ? 'Your favorites' : 'Find your next favorite'}</h1>
            </div>
            <p className="catalog-count">{isFavoritesPage ? favoriteIds.length : shows.length} titles</p>
          </div>

          {isLoading ? <p className="status-message" role="status">Gathering your shows…</p> : null}
          {!isLoading && error ? (
            <div className="error-panel" role="alert">
              <p>{error}</p>
              <button className="primary-button" type="button" onClick={retryShows}>Try again</button>
            </div>
          ) : null}
          {!isLoading && !error ? (
            <>
              <div className="catalog-toolbar">
                <label className="search-field">
                  <span className="visually-hidden">Search shows</span>
                  <span className="search-icon" aria-hidden="true">⌕</span>
                  <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search titles or genres..." />
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
                {hasActiveFilters ? <button className="text-button clear-button" type="button" onClick={clearFilters}>Clear filters</button> : null}
              </div>
              <div className="result-line">
                <p className="results-count" aria-live="polite">
                  Showing <strong>{filteredShows.length}</strong> {filteredShows.length === 1 ? 'show' : 'shows'}
                  {selectedGenre ? <> in <strong>{selectedGenre}</strong></> : null}
                </p>
              </div>
              {renderShowGrid()}
            </>
          ) : null}
        </section>
      ) : null}

      {isShowPage ? (
        selectedShow ? (
          <section className="show-page" aria-labelledby="details-heading">
            <button className="back-button" type="button" onClick={() => navigate(route.from === 'favorites' ? '/favorites' : '/browse')}>
              <span aria-hidden="true">←</span> Back to {route.from === 'favorites' ? 'favorites' : 'all shows'}
            </button>
            <article className="show-page-card">
              <div className="show-page-visual">
                <ShowPoster image={selectedShow.image} name={selectedShow.name} className="show-page-poster" />
                <span className="show-page-rating"><span aria-hidden="true">★</span> {selectedShow.rating ?? 'Not rated'}{selectedShow.rating !== null ? ' / 10' : ''}</span>
              </div>
              <div className="show-page-content">
                <p className="eyebrow">SERIES DETAILS</p>
                <h1 id="details-heading">{selectedShow.name}</h1>
                <ul className="show-page-genres">
                  {selectedShow.genres.map((genre) => (
                    <li key={genre}><button type="button" onClick={() => selectGenre(genre)}>{genre}</button></li>
                  ))}
                </ul>
                <h2>About this show</h2>
                <p className="show-page-summary">{selectedShow.summary}</p>
                <dl className="show-metadata">
                  <div><dt>Status</dt><dd>{selectedShow.status ?? 'Unknown'}</dd></div>
                  <div><dt>Premiered</dt><dd>{selectedShow.premiered ?? 'Unknown'}</dd></div>
                  <div><dt>Network</dt><dd>{selectedShow.network ?? 'Unknown'}</dd></div>
                </dl>
                <button
                  className={`show-page-favorite ${favoriteIds.includes(selectedShow.id) ? 'is-favorite' : ''}`}
                  type="button"
                  aria-pressed={favoriteIds.includes(selectedShow.id)}
                  onClick={() => toggleFavorite(selectedShow.id)}
                >
                  {favoriteIds.includes(selectedShow.id) ? '♥ Saved to favorites' : '♡ Add to favorites'}
                </button>
              </div>
            </article>
          </section>
        ) : isLoading ? (
          <p className="status-message" role="status">Loading show details…</p>
        ) : (
          <div className="empty-state">
            <h2>Show not found</h2>
            <p>This show may no longer be available.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/browse')}>Browse shows</button>
          </div>
        )
      ) : null}

      <footer className="site-footer">
        <a className="brand footer-brand" href="#/browse" onClick={(event) => {
          event.preventDefault()
          navigate('/browse')
        }}><span className="brand-mark" aria-hidden="true">S</span>ScreenShelf</a>
        <p>Made for finding the stories you’ll love.</p>
        <a href="https://www.tvmaze.com/" target="_blank" rel="noreferrer">Show data by TVmaze</a>
      </footer>
    </main>
  )
}

export default App
