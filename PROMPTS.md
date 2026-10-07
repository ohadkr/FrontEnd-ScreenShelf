## Task 1 show the list:
Prompt: Read my PRD.md and tasks.md. Let's do Task 1: Create a local JSON file with 3 sample TV shows. Then, update App.jsx to display a simple list. Later, I asked to fix the CSS because the cards were too big.
Agent did: Created shows.json in a data folder, and updated App.jsx, App.css, and index.css to render the list with smaller poster images.
I checked: I ran the app in the browser using npm run dev. I noticed the CSS was wrong initially, asked the agent to fix it, and verified the final list looks good.

## Task 2 click to show details
Prompt: Let's move on to Task 2. When I click a TV show from the list, display a details panel...
Agent did: Added state to App.jsx to track the selected show, and created the details panel to display summary, genres, and rating.
I checked: Clicked on different shows in the browser and verified that the details panel updates correctly.

