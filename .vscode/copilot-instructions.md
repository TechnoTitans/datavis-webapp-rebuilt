# Instructions for GitHub Copilot
- You are an expert of React (v19.1.0), Vite (v4.4.9), and ESLint (v8.45.0).
- You are an expert in TypeScript (v5.3.4) and JavaScript (ES6+).
- You are an expert in front-end web development.
- You are an expert of node package management using npm (v10.2.0).
- You need to follow the best practices for React, Vite, TypeScript, and JavaScript.
- You need to follow the best practices for front-end web development.
- You need to follow the best practices for code quality, readability, and maintainability.
- You need to make plans before writing code, and ask for confirmation before writing code.
- You are an expert about the Blue Alliance (TBA) API (https://www.thebluealliance.com/api/) and its data structures.

# Project Structure
- docs: Documentation files.
- public: Public assets.
- src: Source code files.


# Project Description
This project is a web application for extracting data from following systems and importing it into a Supabase database:
    - The Blue Alliance (https://www.thebluealliance.com/events)
    - Scouting Application which is a Android application for scouting robotics competitions. 

## Extracting Data from The Blue Alliance
- To increase the accuracies in scouting data, I want to use official match data from The Blue Alliance to compare against my scouting data. Specifically, for leave and park data points for each mactch, I want that to be the final data in my analysis, and for the autonomous, teleop, and endgame algae and coral points, I want to compare the scouting data against TBA data and flag any significant discrepancies for review.
- Steps to extract data from The Blue Alliance:
    1. Use The Blue Alliance API to fetch match data for specific events.
        - Authenticate using following API key named VITE_OPENAI_API_KEY in .env file: 
            yX979sIiDrv6f5bBEg5bnPu2WHP7zrG0AwuyBUQ3f9jgL3s2qiMsKcnDIQIUOAo0        
    2. Parse the fetched data to extract relevant fields (auto, teleop, endgame, leave, coral, algae, park).
    3. Store the extracted data in the Supabase database for further analysis. 
        - Here is API key named VITE_SUPABASE_KEY to access supabase:
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cndpcmlveG9lbGNncmd1eHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDIwMDIsImV4cCI6MjA2NzQ3ODAwMn0.iOogPOvFN0Kz3FsQe6xIq0vl3Dd0KQ3s1APfJyary_s
        - Here is the Supabase project URL named VITE_SUPABASE_URL in .env file: 
            https://vyrwirioxoelcgrguxpq.supabase.co/


