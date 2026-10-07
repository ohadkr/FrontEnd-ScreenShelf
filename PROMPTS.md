## Task 1: Display sample shows
Prompt: Read PRD.md and tasks.md. Create a local JSON file with three sample TV shows, each with an id, name, and image URL, and display their names and posters in App.jsx without using the real API.
Follow-up: Fix the oversized cards, use a neat list or grid, cap poster width at 100px, and replace placeholder images with real TV show posters.
Agent did: Created `src/data/shows.json` with three sample shows and their detail fields, rendered the list, and styled compact cards with real TVmaze poster URLs.
I checked: Verified all three posters loaded in the browser and the production build succeeded.

## Task 2: Select a show and display its details
Prompt: When I click a TV show from the list, display a details panel with the selected show's summary, genres, and rating, using local JSON data and React state.
Agent did: Added selected-show state and accessible selection controls in `src/App.jsx`, plus a responsive details panel.
I checked: The production build succeeded and the editor reported no errors. A browser click-through could not be completed during that check.

## Tasks 3–6: Load live shows from TVmaze
Prompt: Use `https://api.tvmaze.com/shows` as the data source.
Agent did: Added `src/services/tvmaze.js` to fetch the show list, replaced local JSON loading with an API request on mount, mapped API fields for the list and details, and added loading and error states. No API key is required for this public endpoint.
I checked: Verified the live page loaded 240 shows, loaded a poster, and displayed the selected show's details. The production build succeeded.

## Search and genre filter
Prompt: Add a search tab and a filter to organize the shows.
Agent did: Added title search and a genre filter to the Shows panel, along with a result count and no-results message. Updated PRD.md to include these features.
I checked: Verified title search, genre filtering, and the no-results state against the live show list. The production build succeeded.
