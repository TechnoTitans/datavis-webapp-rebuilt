import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeamSelector from '../components/TeamSelector'
import StatCharts from '../components/charts/StatCharts'
import Loading from '../components/Loading'
import { useSelectedTeams, useLocalStorage } from '../hooks/useLocalStorage'
import { useTeamSummary } from '../hooks/useTeamSummary'
import { useCompareData } from '../hooks/useCompareData'
import { supabaseConfigured } from '../supabaseClient'

const SOURCE_OPTIONS = [
  { value: 'combined', label: 'Combined (Scouter + TBA)' },
  { value: 'scouter', label: 'Scouter Only' },
  { value: 'tba', label: 'TBA Only' },
]

const COMPARE_STAT_FIELDS = [
  'Pin',
  'Ram',
  'Block',
  'Steal',
  'Anti Pin',
  'Anti Ram',
  'Anti Block',
  'Anti Steal',
  'Penalties',
  'Bump',
  'Trench',
  'Broke Down',
]

const PRIMARY_ACTION_FIELDS = [
  'Pin',
  'Ram',
  'Block',
  'Steal',
  'Anti Pin',
  'Anti Ram',
  'Anti Block',
  'Anti Steal',
]

const EXTRA_ACTION_FIELDS = ['Penalties', 'Bump', 'Trench', 'Broke Down']

const getSummaryMetric = (teamSummary, fieldName) => {
  return teamSummary?.[fieldName] || null
}

