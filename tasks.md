Task 1
Initialize the React project and display a static list of shows using local JSON data

Set up a new React application and structure the basic master-detail layout (list sidebar and details panel container).

Create a local JSON file containing a few sample TV show items with fields for name, poster image, summary, genres, and rating.

Render the list of sample shows in the UI showing each show's name and poster image.

Done when: The app runs locally and displays the static list of sample shows from the local JSON file on the screen.

Task 2
Implement selection state and show details for the clicked item

Add a click handler to each item in the list view to track the currently selected show in the application state.

Pass the selected show data into the details panel component.

Render the selected show's summary, genres, and rating when an item is clicked.

Done when: Clicking any show in the list successfully updates the details panel to display that specific show's summary, genres, and rating.

Task 3
Create an API service module to fetch data from TV Maze

Create a dedicated API service file to handle HTTP requests.

Write a function that calls the TV Maze shows endpoint ([https://api.tvmaze.com/shows](https://api.tvmaze.com/shows)) using fetch.

Handle network responses and basic error catching.

Done when: The service function successfully fetches and returns the raw array of TV shows from the public API.

Task 4
Replace local JSON data with live API data on component mount

Import the API service function into the main application or list component.

Use React hooks (useEffect and useState) to fetch the list of TV shows when the component mounts.

Store the fetched API data in state and pass it down to the list component.

Done when: The app loads live TV show data from [https://api.tvmaze.com/shows](https://api.tvmaze.com/shows) upon startup and renders them in the list.

Task 5
Map API response fields to UI components

Verify and adjust the data mapping from the TV Maze API payload to match the required UI fields (name, image.medium, summary, genres, and rating.average).

Handle cases where optional or nested fields (such as rating or images) might be missing or null.

Done when: All list items and detail views correctly display the mapped API fields without runtime errors or missing data crashes.

Task 6
Add loading and error states for a smooth user experience

Implement a loading indicator (spinner or text message) while the app fetches data from the API.

Implement a user-friendly error message if the API request fails or the network is offline.

Done when: The UI clearly shows a loading state while fetching data and handles failed network requests gracefully.

Task 7
Style the master-detail layout and polish the user interface

Apply clean, responsive CSS styling for the master-detail split view (e.g., side-by-side layout on desktop).

Style the list items, poster images, typography, and detail panel containers for readability.

Done when: The app has a polished, visually appealing layout where the list and details panel are clearly separated and easy to read.

Task 8
Perform final testing, code cleanup, and build verification

Review the code for unused variables, console logs, or styling bugs.

Verify that all user flows (viewing the list, clicking an item, viewing details) work smoothly with live data.

Run the production build command to ensure there are no compilation or bundling errors.

Done when: The app builds successfully with zero errors and all acceptance criteria from the PRD are fully met.