import { useEffect, useRef, useState } from 'react'
import './App.css'
import { fetchShowEpisodes, fetchShows } from './services/tvmaze'

const PAGE_SIZE = 30
const WATCH_STATUSES = ['watching', 'planned', 'finished']
const MAX_COMPARE_SHOWS = 3

function chooseRandomShow(shows) {
  return shows[Math.floor(Math.random() * shows.length)]
}

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

function readTheme() {
  try {
    return localStorage.getItem('tv-show-theme') === 'dark'
  } catch {
    return false
  }
}

function readWatchStatuses() {
  try {
    const statuses = JSON.parse(localStorage.getItem('tv-show-watch-statuses') ?? '{}')
    if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) return {}
    return Object.fromEntries(
      Object.entries(statuses).filter(([id, status]) => /^\d+$/.test(id) && WATCH_STATUSES.includes(status)),
    )
  } catch {
    return {}
  }
}

function readRecentShows() {
  try {
    const ids = JSON.parse(localStorage.getItem('tv-show-recent') ?? '[]')
    return Array.isArray(ids) ? ids.filter(Number.isInteger).slice(0, 8) : []
  } catch {
    return []
  }
}

function persistRecentlyViewed(showId) {
  const nextRecentIds = [showId, ...readRecentShows().filter((id) => id !== showId)].slice(0, 8)
  try {
    localStorage.setItem('tv-show-recent', JSON.stringify(nextRecentIds))
    return ''
  } catch {
    return 'Recently viewed shows could not be saved on this device.'
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
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [sortOrder, setSortOrder] = useState('popular')
  const [route, setRoute] = useState(readRoute)
  const [favoriteIds, setFavoriteIds] = useState(readFavorites)
  const [watchStatuses, setWatchStatuses] = useState(readWatchStatuses)
  const [watchStatusFilter, setWatchStatusFilter] = useState('')
  const [compareIds, setCompareIds] = useState([])
  const [isDarkTheme, setIsDarkTheme] = useState(readTheme)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [collectionMessage, setCollectionMessage] = useState('')
  const [episodeGuide, setEpisodeGuide] = useState({ showId: null, retryCount: -1, episodes: [], error: '' })
  const [episodeRetryCount, setEpisodeRetryCount] = useState(0)
  const [retryCount, setRetryCount] = useState(0)

  const importFileRef = useRef(null)
  const isBrowsePage = route.page === 'browse'
  const isFavoritesPage = route.page === 'favorites'
  const isShowPage = route.page === 'show'
  const selectedShow = shows.find((show) => show.id === route.showId) ?? null
  const selectedShowId = selectedShow?.id
  const previousPageRef = useRef(route.page)
  const pageHeadingRef = useRef(null)
  const genres = [...new Set(shows.flatMap((show) => show.genres))].sort((a, b) => a.localeCompare(b))
  const statuses = [...new Set(shows.map((show) => show.status).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const networks = [...new Set(shows.map((show) => show.network).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const premiereYears = [...new Set(shows.map((show) => show.premiered?.slice(0, 4)).filter((year) => /^\d{4}$/.test(year ?? '')))]
    .sort((a, b) => Number(b) - Number(a))
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
    && (!selectedStatus || show.status === selectedStatus)
    && (!selectedNetwork || show.network === selectedNetwork)
    && (!selectedYear || show.premiered?.startsWith(`${selectedYear}-`))
    && (!watchStatusFilter || watchStatuses[show.id] === watchStatusFilter)
    && (!isFavoritesPage || favoriteIds.includes(show.id))
  ))

  filteredShows.sort((first, second) => {
    if (sortOrder === 'popular') {
      return (second.rating ?? -1) - (first.rating ?? -1) || first.name.localeCompare(second.name)
    }
    return first.name.localeCompare(second.name)
  })

  const visibleShows = filteredShows.slice(0, visibleCount)
  const hasMoreShows = visibleShows.length < filteredShows.length
  const hasActiveFilters = Boolean(searchQuery || selectedGenre || minimumRating || selectedStatus || selectedNetwork || selectedYear || watchStatusFilter)
  const recentShows = readRecentShows().map((id) => shows.find((show) => show.id === id)).filter(Boolean)
  const comparedShows = compareIds.map((id) => shows.find((show) => show.id === id)).filter(Boolean)
  const similarShows = selectedShow
    ? shows
      .filter((show) => show.id !== selectedShow.id)
      .map((show) => ({ show, sharedGenres: show.genres.filter((genre) => selectedShow.genres.includes(genre)).length }))
      .filter(({ sharedGenres }) => sharedGenres > 0)
      .sort((first, second) => second.sharedGenres - first.sharedGenres
        || (second.show.rating ?? -1) - (first.show.rating ?? -1)
        || first.show.name.localeCompare(second.show.name))
      .slice(0, 4)
      .map(({ show }) => show)
    : []
  const isEpisodeGuideLoading = Boolean(
    selectedShow
    && (episodeGuide.showId !== selectedShow.id || episodeGuide.retryCount !== episodeRetryCount),
  )
  const episodeGuideError = !isEpisodeGuideLoading && episodeGuide.showId === selectedShow?.id
    ? episodeGuide.error
    : ''
  const currentEpisodes = episodeGuide.showId === selectedShow?.id
    && episodeGuide.retryCount === episodeRetryCount
    ? episodeGuide.episodes
    : []

  useEffect(() => {
    const controller = new AbortController()

    async function loadShows() {
      try {
        const apiShows = await fetchShows({ signal: controller.signal })
        const mappedShows = apiShows.map(mapShow)
        setShows(mappedShows)
        const currentRoute = readRoute()
        if (currentRoute.page === 'show' && mappedShows.some((show) => show.id === currentRoute.showId)) {
          const recentError = persistRecentlyViewed(currentRoute.showId)
          if (recentError) setStorageError(recentError)
        }
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

  useEffect(() => {
    if (!isShowPage || !selectedShowId) return undefined
    const controller = new AbortController()

    async function loadEpisodes() {
      try {
        const episodes = await fetchShowEpisodes(selectedShowId, { signal: controller.signal })
        setEpisodeGuide({ showId: selectedShowId, retryCount: episodeRetryCount, episodes, error: '' })
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setEpisodeGuide({
            showId: selectedShowId,
            retryCount: episodeRetryCount,
            episodes: [],
            error: requestError instanceof Error ? requestError.message : 'Unable to load the episode guide.',
          })
        }
      }
    }

    loadEpisodes()
    return () => controller.abort()
  }, [episodeRetryCount, isShowPage, selectedShowId])

  useEffect(() => {
    const pageName = isShowPage ? selectedShow?.name ?? 'Show details' : isFavoritesPage ? 'Favorites' : 'Explore'
    document.title = `${pageName} | ScreenShelf`
    if (previousPageRef.current !== route.page || (isShowPage && selectedShow)) {
      pageHeadingRef.current?.focus()
    }
    previousPageRef.current = route.page
  }, [isBrowsePage, isFavoritesPage, isShowPage, route.page, selectedShow])

  function navigate(path) {
    if (window.location.hash === `#${path}`) {
      setRoute(readRoute())
      return
    }
    window.history.pushState(null, '', `#${path}`)
    setRoute(readRoute())
  }

  function openShow(showId) {
    const recentError = persistRecentlyViewed(showId)
    if (recentError) setStorageError(recentError)
    navigate(`/shows/${showId}${isFavoritesPage ? '?from=favorites' : ''}`)
  }

  function openFavorites() {
    setSearchQuery('')
    setSelectedGenre('')
    setMinimumRating('')
    setSelectedStatus('')
    setSelectedNetwork('')
    setSelectedYear('')
    setWatchStatusFilter('')
    setVisibleCount(PAGE_SIZE)
    navigate('/favorites')
  }

  function setShowWatchStatus(showId, status) {
    const nextStatuses = { ...watchStatuses }
    if (status) nextStatuses[showId] = status
    else delete nextStatuses[showId]
    setWatchStatuses(nextStatuses)

    try {
      localStorage.setItem('tv-show-watch-statuses', JSON.stringify(nextStatuses))
      setStorageError('')
    } catch {
      setStorageError('Watchlist statuses could not be saved on this device.')
    }
  }

  function toggleCompare(showId) {
    if (compareIds.includes(showId)) {
      setCompareIds(compareIds.filter((id) => id !== showId))
      setCollectionMessage('')
    } else if (compareIds.length >= MAX_COMPARE_SHOWS) {
      setCollectionMessage(`Compare up to ${MAX_COMPARE_SHOWS} shows at a time.`)
    } else {
      setCompareIds([...compareIds, showId])
      setCollectionMessage('')
    }
  }

  function surpriseMe() {
    if (!filteredShows.length) return
    openShow(chooseRandomShow(filteredShows).id)
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
    setSelectedStatus('')
    setSelectedNetwork('')
    setSelectedYear('')
    setWatchStatusFilter('')
    setSortOrder('popular')
    setVisibleCount(PAGE_SIZE)
  }

  function exportCollection() {
    try {
      const collection = JSON.stringify({ version: 1, favoriteIds, watchStatuses }, null, 2)
      const fileUrl = URL.createObjectURL(new Blob([collection], { type: 'application/json' }))
      const downloadLink = document.createElement('a')
      downloadLink.href = fileUrl
      downloadLink.download = 'screenshelf-collection.json'
      downloadLink.click()
      URL.revokeObjectURL(fileUrl)
      setCollectionMessage('Your collection was exported.')
    } catch {
      setCollectionMessage('The collection could not be exported in this browser.')
    }
  }

  async function importCollection(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const imported = JSON.parse(await file.text())
      const validStatuses = imported?.watchStatuses
      if (
        imported?.version !== 1
        || !Array.isArray(imported.favoriteIds)
        || !imported.favoriteIds.every(Number.isInteger)
        || !validStatuses
        || typeof validStatuses !== 'object'
        || Array.isArray(validStatuses)
        || !Object.entries(validStatuses).every(([id, status]) => /^\d+$/.test(id) && WATCH_STATUSES.includes(status))
      ) {
        throw new Error('The file is not a valid ScreenShelf collection.')
      }

      const importedStatuses = Object.fromEntries(
        Object.entries(validStatuses).filter(([id]) => Number.isInteger(Number(id))),
      )
      localStorage.setItem('tv-show-favorites', JSON.stringify(imported.favoriteIds))
      localStorage.setItem('tv-show-watch-statuses', JSON.stringify(importedStatuses))
      setFavoriteIds(imported.favoriteIds)
      setWatchStatuses(importedStatuses)
      setCollectionMessage('Your collection was imported.')
      setStorageError('')
    } catch (importError) {
      setCollectionMessage(importError instanceof Error ? importError.message : 'The collection could not be imported.')
    }
  }

  function toggleTheme() {
    const nextIsDark = !isDarkTheme
    setIsDarkTheme(nextIsDark)
    try {
      localStorage.setItem('tv-show-theme', nextIsDark ? 'dark' : 'light')
    } catch {
      setStorageError('Your theme preference could not be saved on this device.')
    }
  }

  async function copyShowLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMessage('Show link copied.')
    } catch {
      setShareMessage('Copy this page URL from your browser to share this show.')
    }
  }

  function retryShows() {
    setIsLoading(true)
    setError('')
    setRetryCount((count) => count + 1)
  }

  function selectGenre(genre) {
    updateFilter(setSelectedGenre, genre)
    navigate('/browse')
    window.setTimeout(() => {
      const catalog = document.getElementById('catalog')
      if (typeof catalog?.scrollIntoView === 'function') {
        catalog.scrollIntoView({ behavior: 'smooth' })
      }
    }, 0)
  }

  function renderShowGrid(showsToRender) {
    return showsToRender.length ? (
      <ul className="shows-grid">
        {showsToRender.map((show, index) => {
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
              <button
                className={`compare-toggle ${compareIds.includes(show.id) ? 'is-selected' : ''}`}
                type="button"
                aria-pressed={compareIds.includes(show.id)}
                onClick={() => toggleCompare(show.id)}
              >
                {compareIds.includes(show.id) ? 'Selected to compare' : 'Compare'}
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

  function updateFilter(setter, value) {
    setter(value)
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <main className={`shows-page ${isDarkTheme ? 'theme-dark' : ''}`}>
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
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}>
            <span aria-hidden="true">{isDarkTheme ? '☀' : '☾'}</span>
            <span className="theme-toggle-label">{isDarkTheme ? 'Light' : 'Dark'}</span>
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

          {recentShows.length ? (
            <section className="recent-section" aria-labelledby="recent-heading">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p>
                  <h2 id="recent-heading">Recently viewed</h2>
                </div>
              </div>
              <div className="recent-show-list">
                {recentShows.map((show) => (
                  <button className="recent-show" key={show.id} type="button" onClick={() => openShow(show.id)}>
                    <ShowPoster image={show.image} name={show.name} className="recent-poster" />
                    <span>{show.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="genre-section" aria-labelledby="genre-heading">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">PICK A MOOD</p>
                <h2 id="genre-heading">Explore by genre</h2>
              </div>
              {selectedGenre ? <button className="text-button" type="button" onClick={() => updateFilter(setSelectedGenre, '')}>Clear genre</button> : null}
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
      {collectionMessage ? <p className="collection-notice" role="status">{collectionMessage}</p> : null}

      {!isShowPage ? (
        <section className="catalog-section" id="catalog" aria-labelledby="catalog-heading">
          <div className="catalog-title-row">
            <div>
              <p className="eyebrow">{isFavoritesPage ? 'YOUR PERSONAL COLLECTION' : 'THE COLLECTION'}</p>
              <h1 ref={isBrowsePage || isFavoritesPage ? pageHeadingRef : null} id="catalog-heading" tabIndex="-1">{isFavoritesPage ? 'Your favorites' : 'Find your next favorite'}</h1>
            </div>
            <div className="catalog-actions">
              <p className="catalog-count">{isFavoritesPage ? favoriteIds.length : shows.length} titles</p>
              {isFavoritesPage ? (
                <>
                  <button className="text-button" type="button" onClick={exportCollection}>Export collection</button>
                  <button className="text-button" type="button" onClick={() => importFileRef.current?.click()}>Import collection</button>
                  <input
                    ref={importFileRef}
                    className="visually-hidden"
                    type="file"
                    accept="application/json,.json"
                    aria-label="Import ScreenShelf collection file"
                    onChange={importCollection}
                  />
                </>
              ) : null}
            </div>
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
                  <input type="search" value={searchQuery} onChange={(event) => updateFilter(setSearchQuery, event.target.value)} placeholder="Search titles or genres..." />
                </label>
                <label className="toolbar-select">
                  <span className="visually-hidden">Minimum rating</span>
                  <select value={minimumRating} onChange={(event) => updateFilter(setMinimumRating, event.target.value)}>
                    <option value="">Any rating</option>
                    <option value="7">7+ rating</option>
                    <option value="8">8+ rating</option>
                    <option value="9">9+ rating</option>
                  </select>
                </label>
                <label className="toolbar-select">
                  <span className="visually-hidden">Status</span>
                  <select value={selectedStatus} onChange={(event) => updateFilter(setSelectedStatus, event.target.value)}>
                    <option value="">Any status</option>
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="toolbar-select">
                  <span className="visually-hidden">Network</span>
                  <select value={selectedNetwork} onChange={(event) => updateFilter(setSelectedNetwork, event.target.value)}>
                    <option value="">Any network</option>
                    {networks.map((network) => <option key={network} value={network}>{network}</option>)}
                  </select>
                </label>
                <label className="toolbar-select">
                  <span className="visually-hidden">Premiere year</span>
                  <select value={selectedYear} onChange={(event) => updateFilter(setSelectedYear, event.target.value)}>
                    <option value="">Any year</option>
                    {premiereYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
                <label className="toolbar-select">
                  <span className="visually-hidden">Watchlist status</span>
                  <select value={watchStatusFilter} onChange={(event) => updateFilter(setWatchStatusFilter, event.target.value)}>
                    <option value="">Any watchlist status</option>
                    <option value="watching">Watching</option>
                    <option value="planned">Plan to watch</option>
                    <option value="finished">Finished</option>
                  </select>
                </label>
                <label className="toolbar-select">
                  <span className="visually-hidden">Sort by</span>
                  <select value={sortOrder} onChange={(event) => updateFilter(setSortOrder, event.target.value)}>
                    <option value="popular">Top rated</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </label>
                <button className="surprise-button" type="button" onClick={surpriseMe} disabled={!filteredShows.length}>
                  Surprise me
                </button>
                {hasActiveFilters ? <button className="text-button clear-button" type="button" onClick={clearFilters}>Clear filters</button> : null}
              </div>
              <div className="result-line">
                <p className="results-count" aria-live="polite">
                  Showing <strong>{visibleShows.length}</strong> of <strong>{filteredShows.length}</strong> {filteredShows.length === 1 ? 'show' : 'shows'}
                  {selectedGenre ? <> in <strong>{selectedGenre}</strong></> : null}
                </p>
              </div>
              {renderShowGrid(visibleShows)}
              {hasMoreShows ? (
                <div className="load-more-wrap">
                  <button className="load-more-button" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    Load more shows <span>({filteredShows.length - visibleShows.length} remaining)</span>
                  </button>
                </div>
              ) : null}
              {compareIds.length ? (
                <section className="compare-section" aria-labelledby="compare-heading">
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow">SIDE BY SIDE</p>
                      <h2 id="compare-heading">Compare shows ({comparedShows.length}/{MAX_COMPARE_SHOWS})</h2>
                    </div>
                    <button className="text-button" type="button" onClick={() => setCompareIds([])}>Clear comparison</button>
                  </div>
                  <div className="comparison-table-wrap">
                    <table className="comparison-table">
                      <caption className="visually-hidden">Show ratings, genres, status, and premiere dates</caption>
                      <thead>
                        <tr>
                          <th scope="col">Show</th>
                          {comparedShows.map((show) => (
                            <th scope="col" key={show.id}>
                              <button className="comparison-show-link" type="button" onClick={() => openShow(show.id)}>{show.name}</button>
                              <button className="comparison-remove" type="button" aria-label={`Remove ${show.name} from comparison`} onClick={() => toggleCompare(show.id)}>Remove</button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr><th scope="row">Rating</th>{comparedShows.map((show) => <td key={show.id}>{show.rating ?? 'Not rated'}</td>)}</tr>
                        <tr><th scope="row">Genres</th>{comparedShows.map((show) => <td key={show.id}>{show.genres.join(', ') || 'Unknown'}</td>)}</tr>
                        <tr><th scope="row">Status</th>{comparedShows.map((show) => <td key={show.id}>{show.status ?? 'Unknown'}</td>)}</tr>
                        <tr><th scope="row">Premiered</th>{comparedShows.map((show) => <td key={show.id}>{show.premiered ?? 'Unknown'}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
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
                <h1 ref={pageHeadingRef} id="details-heading" tabIndex="-1">{selectedShow.name}</h1>
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
                <label className="watch-status-field">
                  <span>My watchlist status</span>
                  <select
                    aria-label={`Watch status for ${selectedShow.name}`}
                    value={watchStatuses[selectedShow.id] ?? ''}
                    onChange={(event) => setShowWatchStatus(selectedShow.id, event.target.value)}
                  >
                    <option value="">Not on my watchlist</option>
                    <option value="planned">Plan to watch</option>
                    <option value="watching">Watching</option>
                    <option value="finished">Finished</option>
                  </select>
                </label>
                <a
                  className="streaming-search"
                  href={`https://www.google.com/search?q=${encodeURIComponent(`where to watch ${selectedShow.name} TV show`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Search where to watch <span aria-hidden="true">↗</span>
                </a>
                <button
                  className={`show-page-favorite ${favoriteIds.includes(selectedShow.id) ? 'is-favorite' : ''}`}
                  type="button"
                  aria-pressed={favoriteIds.includes(selectedShow.id)}
                  onClick={() => toggleFavorite(selectedShow.id)}
                >
                  {favoriteIds.includes(selectedShow.id) ? '♥ Saved to favorites' : '♡ Add to favorites'}
                </button>
                <button className="show-page-share" type="button" onClick={copyShowLink}>
                  Share show
                </button>
                {shareMessage ? <p className="share-message" role="status">{shareMessage}</p> : null}
              </div>
            </article>
            <section className="episode-section" aria-labelledby="episode-heading">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">SEASONS & EPISODES</p>
                  <h2 id="episode-heading">Episode guide</h2>
                </div>
                {!isEpisodeGuideLoading && !episodeGuideError && currentEpisodes.length ? (
                  <p className="episode-count">
                    {new Set(currentEpisodes.map((episode) => episode.season)).size} seasons · {currentEpisodes.length} episodes
                  </p>
                ) : null}
              </div>
              {isEpisodeGuideLoading ? <p className="status-message" role="status">Loading episode guide…</p> : null}
              {episodeGuideError ? (
                <div className="error-panel" role="alert">
                  <p>{episodeGuideError}</p>
                  <button className="text-button" type="button" onClick={() => setEpisodeRetryCount((count) => count + 1)}>Retry episode guide</button>
                </div>
              ) : null}
              {!isEpisodeGuideLoading && !episodeGuideError && currentEpisodes.length ? (
                <ol className="episode-list">
                  {currentEpisodes.slice(0, 6).map((episode) => (
                    <li key={episode.id}>
                      <span className="episode-number">
                        S{String(episode.season ?? '?').padStart(2, '0')} · E{String(episode.number ?? 'Special').padStart(2, '0')}
                      </span>
                      <span className="episode-name">{episode.name}</span>
                      <span className="episode-airdate">{episode.airdate || 'Date not announced'}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {!isEpisodeGuideLoading && !episodeGuideError && !currentEpisodes.length ? (
                <p className="show-page-summary">No episode information is available for this show.</p>
              ) : null}
            </section>
            {similarShows.length ? (
              <section className="similar-section" aria-labelledby="similar-heading">
                <div className="section-title-row">
                  <div>
                    <p className="eyebrow">MORE LIKE THIS</p>
                    <h2 id="similar-heading">Similar shows</h2>
                  </div>
                </div>
                {renderShowGrid(similarShows)}
              </section>
            ) : null}
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
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {isShowPage && selectedShow ? `Show details for ${selectedShow.name}` : isFavoritesPage ? 'Favorites page' : 'Explore shows page'}
      </p>
    </main>
  )
}

export default App
