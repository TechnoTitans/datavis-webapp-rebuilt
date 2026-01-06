import { useState } from 'react'
import PropTypes from 'prop-types'

/**
 * Reusable team selection component
 * @param {Object} props - Component props
 * @param {number[]} props.allTeams - Array of all available team numbers
 * @param {string[]} props.selectedTeams - Array of selected team numbers as strings
 * @param {Function} props.onTeamToggle - Function to handle team selection toggle
 * @param {Function} props.onClearAll - Function to clear all selected teams
 * @param {string} props.title - Title for the selection section
 * @param {boolean} props.showByDefault - Whether to show the grid by default
 * @returns {JSX.Element} - Team selector component
 */
const TeamSelector = ({
  allTeams,
  selectedTeams,
  onTeamToggle,
  onClearAll,
  title = "Select Teams",
  showByDefault = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showTeamGrid, setShowTeamGrid] = useState(showByDefault)

  // Ensure we have valid arrays
  const safeAllTeams = Array.isArray(allTeams) ? allTeams : []
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []

  const filteredTeams = safeAllTeams.filter(team => 
    String(team).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="compare-team-selection">
      <div className={`team-selection-header ${!showTeamGrid ? 'team-selection-header-only' : ''}`}>
        <h2>{title}</h2>
        <button 
          onClick={() => setShowTeamGrid(!showTeamGrid)}
          className="toggle-grid-btn"
        >
          {showTeamGrid ? '▲ Hide Teams' : '▼ Show Teams'} ({safeSelectedTeams.length} selected)
        </button>
      </div>

      {showTeamGrid && (
        <>
          <div className="team-selection-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="team-search-input"
              />
            </div>
            
            <div className="selection-actions">
              <button onClick={onClearAll} className="action-btn clear-all">
                Clear All
              </button>
              <span className="selected-count">
                {safeSelectedTeams.length} teams selected
              </span>
            </div>
          </div>

          <div className="teams-grid">
            {filteredTeams.length === 0 ? (
              <p className="no-teams">No teams found</p>
            ) : (
              filteredTeams.map(team => (
                <label key={team} className={`team-checkbox ${safeSelectedTeams.includes(String(team)) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={safeSelectedTeams.includes(String(team))}
                    onChange={() => onTeamToggle(team)}
                  />
                  <span className="team-number">Team {team}</span>
                  <span className="checkmark">✓</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

TeamSelector.propTypes = {
  allTeams: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedTeams: PropTypes.arrayOf(PropTypes.string).isRequired,
  onTeamToggle: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  title: PropTypes.string,
  showByDefault: PropTypes.bool
}

export default TeamSelector
