1. One-sentence pitch
A clean and simple master-detail web app that lets TV show fans effortlessly browse through a catalog of shows and explore their key details, genres, and ratings.

2. Who it is for
TV show enthusiasts and casual viewers who want a quick, distraction-free way to discover shows and check quick summaries, ratings, and genres in one organized interface.

3. Screens (landing, list, details)
Landing View: A welcoming hero area with genre shortcuts and navigation to explore the catalog or saved favorites.

Main List View: A searchable, filterable, sortable poster grid displaying the TV show catalog beneath its controls.

Details View: A dialog displaying the selected show's poster, summary, genres, rating, status, premiere date, and network when available.

Favorites View: A collection of shows saved by the user and persisted in the browser.

4. Must-have features
Fetch and display a list of TV shows from the TV Maze API.

Display each show's name and poster image in the main list.

Search shows by title, filter by genre or minimum rating, and sort by title or rating.

Clear active filters without reloading the show list.

Browse all shows in a poster grid and navigate directly to shows by genre.

Add and remove favorites from the catalog or show details; preserve favorites between visits.

Allow users to click on any show in the list to select it.

Display the selected show's summary, genres, and rating in the details panel.

Display the selected show's status, premiere date, and network when available.

Show a retry option when loading shows fails and a fallback when a poster is unavailable.

5. Acceptance criteria
When I open the app, I see a list of TV shows displaying their names and poster images.

When I click on a TV show in the list, I see its detailed information load in the details panel.

When I view the details panel, I see the show's summary, genres, and rating clearly presented.

When show data or poster images are unavailable, the app presents a useful fallback instead of breaking.

When I save a show as a favorite, it appears in a dedicated favorites view and remains saved after reloading.

6. Not now (ideas for later)
Dark mode theme toggle.

7. Data: the API URL and the fields we use
API URL: [https://api.tvmaze.com/shows](https://api.tvmaze.com/shows)

Fields used:

name (Show title)

image -> medium or original (Poster image)

summary (Show description)

genres (List of categories)

rating -> average (Show rating)