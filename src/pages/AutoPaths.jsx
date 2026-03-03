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

const ALL_BAR_KEYS = [
  'Processor',
  'Net',
  'L1',
  'L2',
  'L3',
  'L4',
  'Processor Miss',
  'Net Miss',
  'L1 Miss',
  'L2 Miss',
  'L3 Miss',
  'L4 Miss',
]

const BAR_COLORS = {
  Processor: '#FF6B35',
  Net: '#00D2FF',
  L1: '#4CAF50',
  L2: '#FFC107',
  L3: '#FF9800',
  L4: '#E91E63',
  'Processor Miss': '#FFD4C4',
  'Net Miss': '#B3F4FF',
  'L1 Miss': '#C8E6C9',
  'L2 Miss': '#FFF3C4',
  'L3 Miss': '#FFE0B2',
  'L4 Miss': '#F8BBD9',
}

const ORDERED_STATS = [
  { key: 'Net', swatchClass: 'chart-swatch-net' },
  { key: 'Processor', swatchClass: 'chart-swatch-processor' },
  { key: 'L4', swatchClass: 'chart-swatch-l4' },
  { key: 'L3', swatchClass: 'chart-swatch-l3' },
  { key: 'L2', swatchClass: 'chart-swatch-l2' },
  { key: 'L1', swatchClass: 'chart-swatch-l1' },
  { key: 'Net Miss', swatchClass: 'chart-swatch-net-miss' },
  { key: 'Processor Miss', swatchClass: 'chart-swatch-processor-miss' },
  { key: 'L4 Miss', swatchClass: 'chart-swatch-l4-miss' },
  { key: 'L3 Miss', swatchClass: 'chart-swatch-l3-miss' },
  { key: 'L2 Miss', swatchClass: 'chart-swatch-l2-miss' },
  { key: 'L1 Miss', swatchClass: 'chart-swatch-l1-miss' },
]

const MADE_ITEMS = [
  { value: 'Processor', swatchClass: 'chart-swatch-processor' },
  { value: 'Net', swatchClass: 'chart-swatch-net' },
  { value: 'L1', swatchClass: 'chart-swatch-l1' },
  { value: 'L2', swatchClass: 'chart-swatch-l2' },
  { value: 'L3', swatchClass: 'chart-swatch-l3' },
  { value: 'L4', swatchClass: 'chart-swatch-l4' },
]

const MISSED_ITEMS = [
  { value: 'Processor Miss', swatchClass: 'chart-swatch-processor-miss' },
  { value: 'Net Miss', swatchClass: 'chart-swatch-net-miss' },
  { value: 'L1 Miss', swatchClass: 'chart-swatch-l1-miss' },
  { value: 'L2 Miss', swatchClass: 'chart-swatch-l2-miss' },
  { value: 'L3 Miss', swatchClass: 'chart-swatch-l3-miss' },
  { value: 'L4 Miss', swatchClass: 'chart-swatch-l4-miss' },
]

