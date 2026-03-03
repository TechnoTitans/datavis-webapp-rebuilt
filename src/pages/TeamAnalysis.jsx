import { useState } from 'react'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'
import { useTeamData } from '../hooks/useTeamData'
import { useSelectedTeams } from '../hooks/useLocalStorage'
import MultiSelect from '../components/MultiSelect'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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

function TeamAnalysis() {
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsAnalysis', [])
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []
  const { allTeams, matchRows, loading } = useTeamData(safeSelectedTeams)

  const chartData = {}
  if (matchRows) {
    matchRows.forEach((match, index) => {
      const scoutingIdParts = match['Scouting ID']?.split('_') || []
      const teamNum = scoutingIdParts[1] || 'Unknown'
      const matchNum = scoutingIdParts[2] || index + 1

      if (!chartData[teamNum]) {
        chartData[teamNum] = []
      }

      chartData[teamNum].push({
        match: `Match ${matchNum}`,
        team: teamNum,
        matchNumber: parseInt(matchNum) || index + 1,
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
        'Net Miss': match['Net Missed Count'] || 0,
      })
    })

    Object.keys(chartData).forEach(teamNum => {
      chartData[teamNum].sort((a, b) => a.matchNumber - b.matchNumber)
    })
  }

  const getEndgameLabel = endgame => {
    if (endgame?.includes('deep') && endgame?.includes('cage')) return 'Deep'
    if (endgame?.includes('shallow') && endgame?.includes('cage')) return 'Deep'
    if (endgame?.includes('park')) return 'Park'
    return 'None'
  }

  const [selectedBarKeys, setSelectedBarKeys] = useState(ALL_BAR_KEYS)

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

      <div className="multi-select-section">
        <MultiSelect
          options={ALL_BAR_KEYS}
          selected={selectedBarKeys}
          onChange={setSelectedBarKeys}
          label="Select Bars to Display"
          className="multi-select-panel"
        />
      </div>

      {loading ? <Loading /> : null}

      {safeSelectedTeams.length === 0 ? (
        <p>Select teams to view analysis.</p>
      ) : Object.keys(chartData).length === 0 ? (
        <p>No team data found for selected teams.</p>
      ) : (
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
                    formatter={(value, name) => {
                      if (value === 0) return null
                      return [value, name]
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const endgame = getEndgameLabel(payload[0].payload.endgame)
                        return `${label} (${endgame})`
                      }
                      return label
                    }}
                    content={({ active, payload, label }) => {
                      if (!(active && payload && payload.length)) return null

                      const data = payload[0].payload
                      const endgame = getEndgameLabel(data.endgame)

                      return (
                        <div className="chart-tooltip">
                          <p className="chart-tooltip-title">
                            {label} ({endgame})
                          </p>
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
      )}
    </div>
  )
}

export default TeamAnalysis
