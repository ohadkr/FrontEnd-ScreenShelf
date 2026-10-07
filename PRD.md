1. One-sentence pitch
A clean and simple master-detail web app that lets TV show fans effortlessly browse through a catalog of shows and explore their key details, genres, and ratings.

2. Who it is for
TV show enthusiasts and casual viewers who want a quick, distraction-free way to discover shows and check quick summaries, ratings, and genres in one organized interface.

3. Screens (list, details)
Main List View: A scrollable sidebar or grid layout displaying the collection of TV shows, where each item shows its title and poster image.

Details Panel: A dedicated content area (side panel or main view) that displays comprehensive information for the currently selected show, including its poster, summary, genres, and rating.

4. Must-have features
Fetch and display a list of TV shows from the TV Maze API.

Display each show's name and poster image in the main list.

Allow users to click on any show in the list to select it.

Display the selected show's summary, genres, and rating in the details panel.

5. Acceptance criteria
When I open the app, I see a list of TV shows displaying their names and poster images.

When I click on a TV show in the list, I see its detailed information load in the details panel.

When I view the details panel, I see the show's summary, genres, and rating clearly presented.

6. Not now (ideas for later)
Search bar to find shows by title.

Filtering shows by genre or rating.

Adding shows to a personal favorites list.

Dark mode theme toggle.

7. Data: the API URL and the fields we use
API URL: [https://api.tvmaze.com/shows](https://api.tvmaze.com/shows)

Fields used:

name (Show title)

image -> medium or original (Poster image)

summary (Show description)

genres (List of categories)

rating -> average (Show rating)