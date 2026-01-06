import { useState } from 'react'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'
import { useTeamData } from '../hooks/useTeamData'
import { useSelectedTeams } from '../hooks/useLocalStorage'
import MultiSelect from '../components/MultiSelect'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function TeamAnalysis() {
  // Use shared hooks
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsAnalysis', [])
  
  // Ensure selectedTeams is always an array
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []
  
  const { allTeams, matchRows, loading } = useTeamData(safeSelectedTeams)

  // Process match data for charts
  const chartData = {}
  if (matchRows) {
    matchRows.forEach((match, index) => {
      const scoutingIdParts = match["Scouting ID"]?.split('_') || []
      const teamNum = scoutingIdParts[1] || 'Unknown'
      const matchNum = scoutingIdParts[2] || (index + 1)
      
      if (!chartData[teamNum]) {
        chartData[teamNum] = []
      }
      
      chartData[teamNum].push({
        match: `Match ${matchNum}`,
        team: teamNum,
        matchNumber: parseInt(matchNum) || (index + 1),
        endgame: match['Endgame Position']?.toLowerCase() || 'none',
        L4: match['L4 Count'] || 0,
        L3: match['L3 Count'] || 0,
        L2: match['L2 Count'] || 0,
        L1: match['L1 Count'] || 0,
        Processor: match['Processor Count'] || 0,
        Net: match['Net Count'] || 0,
        'L4 Miss': match['L4 Missed Count'] || 0,
        'L3 Miss': match['L3 Missed Count'] || 0,
        'L2 Miss': match['L2 Missed Count'] || 0,
        'L1 Miss': match['L1 Missed Count'] || 0,
        'Processor Miss': match['Processor Missed Count'] || 0,
        'Net Miss': match['Net Missed Count'] || 0
      })
    })

    // Sort each team's matches by match number
    Object.keys(chartData).forEach(teamNum => {
      chartData[teamNum].sort((a, b) => a.matchNumber - b.matchNumber)
    })
  }

  const getEndgameLabel = (endgame) => {
    if (endgame?.includes('deep') && endgame?.includes('cage')) return 'Deep'
    if (endgame?.includes('shallow') && endgame?.includes('cage')) return 'Deep'
    if (endgame?.includes('park')) return 'Park'
    return 'None'
  }

  // Bar keys for selection and legend
  const allBarKeys = [
    "Processor", "Net", "L1", "L2", "L3", "L4",
    "Processor Miss", "Net Miss", "L1 Miss", "L2 Miss", "L3 Miss", "L4 Miss"
  ]
  const barColors = {
    "Processor": "#FF6B35",
    "Net": "#00D2FF",
    "L1": "#4CAF50",
    "L2": "#FFC107",
    "L3": "#FF9800",
    "L4": "#E91E63",
    "Processor Miss": "#FFD4C4",
    "Net Miss": "#B3F4FF",
    "L1 Miss": "#C8E6C9",
    "L2 Miss": "#FFF3C4",
    "L3 Miss": "#FFE0B2",
    "L4 Miss": "#F8BBD9"
  }

  // Stat selection state
  const [selectedBarKeys, setSelectedBarKeys] = useState(allBarKeys)

  // Event handlers
  const handleTeamToggle = (teamNumber) => {
    const teamStr = String(teamNumber)
    setSelectedTeams(prev => {
      // Ensure prev is an array
      const prevArray = Array.isArray(prev) ? prev : []
      if (prevArray.includes(teamStr)) {
        return prevArray.filter(t => t !== teamStr)
      } else {
        return [...prevArray, teamStr]
      }
    })
  }

  const clearAllTeams = () => {
    setSelectedTeams([])
  }

  return (
    <div className="team-analysis-container">
      <h1>Team Analysis</h1>
      
      <TeamSelector
        allTeams={allTeams || []}
        selectedTeams={safeSelectedTeams}
        onTeamToggle={handleTeamToggle}
        onClearAll={clearAllTeams}
        title="Select Teams to Analyze"
      />

      {/* Stat selection UI */}
      <div style={{ margin: '1rem 0', textAlign: 'center' }}>
        <MultiSelect
          options={allBarKeys}
          selected={selectedBarKeys}
          onChange={setSelectedBarKeys}
          label="Select Bars to Display"
          style={{
            display: 'inline-block',
            background: '#222',
            color: '#e0e0e0',
            borderRadius: 4,
            padding: 8,
            minWidth: 220,
            marginLeft: 10
          }}
        />
      </div>

      {loading && <Loading />}

      {safeSelectedTeams.length === 0 ? (
        <p>Select teams to view analysis.</p>
      ) : Object.keys(chartData).length === 0 ? (
        <p>No team data found for selected teams.</p>
      ) : (
        <div className="charts-container">
          {Object.entries(chartData).map(([teamNum, teamMatches]) => (
            <div key={teamNum} className="chart-container">
              <h3 style={{ color: '#2563eb', textAlign: 'center', marginBottom: '1rem' }}>
                Team {teamNum}
              </h3>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={teamMatches}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 80
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                  <XAxis 
                    dataKey="match"
                    stroke="#e0e0e0"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#e0e0e0" 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#3a3a3a',
                      border: '1px solid #4a4a4a',
                      borderRadius: '8px',
                      color: '#e0e0e0',
                      zIndex: 9999
                    }}
                    wrapperStyle={{
                      zIndex: 9999
                    }}
                    formatter={(value, name) => {
                      if (value === 0) return null; // Don't show zero values
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const endgame = getEndgameLabel(payload[0].payload.endgame)
                        return `${label} (${endgame})`
                      }
                      return label
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const endgame = getEndgameLabel(data.endgame);
                        // Custom order: Net, Processor, L4, L3, L2, L1, Net Miss, Processor Miss, L4 Miss, L3 Miss, L2 Miss, L1 Miss
                        const orderedStats = [
                          { key: 'Net', color: barColors["Net"] },
                          { key: 'Processor', color: barColors["Processor"] },
                          { key: 'L4', color: barColors["L4"] },
                          { key: 'L3', color: barColors["L3"] },
                          { key: 'L2', color: barColors["L2"] },
                          { key: 'L1', color: barColors["L1"] },
                          { key: 'Net Miss', color: barColors["Net Miss"] },
                          { key: 'Processor Miss', color: barColors["Processor Miss"] },
                          { key: 'L4 Miss', color: barColors["L4 Miss"] },
                          { key: 'L3 Miss', color: barColors["L3 Miss"] },
                          { key: 'L2 Miss', color: barColors["L2 Miss"] },
                          { key: 'L1 Miss', color: barColors["L1 Miss"] }
                        ];
                        return (
                          <div style={{
                            backgroundColor: '#3a3a3a',
                            border: '1px solid #4a4a4a',
                            borderRadius: '8px',
                            color: '#e0e0e0',
                            padding: '10px',
                            zIndex: 9999
                          }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
                              {label} ({endgame})
                            </p>
                            {orderedStats.map(stat => {
                              const value = data[stat.key];
                              if (value > 0) {
                                return (
                                  <div key={stat.key} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    marginBottom: '4px' 
                                  }}>
                                    <span style={{
                                      display: 'inline-block',
                                      width: '12px',
                                      height: '12px',
                                      backgroundColor: stat.color,
                                      marginRight: '8px'
                                    }}></span>
                                    <span>{stat.key}: {value}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    payload={[
                      // Made group
                      { value: 'Processor', type: 'rect', color: '#FF6B35', id: 'Processor' },
                      { value: 'Net', type: 'rect', color: '#00D2FF', id: 'Net' },
                      { value: 'L1', type: 'rect', color: '#4CAF50', id: 'L1' },
                      { value: 'L2', type: 'rect', color: '#FFC107', id: 'L2' },
                      { value: 'L3', type: 'rect', color: '#FF9800', id: 'L3' },
                      { value: 'L4', type: 'rect', color: '#E91E63', id: 'L4' },
                      // Missed group
                      { value: 'Processor Miss', type: 'rect', color: '#FFD4C4', id: 'Processor Miss' },
                      { value: 'Net Miss', type: 'rect', color: '#B3F4FF', id: 'Net Miss' },
                      { value: 'L1 Miss', type: 'rect', color: '#C8E6C9', id: 'L1 Miss' },
                      { value: 'L2 Miss', type: 'rect', color: '#FFF3C4', id: 'L2 Miss' },
                      { value: 'L3 Miss', type: 'rect', color: '#FFE0B2', id: 'L3 Miss' },
                      { value: 'L4 Miss', type: 'rect', color: '#F8BBD9', id: 'L4 Miss' }
                    ]}
                    content={() => {
                      const madeItems = [
                        { value: 'Processor', color: '#FF6B35' },
                        { value: 'Net', color: '#00D2FF' },
                        { value: 'L1', color: '#4CAF50' },
                        { value: 'L2', color: '#FFC107' },
                        { value: 'L3', color: '#FF9800' },
                        { value: 'L4', color: '#E91E63' }
                      ];
                      const missedItems = [
                        { value: 'Processor Miss', color: '#FFD4C4' },
                        { value: 'Net Miss', color: '#B3F4FF' },
                        { value: 'L1 Miss', color: '#C8E6C9' },
                        { value: 'L2 Miss', color: '#FFF3C4' },
                        { value: 'L3 Miss', color: '#FFE0B2' },
                        { value: 'L4 Miss', color: '#F8BBD9' }
                      ];
                      return (
                        <div style={{ 
                          margin: '20px 0 0 0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          {/* Made row */}
                          <ul style={{ 
                            listStyle: 'none', 
                            padding: 0, 
                            margin: 0,
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '10px'
                          }}>
                            {madeItems.map((item, index) => (
                              <li key={index} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                fontSize: '12px',
                                color: '#e0e0e0'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  backgroundColor: item.color,
                                  marginRight: '5px'
                                }}></span>
                                {item.value}
                              </li>
                            ))}
                          </ul>
                          
                          {/* Missed row */}
                          <ul style={{ 
                            listStyle: 'none', 
                            padding: 0, 
                            margin: 0,
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: '10px'
                          }}>
                            {missedItems.map((item, index) => (
                              <li key={index} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                fontSize: '12px',
                                color: '#e0e0e0'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '12px',
                                  height: '12px',
                                  backgroundColor: item.color,
                                  marginRight: '5px'
                                }}></span>
                                {item.value}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }}
                  />
                  
                  {/* Replace static <Bar> components with dynamic rendering based on selectedBarKeys */}
                  {selectedBarKeys.map(key => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="scoring"
                      fill={barColors[key] || "#888"}
                      stroke={key.includes("Miss") ? "#000" : undefined}
                      strokeWidth={key.includes("Miss") ? 2 : undefined}
                      strokeDasharray={key.includes("Miss") ? "6 6" : undefined}
                      name={key}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TeamAnalysis