function AutoPaths() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('stats')
  const [currentPathIndex, setCurrentPathIndex] = useState({})
  const [selectedBarKeys, setSelectedBarKeys] = useState(ALL_BAR_KEYS)

  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsAutoPaths', [])
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []
  const { allTeams, matchRows, loading } = useTeamData(safeSelectedTeams, true)

  const chartData = {}
  if (matchRows) {
    matchRows.forEach((match, index) => {
      const scoutingIdParts = match['Scouting ID']?.split('_') || []
      const teamNum = scoutingIdParts[1] || 'Unknown'
      const matchNum = scoutingIdParts[2] || index + 1
      if (!chartData[teamNum]) chartData[teamNum] = []
      const autoPath = match['Auto Path'] || ''
      const parsedAutoData = parseAutoPath(autoPath)
      chartData[teamNum].push({
        match: `Match ${matchNum}`,
        team: teamNum,
        matchNumber: parseInt(matchNum) || index + 1,
        autoPath,
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
        position: parsedAutoData.position,
      })
    })

    Object.keys(chartData).forEach(teamNum => {
      chartData[teamNum].sort((a, b) => a.matchNumber - b.matchNumber)
      if (!(teamNum in currentPathIndex)) {
        setCurrentPathIndex(prev => ({ ...prev, [teamNum]: 0 }))
      }
    })
  }

  const handleTeamToggle = teamNumber => {
    const teamStr = String(teamNumber)
    setSelectedTeams(prev => {
      const prevArray = Array.isArray(prev) ? prev : []
      if (prevArray.includes(teamStr)) {
        return prevArray.filter(t => t !== teamStr)
      }
      return [...prevArray, teamStr]
    })
  }

  const clearAllTeams = () => {
    setSelectedTeams([])
    setCurrentPathIndex({})
  }

  const handleTeamClick = teamNumber => {
    localStorage.setItem('selectedTeamsAnalysis', JSON.stringify([String(teamNumber)]))
    navigate('/team-analysis')
  }

  const handleNextPath = teamNum => {
    setCurrentPathIndex(prev => {
      const teamPaths = chartData[teamNum] || []
      const currentIndex = prev[teamNum] || 0
      const nextIndex = currentIndex + 1 < teamPaths.length ? currentIndex + 1 : 0
      return { ...prev, [teamNum]: nextIndex }
    })
  }

  const handlePrevPath = teamNum => {
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

      <div className="auto-view-mode">
        <label className="auto-view-option">
          <input
            type="radio"
            name="viewMode"
            value="stats"
            checked={viewMode === 'stats'}
            onChange={e => setViewMode(e.target.value)}
          />
          <span className="auto-view-label">Stats Mode</span>
        </label>
        <label className="auto-view-option">
          <input
            type="radio"
            name="viewMode"
            value="visualization"
            checked={viewMode === 'visualization'}
            onChange={e => setViewMode(e.target.value)}
          />
          <span className="auto-view-label">Visualization Mode</span>
        </label>
      </div>

      {viewMode === 'stats' ? (
        <div className="multi-select-section">
          <MultiSelect
            options={ALL_BAR_KEYS}
            selected={selectedBarKeys}
            onChange={setSelectedBarKeys}
            label="Select Bars to Display"
            className="multi-select-panel"
          />
        </div>
      ) : null}

      {loading ? (
        <Loading message="Loading team data..." />
      ) : (
        <div className="auto-content-section">
          {safeSelectedTeams.length === 0 ? (
            <p className="empty-state-message">
              Select teams to view auto path {viewMode === 'stats' ? 'statistics' : 'visualizations'}.
            </p>
          ) : Object.keys(chartData).length === 0 ? (
            <p className="empty-state-message">No auto path data found for selected teams.</p>
          ) : viewMode === 'stats' ? (
            <div className="charts-container">
              {Object.entries(chartData).map(([teamNum, teamMatches]) => (
                <div key={teamNum} className="chart-container">
                  <h3 className="chart-team-title">Team {teamNum}</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart
                      data={teamMatches}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 80,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="match"
                        stroke="#cbd5e1"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#cbd5e1" allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!(active && payload && payload.length)) return null

                          const data = payload[0].payload
                          return (
                            <div className="chart-tooltip">
                              <p className="chart-tooltip-title">{label}</p>
                              <p className="chart-tooltip-subtitle">Path: {data.autoPath || 'No data'}</p>
                              {data.opponentLeft ? <p className="chart-tooltip-alert">Leave</p> : null}
                              {ORDERED_STATS.map(stat => {
                                const value = data[stat.key]
                                if (value > 0) {
                                  return (
                                    <div key={stat.key} className="chart-tooltip-row">
                                      <span className={`chart-swatch ${stat.swatchClass}`}></span>
                                      <span>{stat.key}: {value}</span>
                                    </div>
                                  )
                                }
                                return null
                              })}
                            </div>
                          )
                        }}
                      />
                      <Legend
                        payload={[
                          { value: 'Processor', type: 'rect', color: '#FF6B35', id: 'Processor' },
                          { value: 'Net', type: 'rect', color: '#00D2FF', id: 'Net' },
                          { value: 'L1', type: 'rect', color: '#4CAF50', id: 'L1' },
                          { value: 'L2', type: 'rect', color: '#FFC107', id: 'L2' },
                          { value: 'L3', type: 'rect', color: '#FF9800', id: 'L3' },
                          { value: 'L4', type: 'rect', color: '#E91E63', id: 'L4' },
                          { value: 'Processor Miss', type: 'rect', color: '#FFD4C4', id: 'Processor Miss' },
                          { value: 'Net Miss', type: 'rect', color: '#B3F4FF', id: 'Net Miss' },
                          { value: 'L1 Miss', type: 'rect', color: '#C8E6C9', id: 'L1 Miss' },
                          { value: 'L2 Miss', type: 'rect', color: '#FFF3C4', id: 'L2 Miss' },
                          { value: 'L3 Miss', type: 'rect', color: '#FFE0B2', id: 'L3 Miss' },
                          { value: 'L4 Miss', type: 'rect', color: '#F8BBD9', id: 'L4 Miss' },
                        ]}
                        content={() => (
                          <div className="chart-legend">
                            <ul className="chart-legend-row">
                              {MADE_ITEMS.map(item => (
                                <li key={item.value} className="chart-legend-item">
                                  <span className={`chart-swatch ${item.swatchClass}`}></span>
                                  {item.value}
                                </li>
                              ))}
                            </ul>

                            <ul className="chart-legend-row">
                              {MISSED_ITEMS.map(item => (
                                <li key={item.value} className="chart-legend-item">
                                  <span className={`chart-swatch ${item.swatchClass}`}></span>
                                  {item.value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      />
                      {selectedBarKeys.map(key => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="scoring"
                          fill={BAR_COLORS[key] || '#888'}
                          stroke={key.includes('Miss') ? '#000' : undefined}
                          strokeWidth={key.includes('Miss') ? 2 : undefined}
                          strokeDasharray={key.includes('Miss') ? '6 6' : undefined}
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
                  <div key={teamNum} className="visualization-card">
                    <h2 className="visualization-card-title" onClick={() => handleTeamClick(teamNum)}>
                      Team {teamNum}
                    </h2>
                    <div className="visualization-nav">
                      <button
                        onClick={() => handlePrevPath(teamNum)}
                        disabled={teamMatches.length <= 1}
                        className="visualization-nav-btn"
                      >
                        ← Previous
                      </button>
                      <span className="visualization-nav-status">
                        {currentPath.match} ({currentIndex + 1} of {teamMatches.length})
                      </span>
                      <button
                        onClick={() => handleNextPath(teamNum)}
                        disabled={teamMatches.length <= 1}
                        className="visualization-nav-btn"
                      >
                        Next →
                      </button>
                    </div>
                    <FieldVisualization autoPath={currentPath.autoPath} />
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
