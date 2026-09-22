# foodtofork

Overview
	People routinely will buy groceries and then default to familiar meals, which can leave ingredients unused and wasted. Existing recipe apps of Yummly and tasty are search first, where the user must look for a recipe and then buy ingredients for it. FoodToFork starts from what a user already has in their kitchen and surfaces what they can cook from it.
	FoodToFork is a responsive, mobile-friendly web app where a user builds a live inventory of groceries and can instantly see recipes ranked by how many of the required ingredients they already have. The loop of scan → inventory updates → recipes appear is designed to run in under 5 seconds and is usable by a non-technical person with no onboarding.

Project type: Responsive web app, built to work on desktop and mobile browser rather than a separate native app, so the team can focus its 12 week timeline on one codebase.

Features (Requirements)
Barcode scan add: device camera + barcode devoting library looks up product via the Open Food Facts API and adds it to inventory with name, image, and category
Manual add: text entry with autocomplete/search against Open Food Facts, used as a fallback when a barcode isn’t recognized
Inventory view: simple list where users can add and remove items
Recipe matching: queries TheMealDB and ranks candidate recipes by the percentage of required ingredients the user already owns
Recipe detail view: full ingredient list, instructions and image pulled from TheMealDB, with owned vs missing ingredients 
Responsive design: works on desktop and mobile browser for live demo with a clean UI

Stretch Goals
Dietary filters: applied on top of ranked recipe results
User accounts / cross device sync: guest only inventory stored in local storage; accounts added if time remains after MVP is stable
Native app wrapper: via capacitor around finished web app; attempted once core product is stable

Division of labor
Erik Gastelum
Full-stack
Manual Entry Fallback, Deployment, Testing, Picking up work
Maika Pangilinan 
Front-End
UX/UI for the application home page and Inventory view, Recipe detail view, etc.
Jonathan Torres 
Back-End
Open Food Facts API, + barcode library
Jacob Micu
Back-end
TheMealDB API, recipe detail view

