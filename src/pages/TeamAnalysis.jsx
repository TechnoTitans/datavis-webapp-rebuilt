import { useState, useEffect } from 'react'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'
import { useTeamData } from '../hooks/useTeamData'
import { useSelectedTeams } from '../hooks/useLocalStorage'
import MultiSelect from '../components/MultiSelect'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabaseClient'

const ALL_BAR_KEYS = [
  'L1 Climb',
  'L2 Climb',
  'L3 Climb',
  'Fuel Scored'
]

const BAR_COLORS = {
'L1 Climb': '#00D2FF',
'L2 Climb': '#4CAF50',
'L3 Climb': '#FF9800',
'Fuel Scored': '#E91E63',
}

const ORDERED_STATS = [
  { key: 'L1 Climb', swatchClass: 'chart-swatch-l1' },
  { key: 'L2 Climb', swatchClass: 'chart-swatch-l2' },
  { key: 'L3 Climb', swatchClass: 'chart-swatch-l3' },
  { key: 'Fuel Scored', swatchClass: 'chart-swatch-l4' },
]


function TeamAnalysis() {
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsAnalysis', [])
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []
  const { allTeams, matchRows, loading } = useTeamData(safeSelectedTeams)
  const [statboticsData, setStatboticsData] = useState([])
  const [statboticsLoading, setStatboticsLoading] = useState(false)

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
        'L1 Climb': match['L1 Climb Count'] || 0,
        'L2 Climb': match['L2 Climb Count'] || 0,
        'L3 Climb': match['L3 Climb Count'] || 0,
        'Fuel Scored': (() => {
          // Calculate Fuel Scored from Statbotics data: total_epa - endgame_epa
          // This represents the EPA contribution from autonomous and teleop periods
          const teamStatboticsData = statboticsData.find(s => String(s.team) === String(teamNum))
          if (teamStatboticsData && teamStatboticsData.total_epa && teamStatboticsData.endgame_epa) {
            const fuelScore = teamStatboticsData.total_epa - teamStatboticsData.endgame_epa
            return Math.max(0, fuelScore) // Ensure non-negative
          }
          return 0 // Fallback to 0 if no Statbotics data
        })(),
      })
    })

    Object.keys(chartData).forEach(teamNum => {
      chartData[teamNum].sort((a, b) => a.matchNumber - b.matchNumber)
    })
  }

  // Fetch Statbotics data for Fuel Scored calculation
  useEffect(() => {
    const fetchStatboticsData = async () => {
      if (!safeSelectedTeams || safeSelectedTeams.length === 0) {
        setStatboticsData([])
        return
      }

      setStatboticsLoading(true)

      // determine whether selected team identifiers are numeric
      const allNumeric = safeSelectedTeams.every(s => /^\d+$/.test(String(s)))
      const inValues = allNumeric ? safeSelectedTeams.map(Number) : safeSelectedTeams

      try {
        const { data, error: fetchErr } = await supabase
          .from('statbotics_data')
          .select('team, total_epa, endgame_epa')
          .in('team', inValues)

        if (fetchErr) {
          console.error('Error fetching Statbotics data:', fetchErr)
          setStatboticsData([])
          return
        }

        setStatboticsData(data || [])
      } catch (err) {
        console.error('Unexpected error fetching Statbotics data:', err)
        setStatboticsData([])
      } finally {
        setStatboticsLoading(false)
      }
    }

    fetchStatboticsData()
  }, [safeSelectedTeams])

  const getEndgameLabel = endgame => {
    if (endgame?.includes('L1') ) return 'L1'
    if (endgame?.includes('L2') ) return 'L2'
    if (endgame?.includes('L3')) return 'L3'
    if (endgame?.includes('Park')) return 'Park'
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

      {loading || statboticsLoading ? <Loading /> : null}

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
                      { value: 'L1 Climb', type: 'rect', color: '#00D2FF', id: 'L1 Climb' },
                      { value: 'L2 Climb', type: 'rect', color: '#4CAF50', id: 'L2 Climb' },
                      { value: 'L3 Climb', type: 'rect', color: '#FF9800', id: 'L3 Climb' },
                      { value: 'Fuel Scored', type: 'rect', color: '#E91E63', id: 'Fuel Scored' },
                    ]}
                    content={() => (
                      <div className="chart-legend">
                        <ul className="chart-legend-row">
                          {ORDERED_STATS.map(item => (
                            <li key={item.value || item.key} className="chart-legend-item">
                              <span className={`chart-swatch ${item.swatchClass}`}></span>
                              {item.value || item.key}
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
