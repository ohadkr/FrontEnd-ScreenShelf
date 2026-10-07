1. One-sentence pitch
A clean and simple master-detail web app that lets TV show fans effortlessly browse through a catalog of shows and explore their key details, genres, and ratings.

2. Who it is for
TV show enthusiasts and casual viewers who want a quick, distraction-free way to discover shows and check quick summaries, ratings, and genres in one organized interface.

3. Screens (landing, catalog, show details, favorites)
Landing View: A welcoming hero area with compact, visual genre cards showing each genre's show count and navigation to explore the catalog or saved favorites.

Catalog View: A searchable, filterable, sortable poster grid displaying the full TV show catalog beneath its controls.

Show Details View: A dedicated in-app page displaying the selected show's poster, summary, genres, rating, status, premiere date, and network when available. Navigation stays within the same HTML document.

Favorites View: A dedicated in-app page showing saved favorites and watchlist statuses, with collection import/export and recently viewed shows.

4. Must-have features
Fetch and display a list of TV shows from the TV Maze API.

Display each show's name and poster image in the main list.

Search shows by title or genre, filter by genre or minimum rating, and sort by title or rating.

Filter shows by status, network, and premiere year.

Clear active filters without reloading the show list.

Load the show catalog in batches to keep the initial browse view responsive.

Browse all shows in a poster grid and navigate directly to shows by genre.

Add and remove favorites from the catalog or show details; preserve favorites between visits.

Track shows as "Plan to watch", "Watching", or "Finished", and filter the catalog by watchlist status.

Import and export favorites and watchlist statuses as a portable JSON collection.

Show recently viewed series on the landing page and provide a random pick from current search results.

Compare up to three shows by rating, genres, status, and premiere date.

Recommend similar shows using shared genres and show season/episode counts and an episode guide on details pages.

Provide an external search link for streaming availability without claiming provider availability is verified.

Navigate between the catalog, favorites, and show details without a full page reload; support browser back and forward.

Share direct links to individual show detail pages.

Preserve catalog search, filter, sort, and pagination state when returning from a show detail page.

Offer a dark mode preference that is saved between visits, with accessible keyboard and screen-reader feedback.

Allow users to open any show from the catalog or favorites view.

Display the selected show's summary, genres, and rating on its show details page.

Display the selected show's status, premiere date, and network when available.

Show a retry option when loading shows fails and a fallback when a poster is unavailable.

5. Acceptance criteria
When I open the app, I see a list of TV shows displaying their names and poster images.

When I select a TV show, I see its detailed information on an in-app show page.

When I view a show's details page, I see its summary, genres, and rating clearly presented.

When show data or poster images are unavailable, the app presents a useful fallback instead of breaking.

When I save a show as a favorite, it appears in a dedicated favorites view and remains saved after reloading.

When I select a show or open favorites, the requested view replaces the current app view without reloading the HTML document.

When I browse the catalog, results are paginated and can be filtered by status, network, and premiere year.

When I open a show URL directly, its details load and the URL can be copied and shared.

When I use keyboard or screen-reader navigation, page changes and result counts are announced and focus is managed sensibly.

When I switch themes, the app remembers my preference on this device.

When I set a watchlist status, it persists locally and can be filtered from the catalog.

When I export my collection, I can import the JSON file to restore favorites and watchlist statuses.

When I open a show, it appears in recently viewed and related shows are suggested by shared genres.

When I compare shows, up to three titles are shown together with their key metadata.

When episode data is available, the show page shows season and episode counts; streaming availability links to an external search rather than asserting current provider coverage.

6. Not now (ideas for later)
Account sync and cross-device collections; verified, region-specific streaming availability.

7. Data: the API URL and the fields we use
API URL: [https://api.tvmaze.com/shows](https://api.tvmaze.com/shows)
Episode URL: `https://api.tvmaze.com/shows/{id}/episodes`

Fields used:

name (Show title)

image -> medium or original (Poster image)

summary (Show description)

genres (List of categories)

rating -> average (Show rating)