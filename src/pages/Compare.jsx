import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeamSelector from '../components/TeamSelector'
import StatCharts from '../components/charts/StatCharts'
import { useTeamData } from '../hooks/useTeamData'
import { useSelectedTeams, useLocalStorage } from '../hooks/useLocalStorage'
import { useTeamSummary } from '../hooks/useTeamSummary'
import { FIELDS_TO_SHOW } from '../constants/scoring'

function Compare() {
  const navigate = useNavigate()

  // State management with custom hooks
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeams', [])
  const [selectedStat, setSelectedStat] = useLocalStorage('selectedStat', '', (v) => v, (v) => v) // string values
  const [useMaxValues, setUseMaxValues] = useLocalStorage('compareUseMax', false)
  const [statSearchTerm, setStatSearchTerm] = useState('')
  const [showStatGrid, setShowStatGrid] = useState(false)
  const [expandedCells, setExpandedCells] = useState(new Set())

  // Ensure selectedTeams is always an array
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []

  // Use team data hook
  const { allTeams, matchRows } = useTeamData(safeSelectedTeams, true) // useDataOnly = true

  // Use team summary hook
  const summary = useTeamSummary(matchRows, useMaxValues)

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

  const handleTeamClick = (teamNumber) => {
    localStorage.setItem('selectedTeamsAnalysis', JSON.stringify([String(teamNumber)]))
    navigate('/team-analysis')
  }

  const handleCellClick = (team, field) => {
    const cellId = `${team}-${field}`
    setExpandedCells(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cellId)) {
        newSet.delete(cellId)
      } else {
        newSet.add(cellId)
      }
      return newSet
    })
  }

  const filteredStats = FIELDS_TO_SHOW.filter(stat => 
    stat.toLowerCase().includes(statSearchTerm.toLowerCase())
  )

  return (
    <div className="compare-container">
      <h1>Compare Data</h1>

      <TeamSelector
        allTeams={allTeams || []}
        selectedTeams={safeSelectedTeams}
        onTeamToggle={handleTeamToggle}
        onClearAll={clearAllTeams}
        title="Select Teams to Compare"
      />

      <div className="compare-stat-selection">
        <div className={`stat-selection-header ${!showStatGrid ? 'stat-selection-header-only' : ''}`}>
          <h2>Select Stat for Charts</h2>
          <button 
            onClick={() => setShowStatGrid(!showStatGrid)}
            className="toggle-grid-btn"
          >
            {showStatGrid ? '▲ Hide Dropdown' : '▼ Show Dropdown'}
          </button>
        </div>

        {showStatGrid && (
          <>
            <div className="stat-selection-controls">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search stats..."
                  value={statSearchTerm}
                  onChange={(e) => setStatSearchTerm(e.target.value)}
                  className="stat-search-input"
                />
              </div>
            </div>

            <div className="stats-grid">
              {filteredStats.length === 0 ? (
                <p className="no-stats">No stats found</p>
              ) : (
                filteredStats.map(field => (
                  <label key={field} className={`stat-checkbox ${selectedStat === field ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="selectedStat"
                      checked={selectedStat === field}
                      onChange={() => setSelectedStat(field)}
                    />
                    <span className="stat-name">{field}</span>
                    <span className="checkmark">✓</span>
                  </label>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="compare-charts-section">
        <h2 className="compare-charts-title">Charts for {selectedStat}</h2>
        {(() => {
          if (!matchRows || matchRows.length === 0) return <p>No data for chart.</p>;
          if (!selectedStat) return <p>Select a stat to view charts.</p>;
          
          const firstTeamSummary = Object.values(summary)[0];
          const selectedSummary = firstTeamSummary && firstTeamSummary[selectedStat];
          
          if (!selectedSummary || selectedSummary.type !== 'scoring') {
            return <p>Charts only available for scoring-type fields.</p>;
          }
          
          return (
            <StatCharts 
              matchRows={matchRows}
              selectedTeams={safeSelectedTeams}
              selectedStat={selectedStat}
            />
          );
        })()}
      </div>

      <div className="compare-summary-section">
        <div className="compare-summary-header">
          <h2 className="compare-summary-title">Summaries</h2>
          <label className="toggle-container">
            <input
              type="checkbox"
              checked={useMaxValues}
              onChange={(e) => setUseMaxValues(e.target.checked)}
            />
            <span className="toggle-text">Show Max Values (instead of Average)</span>
          </label>
        </div>
        {Object.keys(summary).length === 0 ? (
          <p>No data to summarize.</p>
        ) : (
          <div className="summary-container" data-count={safeSelectedTeams.length}>
            {safeSelectedTeams.map(team => (
              summary[team] ? (
                <div key={team} className="summary-table">
                  <h3 
                    className="team-header-clickable" 
                    onClick={() => handleTeamClick(team)}
                  >
                    Team {team}
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>{useMaxValues ? 'Max' : 'Avg'} Attempts</th>
                        <th>Success %</th>
                        <th>{useMaxValues ? 'Max' : 'Avg'} Made</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIELDS_TO_SHOW.map(field =>
                        summary[team][field] ? (
                          <tr key={field}>
                            <td 
                              className={expandedCells.has(`${team}-${field}`) ? 'expanded' : ''}
                              onClick={() => handleCellClick(team, field)}
                            >
                              {field}
                            </td>
                            {summary[team][field].type === 'scoring' ? (
                              <>
                                <td 
                                  className={expandedCells.has(`${team}-${field}-attempts`) ? 'expanded' : ''}
                                  onClick={() => handleCellClick(team, `${field}-attempts`)}
                                >
                                  {summary[team][field].avgAttempts?.toFixed(2)}
                                </td>
                                <td 
                                  className={expandedCells.has(`${team}-${field}-success`) ? 'expanded' : ''}
                                  onClick={() => handleCellClick(team, `${field}-success`)}
                                >
                                  {summary[team][field].successRate}%
                                </td>
                                <td 
                                  className={expandedCells.has(`${team}-${field}-average`) ? 'expanded' : ''}
                                  onClick={() => handleCellClick(team, `${field}-average`)}
                                >
                                  {summary[team][field].average}
                                </td>
                              </>
                            ) : (
                              <td 
                                colSpan={3}
                                className={expandedCells.has(`${team}-${field}-value`) ? 'expanded' : ''}
                                onClick={() => handleCellClick(team, `${field}-value`)}
                              >
                                {summary[team][field].type === 'number'
                                  ? `Average: ${summary[team][field].value}`
                                  : `${summary[team][field].value} (${summary[team][field].percent}%)`}
                              </td>
                            )}
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Compare
