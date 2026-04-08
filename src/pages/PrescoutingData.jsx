import { useMemo, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSelectedTeams } from '../hooks/useLocalStorage'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'

function PrescoutingData() {
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsPrescoutingData', [])
  const [allTeams, setAllTeams] = useState([])
  const [prescoutingRows, setPrescoutingRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [matchFilter, setMatchFilter] = useState('')

  const handleTeamToggle = (teamNumber) => {
    const teamStr = String(teamNumber)
    setSelectedTeams(prev => {
      if (prev.includes(teamStr)) {
        return prev.filter(t => t !== teamStr)
      } else {
        return [...prev, teamStr]
      }
    })
  }

  const clearAllTeams = () => {
    setSelectedTeams([])
  }

  const getTeamDisplayText = () => {
    if (selectedTeams.length === 0) return 'No Teams'
    if (selectedTeams.length === 1) return `Team ${selectedTeams[0]}`
    return `${selectedTeams.length} Teams`
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('prescouting_data')
          .select('*')
          .order('team_number', { ascending: true })
        if (error) {
          console.error('Error fetching prescouting_data:', error)
          setPrescoutingRows([])
          setAllTeams([])
          return
        }
        const rows = data || []
        setPrescoutingRows(rows)

        // Build sorted unique team list
        const seen = new Set()
        const teams = rows
          .filter(r => r.team_number && !seen.has(r.team_number) && seen.add(r.team_number))
          .map(r => String(r.team_number))
          .sort((a, b) => Number(a) - Number(b))
        setAllTeams(teams)
      } catch (err) {
        console.error('Error fetching prescouting_data:', err)
        setPrescoutingRows([])
        setAllTeams([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredRows = useMemo(() => {
    if (!selectedTeams || selectedTeams.length === 0) return []

    const matchTerm = String(matchFilter || '').trim().toLowerCase()

    return prescoutingRows.filter(row => {
      if (!row?.team_number) return false

      const matchesTeam = selectedTeams.includes(String(row.team_number))
      if (!matchesTeam) return false

      if (matchTerm.length === 0) return true
      const rowMatch = String(row.match || '').toLowerCase()
      return rowMatch.includes(matchTerm)
    })
  }, [selectedTeams, matchFilter, prescoutingRows])

  return (
    <div>
      <h1>Prescouting Data</h1>

      <TeamSelector
        allTeams={allTeams}
        selectedTeams={selectedTeams}
        onTeamToggle={handleTeamToggle}
        onClearAll={clearAllTeams}
        title="Select Teams to View"
      />

      <div className="team-data-section">
        <div className="team-data-header">
          <h2>Prescouting Data for {getTeamDisplayText()}</h2>
          <div className="filter-row">
            <label className="filter-label">
              Filter match:
              <input
                value={matchFilter}
                onChange={e => setMatchFilter(e.target.value)}
                placeholder=" Match name/number"
                className="filter-input"
              />
            </label>
          </div>
        </div>

        {loading ? (
          <Loading message="Loading prescouting data..." />
        ) : selectedTeams.length === 0 ? (
          <p>Select one or more teams to view their prescouting records.</p>
        ) : filteredRows.length === 0 ? (
          <p>No prescouting data found for the selected teams.</p>
        ) : (
          <div className="team-data-container">
            {selectedTeams.map(team => {
              const teamRows = filteredRows.filter(row =>
                String(row.team_number) === team
              )

              if (teamRows.length === 0) return null

              return (
                <div key={team} className="team-data-table-section">
                  <h3 className="team-header">Team {team}</h3>
                  <div className="team-data-table-container">
                    <div className="table-wrapper">
                      <table className="qual-data-table">
                        <thead>
                          <tr>
                            <th className="sticky-column" style={{ width: '11rem', minWidth: '11rem', maxWidth: '11rem', textAlign: 'left' }}>Match</th>
                            <th>Scout Name</th>
                            <th>Alliance Teams</th>
                            <th>Strategies</th>
                            <th>Defense</th>
                            <th>Misc</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamRows.map((row, idx) => {
                            const rowKey = row.id ?? `${team}-${idx}`
                            return (
                              <tr key={rowKey}>
                                <td className="sticky-column" style={{ width: '11rem', minWidth: '11rem', maxWidth: '11rem', textAlign: 'left' }}>{row.match}</td>
                                <td>{row.name}</td>
                                <td>{row.alliance_teams}</td>
                                <td>{row.strategies}</td>
                                <td>{row.defense}</td>
                                <td>{row.misc}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PrescoutingData