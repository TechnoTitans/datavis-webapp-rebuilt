import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'
import FieldVisualization from '../components/FieldVisualization'
import { useTeamData } from '../hooks/useTeamData'
import { useSelectedTeams } from '../hooks/useLocalStorage'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { parseAutoPath } from '../utils/autoPathParser'
import '../index.css'
import MultiSelect from '../components/MultiSelect'

function AutoPaths() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('stats')
  const [currentPathIndex, setCurrentPathIndex] = useState({})
  const [selectedBarKeys, setSelectedBarKeys] = useState([
    "Processor", "Net", "L1", "L2", "L3", "L4",
    "Processor Miss", "Net Miss", "L1 Miss", "L2 Miss", "L3 Miss", "L4 Miss"
  ])

  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsAutoPaths', [])
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []
  const { allTeams, matchRows, loading } = useTeamData(safeSelectedTeams, true)

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

  // Process auto path data for charts
  const chartData = {}
  if (matchRows) {
    matchRows.forEach((match, index) => {
      const scoutingIdParts = match["Scouting ID"]?.split('_') || []
      const teamNum = scoutingIdParts[1] || 'Unknown'
      const matchNum = scoutingIdParts[2] || (index + 1)
      if (!chartData[teamNum]) chartData[teamNum] = []
      const autoPath = match['Auto Path'] || ''
      const parsedAutoData = parseAutoPath(autoPath)
      chartData[teamNum].push({
        match: `Match ${matchNum}`,
        team: teamNum,
        matchNumber: parseInt(matchNum) || (index + 1),
        autoPath: autoPath,
        L4: parsedAutoData.L4 || 0,
        L3: parsedAutoData.L3 || 0,
        L2: parsedAutoData.L2 || 0,
        L1: parsedAutoData.L1 || 0,
        Processor: parsedAutoData.Processor || 0,
        Net: parsedAutoData.Net || 0,
        'L4 Miss': parsedAutoData.L4_missed || 0,
        'L3 Miss': parsedAutoData.L3_missed || 0,
        'L2 Miss': parsedAutoData.L2_missed || 0,
        'L1 Miss': parsedAutoData.L1_missed || 0,
        'Processor Miss': parsedAutoData.Processor_missed || 0,
        'Net Miss': parsedAutoData.Net_missed || 0,
        opponentLeft: parsedAutoData.opponentLeft,
        coralStations: parsedAutoData.coralStations,
        parsedData: parsedAutoData,
        position: parsedAutoData.position
      })
    })
    Object.keys(chartData).forEach(teamNum => {
      chartData[teamNum].sort((a, b) => a.matchNumber - b.matchNumber)
      if (!(teamNum in currentPathIndex)) {
        setCurrentPathIndex(prev => ({ ...prev, [teamNum]: 0 }))
      }
    })
  }

  const handleTeamToggle = (teamNumber) => {
    const teamStr = String(teamNumber)
    setSelectedTeams(prev => {
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
    setCurrentPathIndex({})
  }

  const handleTeamClick = (teamNumber) => {
    localStorage.setItem('selectedTeamsAnalysis', JSON.stringify([String(teamNumber)]))
    navigate('/team-analysis')
  }

  const handleNextPath = (teamNum) => {
    setCurrentPathIndex(prev => {
      const teamPaths = chartData[teamNum] || []
      const currentIndex = prev[teamNum] || 0
      const nextIndex = currentIndex + 1 < teamPaths.length ? currentIndex + 1 : 0
      return { ...prev, [teamNum]: nextIndex }
    })
  }

  const handlePrevPath = (teamNum) => {
    setCurrentPathIndex(prev => {
      const teamPaths = chartData[teamNum] || []
      const currentIndex = prev[teamNum] || 0
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : teamPaths.length - 1
      return { ...prev, [teamNum]: prevIndex }
    })
  }

  return (
    <div className="auto-paths-container">
      <h1>Auto Paths</h1>

      <TeamSelector
        allTeams={allTeams || []}
        selectedTeams={safeSelectedTeams}
        onTeamToggle={handleTeamToggle}
        onClearAll={clearAllTeams}
        title="Select Teams for Auto Path Analysis"
      />

      {/* View Mode Toggle */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        margin: '1rem 0',
        padding: '1rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        border: '1px solid #4a4a4a'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e0e0e0' }}>
          <input
            type="radio"
            name="viewMode"
            value="stats"
            checked={viewMode === 'stats'}
            onChange={(e) => setViewMode(e.target.value)}
          />
          <span style={{ fontWeight: 'bold' }}>Stats Mode</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e0e0e0' }}>
          <input
            type="radio"
            name="viewMode"
            value="visualization"
            checked={viewMode === 'visualization'}
            onChange={(e) => setViewMode(e.target.value)}
          />
          <span style={{ fontWeight: 'bold' }}>Visualization Mode</span>
        </label>
      </div>

      {/* Bar selection UI and legend */}
      {viewMode === 'stats' && (
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
      )}

      {loading ? (
        <Loading message="Loading team data..." />
      ) : (
        <div style={{ marginTop: '2rem' }}>
          {safeSelectedTeams.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666' }}>
              Select teams to view auto path {viewMode === 'stats' ? 'statistics' : 'visualizations'}.
            </p>
          ) : Object.keys(chartData).length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666' }}>
              No auto path data found for selected teams.
            </p>
          ) : viewMode === 'stats' ? (
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
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
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
                                  {label}
                                </p>
                                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontStyle: 'italic' }}>
                                  Path: {data.autoPath || 'No data'}
                                </p>
                                {data.opponentLeft && (
                                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#ffa500' }}>
                                    Leave
                                  </p>
                                )}
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
          ) : (
            <div className="visualization-container">
              {Object.entries(chartData).map(([teamNum, teamMatches]) => {
                const currentIndex = currentPathIndex[teamNum] || 0
                const currentPath = teamMatches[currentIndex] || {}
                return (
                  <div key={teamNum} className="visualization-card" style={{
                    backgroundColor: '#222',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    border: '1px solid #4a4a4a',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                  }}>
                    <h2 
                      style={{ 
                        color: '#2563eb', 
                        margin: 0,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      onClick={() => handleTeamClick(teamNum)}
                    >
                      Team {teamNum}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '7px', marginBottom: '25px'}}>
                      <button
                        onClick={() => handlePrevPath(teamNum)}
                        disabled={teamMatches.length <= 1}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: teamMatches.length <= 1 ? '#555' : '#4CAF50',
                          color: '#e0e0e0',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: teamMatches.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ← Previous
                      </button>
                      <span style={{ 
                        fontWeight: 'bold',
                        minWidth: '120px',
                        textAlign: 'center',
                        color: '#e0e0e0'
                      }}>
                        {currentPath.match} ({currentIndex + 1} of {teamMatches.length})
                      </span>
                      <button
                        onClick={() => handleNextPath(teamNum)}
                        disabled={teamMatches.length <= 1}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: teamMatches.length <= 1 ? '#555' : '#4CAF50',
                          color: '#e0e0e0',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: teamMatches.length <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                    {/* Field visualization */}
                    <FieldVisualization
                      autoPath={currentPath.autoPath}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AutoPaths