const getSummaryNumericValue = (teamSummary, fieldName) => {
  const metric = teamSummary?.[fieldName]
  if (!metric) return null

  if (metric.type === 'scoring') {
    const parsed = Number(metric.average)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (metric.type === 'number') {
    const parsed = Number(metric.value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const formatMetricSummary = (metric) => {
  if (!metric) return '—'

  if (metric.type === 'scoring') {
    const attempts = Number(metric.avgAttempts)
    const made = Number(metric.average)
    const attemptsLabel = Number.isFinite(attempts) ? attempts.toFixed(2) : String(metric.avgAttempts)
    const madeLabel = Number.isFinite(made) ? made.toFixed(2) : String(metric.average)
    return `Attempts: ${attemptsLabel} | Success: ${metric.successRate}% | Made: ${madeLabel}`
  }

  if (metric.type === 'number') {
    const value = Number(metric.value)
    return Number.isFinite(value) ? value.toFixed(2) : String(metric.value)
  }

  return `${metric.value} (${metric.percent}%)`
}

function Compare() {
  const navigate = useNavigate()

  // State management with custom hooks
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeams', [])
  const [selectedStat, setSelectedStat] = useLocalStorage('selectedStat', '', (v) => v, (v) => v) // string values
  const [useMaxValues, setUseMaxValues] = useLocalStorage('compareUseMax', false)
  const [sourceMode, setSourceMode] = useLocalStorage(
    'compareSourceMode',
    'combined',
    (v) => String(v || 'combined'),
    (v) => v,
  )
  const [useDataOnly, setUseDataOnly] = useLocalStorage('compareUseDataOnly', true)
  const [selectedScouters, setSelectedScouters] = useLocalStorage('compareSelectedScouters', [])
  const [statSearchTerm, setStatSearchTerm] = useState('')
  const [showStatGrid, setShowStatGrid] = useState(false)
  const [expandedCells, setExpandedCells] = useState(new Set())

  // Ensure selectedTeams/scouters are always arrays
  const safeSelectedTeams = useMemo(
    () => (Array.isArray(selectedTeams) ? selectedTeams : []),
    [selectedTeams],
  )
  const safeSelectedScouters = useMemo(
    () => (Array.isArray(selectedScouters) ? selectedScouters : []),
    [selectedScouters],
  )

  // Use compare data hook with source selection
  const {
    allTeams,
    matchRows,
    scouterNames,
    loading,
    error,
    officialTableUsed,
    diagnostics,
  } = useCompareData({
    selectedTeams: safeSelectedTeams,
    sourceMode,
    useDataOnly,
    selectedScouters: safeSelectedScouters,
  })

  // Use team summary hook
  const summary = useTeamSummary(matchRows, useMaxValues)

  const availableFields = useMemo(() => {
    return COMPARE_STAT_FIELDS
  }, [])

  useEffect(() => {
    if (!availableFields.length) {
      if (selectedStat) setSelectedStat('')
      return
    }

    if (!selectedStat || !availableFields.includes(selectedStat)) {
      setSelectedStat(availableFields[0])
    }
  }, [availableFields, selectedStat, setSelectedStat])

  const handleScouterToggle = (scouterName) => {
    const normalized = String(scouterName)
    setSelectedScouters((prev) => {
      const prevArray = Array.isArray(prev) ? prev : []
      if (prevArray.includes(normalized)) {
        return prevArray.filter((name) => name !== normalized)
      }
      return [...prevArray, normalized]
    })
  }

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

  const resetCompareFilters = () => {
    setSourceMode('combined')
    setUseDataOnly(false)
    setSelectedScouters([])
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

  const filteredStats = availableFields.filter(stat =>
    stat.toLowerCase().includes(statSearchTerm.toLowerCase())
  )

  const capabilityCards = useMemo(() => {
    return safeSelectedTeams
      .map((team) => {
        const teamSummary = summary[team]
        if (!teamSummary) return null

        const actions = PRIMARY_ACTION_FIELDS.map((field) => {
          const metric = getSummaryMetric(teamSummary, field)
          const numericValue = getSummaryNumericValue(teamSummary, field)
          return { field, metric, numericValue }
        })

        const activeActions = actions.filter(
          (action) => action.numericValue !== null && action.numericValue > 0,
        )
        const extras = EXTRA_ACTION_FIELDS.map((field) => ({
          field,
          metric: getSummaryMetric(teamSummary, field),
        }))

        return {
          team,
          actions,
          activeActions,
          extras,
        }
      })
      .filter(Boolean)
  }, [safeSelectedTeams, summary])

  const noDataDiagnostic = useMemo(() => {
    if (loading || error) return null

    const reasons = []
    const actions = []

    if (!supabaseConfigured) {
      reasons.push('Supabase is not configured in this running app.')
      actions.push('Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` in `.env` and restart `npm run dev`.')
    }

    if (safeSelectedTeams.length === 0) {
      reasons.push('No teams selected yet.')
      actions.push('Pick at least one team in "Select Teams to Compare".')
    }

    if (allTeams.length === 0) {
      if (sourceMode !== 'tba' && useDataOnly && diagnostics.scouterRawRows > 0 && diagnostics.scouterRowsAfterUseData === 0) {
        reasons.push('Scouting rows exist, but all were filtered out by `Use Data = true`.')
        actions.push('Uncheck "Only include rows where Use Data is true" to see teams immediately.')
        actions.push('Or set `Use Data` to true for rows in Team Data / Settings.')
      } else if (sourceMode === 'tba') {
        reasons.push('No official rows found for TBA source.')
        actions.push('Load data into `tba_data`, `tba_matches`, or `statbotics_matches`.')
      } else if (sourceMode === 'scouter') {
        reasons.push('No scouter rows found for scouting source.')
        actions.push('Check that `match_data` has rows and that RLS/select permissions allow reads.')
      } else {
        reasons.push('No rows found in either scouter or TBA sources.')
        actions.push('Load scouting data and/or TBA data, then refresh Compare.')
      }
    }

    if (safeSelectedTeams.length > 0 && matchRows.length === 0) {
      reasons.push('Selected teams have no rows after current filters are applied.')
      actions.push('Try "Clear All" teams and re-select teams that exist in this source.')
      if (sourceMode !== 'tba' && useDataOnly) {
        actions.push('Temporarily uncheck "Only include rows where Use Data is true".')
      }
      if (sourceMode !== 'tba' && safeSelectedScouters.length > 0) {
        actions.push('Clear scouter filter chips to include all scouters.')
      }
    }

    if (diagnostics.totalRowsBeforeTeamFilter > 0 && matchRows.length === 0 && safeSelectedTeams.length === 0) {
      reasons.push('Rows exist, but current scouter filter chips exclude them.')
      actions.push('Clear scouter filter chips.')
    }

    if (sourceMode === 'tba' && !officialTableUsed) {
      reasons.push('No TBA table was detected in this project connection.')
      actions.push('Create one of: `tba_data`, `tba_matches`, or `statbotics_matches`.')
    }

    if (reasons.length === 0 && actions.length === 0) return null

    return {
      reasons: Array.from(new Set(reasons)),
      actions: Array.from(new Set(actions)),
    }
  }, [
    allTeams.length,
    diagnostics.scouterRawRows,
    diagnostics.scouterRowsAfterUseData,
    diagnostics.totalRowsBeforeTeamFilter,
    error,
    loading,
    matchRows.length,
    officialTableUsed,
    safeSelectedScouters.length,
    safeSelectedTeams.length,
    sourceMode,
    useDataOnly,
  ])

  return (
    <div className="compare-container">
      <h1>Compare Data</h1>

      <div className="compare-data-source-panel compare-stat-selection">
        <div className="compare-data-source-row">
          <label htmlFor="compare-source-mode" className="compare-control-label">
            Data Source
          </label>
          <select
            id="compare-source-mode"
            className="compare-source-select"
            value={sourceMode}
            onChange={(e) => setSourceMode(e.target.value)}
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="compare-data-source-meta">
          <span>Rows loaded: {matchRows.length}</span>
          <span>Supabase: {supabaseConfigured ? 'Configured' : 'Missing env'}</span>
          {officialTableUsed ? <span>Official table: {officialTableUsed}</span> : null}
        </div>

        {sourceMode !== 'tba' ? (
          <label className="compare-checkbox-inline">
            <input
              type="checkbox"
              checked={!!useDataOnly}
              onChange={(e) => setUseDataOnly(e.target.checked)}
            />
            <span>Only include rows where `Use Data` is true</span>
          </label>
        ) : null}

        {sourceMode !== 'tba' && scouterNames.length > 0 ? (
          <div className="compare-scouter-filter">
            <div className="compare-scouter-filter-header">
              <span className="compare-control-label">Scouter Filter</span>
              <button
                className="action-btn clear-all"
                onClick={() => setSelectedScouters([])}
                type="button"
              >
                Clear
              </button>
            </div>
            <div className="compare-scouter-grid">
              {scouterNames.map((name) => {
                const checked = safeSelectedScouters.includes(name)
                return (
                  <label key={name} className={`compare-scouter-chip ${checked ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleScouterToggle(name)}
                    />
                    <span>{name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <TeamSelector
        allTeams={allTeams || []}
        selectedTeams={safeSelectedTeams}
        onTeamToggle={handleTeamToggle}
        onClearAll={clearAllTeams}
        title="Select Teams to Compare"
      />

      {noDataDiagnostic ? (
      <div className="compare-empty-state-panel">
          <div className="compare-empty-state-header">
            <h2 className="compare-empty-state-title">Why Data Might Be Missing</h2>
            <button type="button" className="action-btn clear-all" onClick={resetCompareFilters}>
              Reset Compare Filters
            </button>
          </div>
          <ul className="compare-empty-list">
            {noDataDiagnostic.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <ul className="compare-empty-list compare-empty-list-actions">
            {noDataDiagnostic.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}

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
          if (loading) return <Loading message="Loading compare data..." />
          if (error) return <p>Failed to load compare data: {error}</p>
          if (!matchRows || matchRows.length === 0) {
            return <p>{noDataDiagnostic?.reasons?.[0] || 'No data for chart.'}</p>
          }
          if (!selectedStat) return <p>Select a stat to view charts.</p>;

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
          <h2 className="compare-summary-title">Action Snapshot</h2>
          <span className="toggle-text">
            Values shown as {useMaxValues ? 'max per match' : 'average per match'}
          </span>
        </div>

        {capabilityCards.length === 0 ? (
          <p>{noDataDiagnostic?.reasons?.[0] || 'No capability data to show.'}</p>
        ) : (
          <div className="compare-capability-grid">
            {capabilityCards.map((card) => (
              <div key={`capability-${card.team}`} className="compare-capability-card">
                <h3
                  className="team-header-clickable"
                  onClick={() => handleTeamClick(card.team)}
                >
                  Team {card.team}
                </h3>

                <div className="compare-capability-row">
                  <span className="compare-capability-label">Top Actions</span>
                  <span className="compare-capability-value">
                    {card.activeActions.length
                      ? card.activeActions.map((action) => action.field).join(', ')
                      : 'No action data'}
                  </span>
                </div>

                <div className="compare-zone-chips">
                  {card.actions.map((action) => (
                    <span
                      key={`${card.team}-${action.field}`}
                      className={`compare-zone-chip ${action.numericValue && action.numericValue > 0 ? 'active' : ''}`}
                    >
                      {action.field}: {formatMetricSummary(action.metric)}
                    </span>
                  ))}
                </div>

                <div className="compare-ratings-grid">
                  {card.extras.map((extra) => (
                    <div key={`${card.team}-${extra.field}`} className="compare-rating-item">
                      <span className="compare-capability-label">{extra.field}</span>
                      <span className="compare-capability-value">
                        {formatMetricSummary(extra.metric)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
          <p>{noDataDiagnostic?.reasons?.[0] || 'No data to summarize.'}</p>
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
                        <th>Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableFields.map(field =>
                        summary[team][field] ? (
                          <tr key={field}>
                            <td 
                              className={expandedCells.has(`${team}-${field}`) ? 'expanded' : ''}
                              onClick={() => handleCellClick(team, field)}
                            >
                              {field}
                            </td>
                            <td
                              className={expandedCells.has(`${team}-${field}-value`) ? 'expanded' : ''}
                              onClick={() => handleCellClick(team, `${field}-value`)}
                            >
                              {formatMetricSummary(summary[team][field])}
                            </td>
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
