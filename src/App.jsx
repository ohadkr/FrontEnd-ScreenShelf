import shows from './data/shows.json'
import './App.css'

function App() {
  return (
    <main className="shows-page">
      <header className="shows-header">
        <p className="eyebrow">TV SHOW LIBRARY</p>
        <h1>Find your next favorite</h1>
        <p className="shows-intro">Browse a few shows to get started.</p>
      </header>

      <ul className="shows-list">
        {shows.map((show) => (
          <li className="show-card" key={show.id}>
            <img className="show-poster" src={show.image} alt={`${show.name} poster`} />
            <h2>{show.name}</h2>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
