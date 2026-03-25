import { useMemo, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useTeamData } from '../hooks/useTeamData'
import { useSelectedTeams } from '../hooks/useLocalStorage'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'

// Columns to never show in the table (internal/meta fields)
const HIDDEN_COLUMNS = new Set([
  '_sourceType',
  '_sourceTable',
  '_sourceLabel',
  '_scouterName',
])

// These columns are always shown first, in this order, if present
const PRIORITY_COLUMNS = [
  'team',
  'team_number',
  'match_number',
  'match',
  'event_key',
  'auto_points',
  'teleop_points',
  'endgame_points',
  'total_points',
  'epa_sum',
]

const formatCellValue = (value) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '—'
  const str = String(value).trim()
  return str.length ? str : '—'
}

const formatColumnHeader = (col) =>
  col
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())

// Derive the team number from a tba_data row (handles team_number, team, etc.)
const getTeamFromRow = (row) => {
  const raw = row?.team_number ?? row?.team ?? null
  if (raw === null || raw === undefined) return null
  const num = Number(raw)
  if (Number.isFinite(num) && num > 0) return String(Math.trunc(num))
  const str = String(raw).trim()
  const digits = str.match(/\d+/)
  return digits ? digits[0] : null
}

function TbaData() {
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsTbaData', [])
  const { allTeams } = useTeamData(selectedTeams, false)
  const [tbaRows, setTbaRows] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(false)
  const [matchFilter, setMatchFilter] = useState('')

  const handleTeamToggle = (teamNumber) => {
    const teamStr = String(teamNumber)
    setSelectedTeams(prev => {
      if (prev.includes(teamStr)) return prev.filter(t => t !== teamStr)
      return [...prev, teamStr]
    })
  }

  const clearAllTeams = () => setSelectedTeams([])

  const getTeamDisplayText = () => {
    if (selectedTeams.length === 0) return 'No Teams'
    if (selectedTeams.length === 1) return `Team ${selectedTeams[0]}`
    return `${selectedTeams.length} Teams`
  }

  // Fetch all tba_data rows once on mount
  useEffect(() => {
    const fetchTbaData = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('tba_data').select('*')
        if (error) {
          console.error('Error fetching tba_data:', error)
          setTbaRows([])
          setColumns([])
          return
        }

        const rows = data || []
        setTbaRows(rows)

        // Derive columns dynamically from the first batch of rows
        if (rows.length > 0) {
          const allKeys = new Set()
          rows.slice(0, 20).forEach(row => Object.keys(row).forEach(k => allKeys.add(k)))
          const visible = [...allKeys].filter(k => !HIDDEN_COLUMNS.has(k))
          const priority = PRIORITY_COLUMNS.filter(k => visible.includes(k))
          const rest = visible
            .filter(k => !PRIORITY_COLUMNS.includes(k))
            .sort((a, b) => a.localeCompare(b))
          setColumns([...priority, ...rest])
        }
      } catch (err) {
        console.error('Error fetching tba_data:', err)
        setTbaRows([])
        setColumns([])
      } finally {
        setLoading(false)
      }
    }

    fetchTbaData()
  }, [])

  const filteredRows = useMemo(() => {
    if (!selectedTeams || selectedTeams.length === 0) return []

    const matchTerm = String(matchFilter || '').trim().toLowerCase()

    return tbaRows.filter(row => {
      const team = getTeamFromRow(row)
      if (!team) return false

      const matchesTeam = selectedTeams.includes(team)
      if (!matchesTeam) return false

      if (matchTerm.length === 0) return true
      const rowMatch = String(row.match_number ?? row.match ?? '').toLowerCase()
      return rowMatch.includes(matchTerm)
    })
  }, [selectedTeams, matchFilter, tbaRows])

  return (
    <div>
      <h1>TBA Data</h1>

      <TeamSelector
        allTeams={allTeams}
        selectedTeams={selectedTeams}
        onTeamToggle={handleTeamToggle}
        onClearAll={clearAllTeams}
        title="Select Teams to View"
      />

      <div className="team-data-section">
        <div className="team-data-header">
          <h2>TBA Data for {getTeamDisplayText()}</h2>
          <div className="filter-row">
            <label className="filter-label">
              Filter match:
              <input
                value={matchFilter}
                onChange={e => setMatchFilter(e.target.value)}
                placeholder="Match name/number"
                className="filter-input"
              />
            </label>
          </div>
        </div>

        {loading ? (
          <Loading message="Loading TBA data..." />
        ) : selectedTeams.length === 0 ? (
          <p>Select one or more teams to view their TBA records.</p>
        ) : filteredRows.length === 0 ? (
          <p>No TBA data found for the selected teams.</p>
        ) : (
          <div className="team-data-container">
            {selectedTeams.map(team => {
              const teamRows = filteredRows.filter(row => getTeamFromRow(row) === team)
              if (teamRows.length === 0) return null

              return (
                <div key={team} className="team-data-table-section">
                  <h3 className="team-header">Team {team}</h3>
                  <div className="team-data-table-container">
                    {/* Always-visible horizontal scrollbar */}
                    <div className="table-wrapper tba-data-scroll">
                      <table className="qual-data-table tba-data-table">
                        <thead>
                          <tr>
                            {columns.map(col => (
                              <th
                                key={col}
                                className={col === (columns[0]) ? 'sticky-column' : ''}
                                title={col}
                              >
                                {formatColumnHeader(col)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamRows.map((row, idx) => {
                            const rowKey = row.id ?? `${team}-${idx}`
                            return (
                              <tr key={rowKey}>
                                {columns.map(col => (
                                  <td
                                    key={col}
                                    className={col === columns[0] ? 'sticky-column' : ''}
                                  >
                                    {formatCellValue(row[col])}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="tba-data-row-count">
                    {teamRows.length} match{teamRows.length !== 1 ? 'es' : ''} · {columns.length} column{columns.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default TbaData