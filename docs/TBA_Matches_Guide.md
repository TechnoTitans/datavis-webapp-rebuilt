# Getting Match Data from The Blue Alliance API - A Complete Guide

## Prerequisites
- TBA API Key (Your key: `yX979sIiDrv6f5bBEg5bnPu2WHP7zrG0AwuyBUQ3f9jgL3s2qiMsKcnDIQIUOAo0`)
- Basic understanding of HTTP requests
- Event key or team number you want to fetch matches for

## Methods to Get Matches

### 1. Get All Matches from a Specific Event

```bash
curl -X GET "https://www.thebluealliance.com/api/v3/event/{event_key}/matches" \
-H "X-TBA-Auth-Key: your_api_key" \
-H "accept: application/json"
```

Example for 2025 Georgia AI event:
```bash
curl -X GET "https://www.thebluealliance.com/api/v3/event/2025gagai/matches" \
-H "X-TBA-Auth-Key: yX979sIiDrv6f5bBEg5bnPu2WHP7zrG0AwuyBUQ3f9jgL3s2qiMsKcnDIQIUOAo0" \
-H "accept: application/json"
```

### 2. Get Matches for a Specific Team at an Event

```bash
curl -X GET "https://www.thebluealliance.com/api/v3/team/{team_key}/event/{event_key}/matches" \
-H "X-TBA-Auth-Key: your_api_key" \
-H "accept: application/json"
```

Example for Team 1683 at 2025 Georgia AI event:
```bash
curl -X GET "https://www.thebluealliance.com/api/v3/team/frc1683/event/2025gagai/matches" \
-H "X-TBA-Auth-Key: yX979sIiDrv6f5bBEg5bnPu2WHP7zrG0AwuyBUQ3f9jgL3s2qiMsKcnDIQIUOAo0" \
-H "accept: application/json"
```

### 3. Get a Specific Match

```bash
curl -X GET "https://www.thebluealliance.com/api/v3/match/{match_key}" \
-H "X-TBA-Auth-Key: your_api_key" \
-H "accept: application/json"
```

Example for Qualification Match 1 at 2025 Georgia AI event:
```bash
curl -X GET "https://www.thebluealliance.com/api/v3/match/2025gagai_qm1" \
-H "X-TBA-Auth-Key: yX979sIiDrv6f5bBEg5bnPu2WHP7zrG0AwuyBUQ3f9jgL3s2qiMsKcnDIQIUOAo0" \
-H "accept: application/json"
```

## Understanding Match Keys

Match keys are constructed as follows:
`{year}{event_code}_{comp_level}{match_number}`

Components:
- `year`: The year of the event (e.g., "2025")
- `event_code`: The event code (e.g., "gagai")
- `comp_level`: The competition level:
  - `qm`: Qualification Match
  - `qf`: Quarter-Final
  - `sf`: Semi-Final
  - `f`: Final
- `match_number`: The match number (e.g., "1")

Example: `2025gagai_qm1` = 2025 Georgia AI Event, Qualification Match 1

## Response Format

The API returns match data in JSON format. Here's what a typical match response looks like:

```json
{
  "key": "2025gagai_qm1",
  "comp_level": "qm",
  "match_number": 1,
  "alliances": {
    "blue": {
      "score": 240,
      "team_keys": ["frc1234", "frc5678", "frc9012"],
      "surrogate_team_keys": [],
      "dq_team_keys": []
    },
    "red": {
      "score": 235,
      "team_keys": ["frc4321", "frc8765", "frc2109"],
      "surrogate_team_keys": [],
      "dq_team_keys": []
    }
  },
  "winning_alliance": "blue",
  "event_key": "2025gagai",
  "time": 1625097600,
  "actual_time": 1625097845,
  "predicted_time": 1625097600,
  "post_result_time": 1625098445,
  "score_breakdown": {
    "blue": {
      "autoPoints": 20,
      "teleopPoints": 40,
      "endgamePoints": 15,
      // Game-specific scoring details
    },
    "red": {
      // Similar structure for red alliance
    }
  }
}
```

## Important Fields in Match Data

1. **Basic Match Information:**
   - `key`: Unique match identifier
   - `comp_level`: Competition level (qm, qf, sf, f)
   - `match_number`: Match number
   - `event_key`: Event identifier

2. **Alliance Information:**
   - `alliances.blue.team_keys`: Array of blue alliance team numbers
   - `alliances.red.team_keys`: Array of red alliance team numbers
   - `alliances.blue.score`: Blue alliance score
   - `alliances.red.score`: Red alliance score

3. **Score Breakdown:**
   - `score_breakdown.blue`: Detailed blue alliance scoring
   - `score_breakdown.red`: Detailed red alliance scoring
   - Contains game-specific scoring elements

4. **Timing Information:**
   - `time`: Scheduled match time
   - `actual_time`: Actual match start time
   - `post_result_time`: When results were posted

## Best Practices

1. **Caching:**
   - Cache match results during events
   - Update frequently during competition
   - Store historical match data locally

2. **Error Handling:**
   - Check HTTP response codes
   - Handle 404s for non-existent matches
   - Implement rate limiting protection

3. **Rate Limiting:**
   - Maximum 100 requests per second
   - Implement request queuing for bulk operations
   - Use batch endpoints where available

4. **Data Validation:**
   - Always check if match data exists
   - Verify alliance scores and team numbers
   - Handle missing or null fields gracefully

## Common Use Cases

1. **Event Analysis:**
```bash
# Get all matches from an event
curl -X GET "https://www.thebluealliance.com/api/v3/event/2025gagai/matches" \
-H "X-TBA-Auth-Key: your_api_key"
```

### Get All Matches with Simple Event Filter
```bash
# Get all matches from an event with simple formatting
curl -X GET "https://www.thebluealliance.com/api/v3/event/2025gagai/matches/simple" \
-H "X-TBA-Auth-Key: yX979sIiDrv6f5bBEg5bnPu2WHP7zrG0AwuyBUQ3f9jgL3s2qiMsKcnDIQIUOAo0" \
-H "accept: application/json"
```
This endpoint returns a simplified version of match data, perfect for quick analysis. The response excludes detailed score breakdowns and includes only essential match information.

2. **Team Performance Tracking:**
```bash
# Get team's matches at an event
curl -X GET "https://www.thebluealliance.com/api/v3/team/frc1683/event/2025gagai/matches" \
-H "X-TBA-Auth-Key: your_api_key"
```

3. **Match Details:**
```bash
# Get specific match details
curl -X GET "https://www.thebluealliance.com/api/v3/match/2025gagai_qm1" \
-H "X-TBA-Auth-Key: your_api_key"
```