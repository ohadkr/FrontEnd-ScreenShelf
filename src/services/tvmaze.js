const SHOWS_URL = 'https://api.tvmaze.com/shows'

export async function fetchShows({ signal } = {}) {
  const response = await fetch(SHOWS_URL, { signal })

  if (!response.ok) {
    throw new Error(`TVmaze request failed (${response.status})`)
  }

  const shows = await response.json()

  if (!Array.isArray(shows)) {
    throw new Error('TVmaze returned an unexpected response')
  }

  return shows
}

export async function fetchShowEpisodes(showId, { signal } = {}) {
  const response = await fetch(`${SHOWS_URL}/${showId}/episodes`, { signal })

  if (!response.ok) {
    throw new Error(`TVmaze episode request failed (${response.status})`)
  }

  const episodes = await response.json()

  if (!Array.isArray(episodes)) {
    throw new Error('TVmaze returned an unexpected episode response')
  }

  return episodes
}
