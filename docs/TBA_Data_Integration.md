# Extracting Data from The Blue Alliance (TBA)

## Overview
This project is designed to integrate with The Blue Alliance's API to enhance scouting data accuracy by comparing it with official match data. The system focuses on validating specific data points and flagging discrepancies for review.

## Key Components

### 1. API Integration Structure

#### Authentication
- All requests require an API key in the `X-TBA-Auth-Key` header
- Key should be stored in environment variables (VITE_OPENAI_API_KEY)
- Rate limited to 100 requests per second per API key

#### Core API Endpoints

1. **Event Data:**
```bash
# Get event list
GET /events/{year}
# Get specific event
GET /event/{event_key}
# Get event matches
GET /event/{event_key}/matches
# Get event rankings
GET /event/{event_key}/rankings
# Get event teams
GET /event/{event_key}/teams
```

2. **Team Data:**
```bash
# Get team info
GET /team/{team_key}
# Get team events in year
GET /team/{team_key}/events/{year}
# Get team matches in event
GET /team/{team_key}/event/{event_key}/matches
# Get team awards in event
GET /team/{team_key}/event/{event_key}/awards
```

3. **Match Data:**
```bash
# Get specific match
GET /match/{match_key}
# Format: {year}{event_key}_qm{match_number}
# Example: 2023miket_qm123
```

#### Response Formats

1. **Match Object:**
```json
{
  "key": "2023miket_qm123",
  "comp_level": "qm",  // qm = Qualification Match
  "match_number": 123,
  "alliances": {
    "blue": {
      "score": 240,
      "team_keys": ["frc1234", "frc5678", "frc9012"]
    },
    "red": {
      "score": 235,
      "team_keys": ["frc4321", "frc8765", "frc2109"]
    }
  },
  "score_breakdown": {
    "blue": {
      "autoPoints": 20,
      "teleopPoints": 40,
      "endgamePoints": 15,
      "totalPoints": 240,
      // Game-specific scoring details
      "autoCommunity": {...},
      "teleopCommunity": {...}
    },
    "red": {
      // Similar structure for red alliance
    }
  },
  "event_key": "2023miket"
}
```

2. **Team Object:**
```json
{
  "key": "frc1234",
  "team_number": 1234,
  "nickname": "Team Name",
  "name": "Full Team Name",
  "city": "City",
  "state_prov": "State",
  "country": "Country"
}
```

3. **Event Object:**
```json
{
  "key": "2023miket",
  "name": "Event Name",
  "event_code": "miket",
  "event_type": 0,
  "district": {
    "abbreviation": "MI",
    "display_name": "Michigan",
    "key": "2023mi"
  },
  "city": "City",
  "state_prov": "MI",
  "country": "USA",
  "start_date": "2023-03-01",
  "end_date": "2023-03-03",
  "year": 2023
}
```

#### Best Practices

1. **Data Caching:**
- Cache event and team data that doesn't change frequently
- Update match data more frequently during events
- Implement If-Modified-Since headers for efficient updates

2. **Error Handling:**
```javascript
try {
  const response = await fetch(url, {
    headers: {
      'X-TBA-Auth-Key': process.env.VITE_OPENAI_API_KEY,
      'If-Modified-Since': lastModified // Optional
    }
  });
  
  if (response.status === 304) {
    return cachedData; // Not modified
  }
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('TBA API Error:', error);
  throw error;
}
```

3. **Rate Limiting:**
- Implement request queuing for high-volume operations
- Use batch endpoints where available
- Cache responses to minimize API calls

### 2. Data Points of Interest
The system is particularly interested in the following data from TBA:
- **Match Events**:
  - Leave data
  - Park data
  - Autonomous points
  - Teleop points
  - Endgame points
  - Algae points
  - Coral points

### 3. Data Flow
1. **Data Fetching**: 
   - Fetch match data for specific events using The Blue Alliance API
   - Authentication using the provided API key

2. **Data Processing**:
   - Parse the fetched data to extract relevant fields
   - Compare TBA data against scouting data
   - Flag significant discrepancies for review

3. **Data Storage**:
   - Store the processed data in a Supabase database
   - Database connection details:
     - URL: `https://vyrwirioxoelcgrguxpq.supabase.co/`
     - Authentication handled via Supabase key

### 4. Data Comparison and Validation
The system specifically aims to:
- Use TBA data as the source of truth for:
  - Leave data points
  - Park data points
- Compare and validate:
  - Autonomous scoring
  - Teleop scoring
  - Endgame scoring
  - Algae points
  - Coral points

### 5. Components and Hooks
The project includes several components for data visualization and comparison:
- `CombinedMatchData` component: Displays combined data from TBA and scouting
- `useCombinedMatchData` hook: Manages the integration of TBA and scouting data

## Integration Points

### Components That Use TBA Data:
1. **Match Analysis**:
   - Compares scouting data with TBA data
   - Shows discrepancies in scoring
   - Validates autonomous and teleop actions

2. **Team Performance**:
   - Uses TBA data to validate team performance metrics
   - Compares official scores with scouted observations

3. **Data Validation**:
   - Flags significant differences between TBA and scouting data
   - Helps identify potential scouting errors or misreported data

## Planned Implementation Steps
1. Complete the TBA API service implementation in `tbaApi.js`
2. Implement data fetching and caching mechanisms
3. Set up data comparison and validation logic
4. Create UI components for displaying discrepancies
5. Implement automated data synchronization

## Usage Goals
The integration with The Blue Alliance serves to:
1. Increase scouting data accuracy
2. Provide official match data validation
3. Identify and correct discrepancies in scouting reports
4. Maintain high-quality data for team analysis and strategy development

## Future Enhancements
1. Real-time data synchronization with TBA
2. Automated discrepancy detection and reporting
3. Enhanced visualization of data comparisons
4. Machine learning for predicting data accuracy
5. Automated scouting error detection

Note: While the core structure for TBA integration is in place, some implementation files are currently empty or in progress. The system is designed to be extensible and can be easily updated once the TBA API integration is completed.