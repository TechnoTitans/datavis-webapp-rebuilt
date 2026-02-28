# Statbotics Data Integration Guide

## Overview
This guide explains how to import official match data from Statbotics and display it in your web application for comparison with your scouting data.

## What is Statbotics?
Statbotics (https://www.statbotics.io/) provides official FRC match data, calculated team statistics, and predictive models. It's a valuable resource for comparing your scouting accuracy against official data.

## Architecture

### 1. **Import Script** (`scripts/importStatbotics.mjs`)
Fetches match data from Statbotics API and stores it in Supabase.

**Key Components:**
- `fetchTeamMatches()` - Retrieves matches for a team from Statbotics API
- `transformMatchData()` - Converts Statbotics format to your database format
- Batch insertion into `statbotics_data` table

### 2. **Supabase Table** (`statbotics_data`)
Stores official Statbotics match data. You need to create this table with the following schema:

```sql
CREATE TABLE statbotics_data (
  id SERIAL PRIMARY KEY,
  "Statbotics ID" VARCHAR UNIQUE,
  "Event" VARCHAR,
  "Team" INTEGER,
  "Match" INTEGER,
  "Match Type" VARCHAR,
  
  -- Autonomous phase
  "Auto Algae" INTEGER,
  "Auto Coral" INTEGER,
  "Auto Leaves" BOOLEAN,
  "Auto Park" BOOLEAN,
  
  -- Teleop phase
  "Teleop Algae" INTEGER,
  "Teleop Coral" INTEGER,
  "Teleop Net" INTEGER,
  "Teleop Processor" INTEGER,
  
  -- Endgame phase
  "Endgame Park" BOOLEAN,
  "Endgame Shallow Trap" BOOLEAN,
  "Endgame Deep Trap" BOOLEAN,
  
  "Total Points" INTEGER,
  "Win" BOOLEAN,
  "Match Status" VARCHAR,
  "Data Source" VARCHAR,
  "created_at" TIMESTAMP DEFAULT NOW()
);
```

### 3. **React Page** (`src/pages/StatboticsData.jsx`)
Displays imported Statbotics data with:
- Team selection (same pattern as your TeamData page)
- Statistics summary
- Data table showing all match details
- Visual indicators for wins (green) vs losses (red)

## Step-by-Step Usage

### Step 1: Create the Supabase Table
Go to your Supabase dashboard and run the SQL above to create the `statbotics_data` table.

### Step 2: Run the Import Script
```bash
# Import data for specific teams for a specific event
EVENT_KEY=2025gagai node scripts/importStatbotics.mjs 1683 254 1690

# Explanation:
# - EVENT_KEY: The FRC event key (find at TBA or FIRST)
# - 1683, 254, 1690: Team numbers to import data for
```

**Example event keys:** `2025gagai`, `2025micen`, `2024micen`, etc.

### Step 3: Access the Page
Once imported, navigate to `/statbotics-data` in your app (or add a navigation button in TopBar.jsx).

## How It Works

### Import Flow
```
Statbotics API
     ↓
fetchTeamMatches()
     ↓
transformMatchData()
     ↓
Supabase (statbotics_data table)
     ↓
React Component (StatboticsData.jsx)
```

### Data Transformation
The script transforms Statbotics data from their API format to your schema:

**Statbotics API format:**
```json
{
  "event": "2025gagai",
  "team": 1683,
  "match_number": 1,
  "alliances": {
    "red": {
      "auto_algae_points": 5,
      "teleop_coral_points": 12
    }
  }
}
```

**Your database format:**
```json
{
  "Statbotics ID": "2025gagai_1683_1",
  "Team": 1683,
  "Match": 1,
  "Auto Algae": 5,
  "Teleop Coral": 12
  // ... other fields
}
```

## Comparing Scouting vs Statbotics Data

To compare your scouting data with official Statbotics data:

1. Use your existing `TeamData` page for scouting data
2. Use the new `StatboticsData` page for official data
3. Open both in separate tabs for side-by-side comparison
4. Look for discrepancies in:
   - Autonomous phase scoring
   - Teleop phase scoring
   - Endgame positions
   - Overall match outcomes

### Future: Create a Comparison Page
You could create a `Compare` page that shows scouting vs Statbotics data for the same match side-by-side to identify accuracy issues.

## API Reference

### Statbotics API Endpoints Used

#### Get Team Matches
```
GET https://api.statbotics.io/v3/team/{teamNumber}/matches
```
Returns all matches for a team across all events.

**Response:**
```json
[
  {
    "event": "2025gagai",
    "team": 1683,
    "match_number": 1,
    "comp_level": "qm",
    "alliances": {
      "red": { /* scoring data */ },
      "blue": { /* scoring data */ }
    },
    "won": true
  }
]
```

## Customization

### To fetch more detailed data:
Edit `transformMatchData()` in `importStatbotics.mjs` to include additional fields from the Statbotics API response.

### To add more teams:
Simply add team numbers to the import command:
```bash
EVENT_KEY=2025gagai node scripts/importStatbotics.mjs 1683 254 1690 2056 5539
```

### To import for multiple events:
Run the script multiple times with different EVENT_KEY values:
```bash
EVENT_KEY=2025gagai node scripts/importStatbotics.mjs 1683
EVENT_KEY=2025mibli node scripts/importStatbotics.mjs 1683
```

## Troubleshooting

### "No matches found"
- Verify the EVENT_KEY is correct
- Check if Statbotics has data for that event yet (typically within days of competition)
- Ensure the team number is valid

### Database insert errors
- Confirm the `statbotics_data` table exists in Supabase
- Check that VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set correctly
- Verify row doesn't already exist (use `DISTINCT` if re-importing)

### Missing columns in the page
- Make sure the `statbotics_data` table matches the schema exactly
- Check for typos in column names (they're case-sensitive in Supabase)

## Next Steps

1. ✅ Create `statbotics_data` table in Supabase
2. ✅ Run import script for your teams
3. ✅ Access the new page at `/statbotics-data`
4. 🔄 (Optional) Create a dedicated comparison view
5. 🔄 (Optional) Add analysis tools to find scouting discrepancies

