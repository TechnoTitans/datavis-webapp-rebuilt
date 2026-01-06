# Supabase Database Structure

## Tables Overview

### 1. match_data
Primary table for storing approved match data
#### Fields:
- `Scouting ID` (Primary Key): Format `[eventKey]_[teamNumber]_[matchNumber]`
- `Scouter Name`: Name of the person who collected the data
- `Position`: Scouting position
- `Auto Path`: Autonomous path data
- `Use Data`: Boolean flag to indicate if the data should be used in analysis
- Score-related fields:
  - `L4 Count`
  - `L4 Missed Count`
  - `L3 Count`
  - `L3 Missed Count`
  - `L2 Count`
  - `L2 Missed Count`
  - `L1 Count`
  - `L1 Missed Count`
  - `Processor Count`
  - `Processor Missed Count`
  - `Net Count`
  - `Net Missed Count`
- Performance fields:
  - `Endgame Position`
  - `Is Ground Coral?` (Boolean)
  - `Is Ground Algae?` (Boolean)
  - `Driver Quality`
  - `Defense Ability`
  - `Mechanical Reliability`
  - `Algae Descorability`
- `Notes`: Additional observations

### 2. unconfirmed_data
Temporary storage for data pending review
#### Fields:
(Same structure as match_data)
- Used as a staging area before data is approved and moved to match_data
- Data is deleted from this table once approved or rejected

## Data Flow

1. **Initial Data Entry**:
   - Data is scanned from QR codes or manually entered
   - Initially stored in `unconfirmed_data` table

2. **Data Verification**:
   - Authenticated users can review unconfirmed data
   - Options to approve or reject each entry

3. **Data Approval Process**:
   ```plaintext
   QR Scan/Manual Entry → unconfirmed_data → Review → match_data
   ```

4. **Data Usage Control**:
   - `Use Data` flag in match_data controls whether the record is included in analysis
   - Can be toggled through the Settings page

## Security

- Database editing requires authentication
- Simple password protection for administrative functions
- Row Level Security (RLS) policies in place

## Common Queries

### Fetch Team Match Data
```sql
SELECT * FROM match_data
WHERE "Use Data" = true
AND "Scouting ID" LIKE '%_[teamNumber]_%'
```

### Get Unconfirmed Entries
```sql
SELECT * FROM unconfirmed_data
```

### Update Data Usage Flag
```sql
UPDATE match_data
SET "Use Data" = true/false
WHERE "Scouting ID" = '[specific_id]'
```

## Data Validation

### Scouting ID Format
- Event prefix
- Team number
- Match number
Example: `2025gagai_1683_1`

### Score Validation
- All count fields must be non-negative integers
- Missed counts should be reasonable compared to successful attempts

## Integration Points

1. **TBA Data Comparison**:
   - Match data can be compared with The Blue Alliance API data
   - Used for validation and accuracy checking

2. **Analysis Features**:
   - Team performance tracking
   - Match strategy analysis
   - Picklist generation
   - Rankings calculation

## Best Practices

1. **Data Entry**:
   - Always use the QR scanner when possible
   - Manual entry should be double-checked
   - Include detailed notes for unusual situations

2. **Data Management**:
   - Regularly review unconfirmed data
   - Use the `Use Data` flag to exclude questionable entries
   - Keep detailed notes for any manual data modifications

3. **Performance**:
   - Use specific column selection instead of SELECT *
   - Include appropriate indexes
   - Implement pagination for large datasets