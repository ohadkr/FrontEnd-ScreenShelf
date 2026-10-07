import { useState } from 'react'
import shows from './data/shows.json'
import './App.css'

function App() {
  const [selectedShow, setSelectedShow] = useState(null)

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
          <ul className="shows-list">
            {shows.map((show) => (
              <li key={show.id}>
                <button
                  className="show-card"
                  type="button"
                  aria-pressed={selectedShow?.id === show.id}
                  onClick={() => setSelectedShow(show)}
                >
                  <img className="show-poster" src={show.image} alt="" />
                  <span className="show-name">{show.name}</span>
                </button>
              </li>
            ))}
          </ul>
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
                <p className="show-rating">{selectedShow.rating} <span>/ 10</span></p>
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
