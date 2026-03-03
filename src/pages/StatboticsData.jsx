import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'
import '../styles/tables.css'

function StatboticsData() {
  const [selectedTeams, setSelectedTeams] = useState([])
  // array of strings from TeamSelector
  const [allTeams, setAllTeams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [selectedTeamRows, setSelectedTeamRows] = useState([])

  // Fetch all unique teams
  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from('statbotics_data')
        .select('team')
        .order('team', { ascending: true })

      if (error) {
        setError('Failed to fetch teams')
        return
      }

      const uniqueTeams = [...new Set(data.map(row => row.team))]
      setAllTeams(uniqueTeams)
    }

    fetchTeams()
  }, [])

  // Fetch raw rows for selected teams to display imported Supabase data
  useEffect(() => {
    const fetchSelectedRows = async () => {
      if (!selectedTeams || selectedTeams.length === 0) {
        setSelectedTeamRows([])
        return
      }

      setLoading(true)
      setError(null)

      // determine whether selected team identifiers are numeric
      const allNumeric = selectedTeams.every(s => /^\d+$/.test(String(s)))
      const inValues = allNumeric ? selectedTeams.map(Number) : selectedTeams

      try {
        const { data, error: fetchErr } = await supabase
          .from('statbotics_data')
          .select('*')
          .in('team', inValues)
          .order('num', { ascending: true })

        if (fetchErr) {
          console.error(fetchErr)
          setError('Failed to fetch selected teams data')
          setSelectedTeamRows([])
          return
        }

        setSelectedTeamRows(data || [])
      } catch (err) {
        console.error(err)
        setError('Unexpected error fetching selected teams data')
        setSelectedTeamRows([])
      } finally {
        setLoading(false)
      }
    }

    fetchSelectedRows()
  }, [selectedTeams])

  if (error) return <div className="page-error">Error: {error}</div>
  if (loading) return <Loading />

  return (
    <div className="page-container">
      <h1>Statbotics Data</h1>

      <TeamSelector
        allTeams={allTeams}
        selectedTeams={selectedTeams}
        onTeamToggle={team => {
          const s = String(team)
          setSelectedTeams(prev =>
            prev.includes(s)
              ? prev.filter(x => x !== s)
              : [...prev, s]
          )
        }}
        onClearAll={() => setSelectedTeams([])}
      />

      {selectedTeams.length > 0 && (
        <div className="team-data-container statbotics-team-data">
          {selectedTeams.map(s => {
            const rows = selectedTeamRows.filter(r => String(r.team).trim().toLowerCase() === String(s).trim().toLowerCase())
            if (rows.length === 0) return null
            
            return (
              <div key={s} className="team-data-table-section">
                <h3 className="team-header">Team {s}</h3>
                <div className="team-data-table-container statbotics-table-container">
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Num</th>
                          <th>First Event</th>
                          <th>Rank</th>
                          <th>Total EPA</th>
                          <th>Auto EPA</th>
                          <th>Teleop EPA</th>
                          <th>Endgame EPA</th>
                          <th>Auto RP EPA</th>
                          <th>Coral RP EPA</th>
                          <th>Barge RP EPA</th>
                          <th>Unitless EPA</th>
                          <th>Norm EPA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.num}</td>
                            <td>{row.first_event || '—'}</td>
                            <td>{row.rank || '—'}</td>
                            <td>{row.total_epa ? row.total_epa.toFixed(2) : '—'}</td>
                            <td>{row.auto_epa ? row.auto_epa.toFixed(2) : '—'}</td>
                            <td>{row.teleop_epa ? row.teleop_epa.toFixed(2) : '—'}</td>
                            <td>{row.endgame_epa ? row.endgame_epa.toFixed(2) : '—'}</td>
                            <td>{row.rp_1_epa ? row.rp_1_epa.toFixed(2) : '—'}</td>
                            <td>{row.rp_2_epa ? row.rp_2_epa.toFixed(2) : '—'}</td>
                            <td>{row.rp_3_epa ? row.rp_3_epa.toFixed(2) : '—'}</td>
                            <td>{row.unitless_epa ? row.unitless_epa.toFixed(2) : '—'}</td>
                            <td>{row.norm_epa ? row.norm_epa.toFixed(2) : '—'}</td>
                          </tr>
                        ))}
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
    )
  }
export default StatboticsData
