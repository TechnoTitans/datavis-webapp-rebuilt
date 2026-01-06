import { useState, useEffect } from 'react'
import { supabase, supabaseConfigured } from '../supabaseClient'
import '../styles/settings.css'
import '../styles/tables.css'
import { updateMatchUseData } from '../utils/offlineMutations'
import { toast } from 'sonner'

function Settings() {
  const [databaseEditingPerms, setDatabaseEditingPerms] = useState(() => {
    return localStorage.getItem('databaseEditingPerms') === 'true'
  })
  const [useAutoData, setUseAutoData] = useState(() => {
    return localStorage.getItem('useAutoData') === 'true'
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [pendingToggleValue, setPendingToggleValue] = useState(false)
  const [unusedMatches, setUnusedMatches] = useState([])
  const [loading, setLoading] = useState(true)

  const ADMIN_PASSWORD = '0' // haha hardcoded password
  // its ridiculously hard to hide it well
  // jiayu is too lazy
  // rls is too hard

  useEffect(() => {
    fetchUnusedMatches()
  }, [])

  const fetchUnusedMatches = async () => {
    if (!supabaseConfigured || !supabase) {
      setUnusedMatches([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('match_data')
        .select('*')
        .eq('Use Data', false)

      if (error) {
        throw error
      }

      setUnusedMatches(data)
    } catch (error) {
      console.error('Error fetching unused matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAttempt = (checked) => {
    if (checked && !databaseEditingPerms) {
      setPendingToggleValue(checked)
      setShowPasswordModal(true)
    } else {
      setDatabaseEditingPerms(checked)
      localStorage.setItem('databaseEditingPerms', checked.toString())
    }
  }

  const handleAutoDataToggle = (checked) => {
    setUseAutoData(checked)
    localStorage.setItem('useAutoData', checked.toString())
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setDatabaseEditingPerms(pendingToggleValue)
      localStorage.setItem('databaseEditingPerms', pendingToggleValue.toString())
      setShowPasswordModal(false)
      setPasswordInput('')
      toast.success('Enabled', { description: 'Database editing permissions enabled.' })
    } else {
      toast.error('Incorrect password', { description: 'Try again.' })
      setPasswordInput('')
    }
  }

  const handlePasswordCancel = () => {
    setShowPasswordModal(false)
    setPasswordInput('')
    setPendingToggleValue(false)
  }

  const handleUseDataToggle = async (scoutingId, newValue) => {
    if (!databaseEditingPerms) {
      toast.message('Permission required', { description: 'Enable database editing in Settings first.' })
      return
    }

    try {
      const result = await updateMatchUseData({ scoutingId, value: newValue })
      if (result?.error) throw result.error

      // Update local state
      setUnusedMatches(prevMatches =>
        prevMatches.map(match =>
          match["Scouting ID"] === scoutingId ? { ...match, 'Use Data': newValue } : match
        ).filter(match => !match['Use Data']) // Remove from list if enabled
      )
      
      if (result.queued) {
        toast.message(newValue ? 'Match enabled (offline)' : 'Match disabled (offline)', {
          description: 'Queued and will sync when online.',
        })
      } else {
        toast.success(newValue ? 'Match enabled' : 'Match disabled', { description: 'Saved.' })
      }
    } catch (error) {
      console.error('Error updating match:', error)
      toast.error('Update failed', { description: error.message })
    }
  }

  return (
    <div>
      <h2>Settings</h2>
      
      <div className="settings-section">
        <div className="setting-item">
          <label className="switch-label">
            <span>Database Editing Permissions</span>
            <div className="switch">
              <input
                type="checkbox"
                checked={databaseEditingPerms}
                onChange={(e) => handleToggleAttempt(e.target.checked)}
              />
              <span className="slider"></span>
            </div>
          </label>
          <p className="setting-description">
            Enable this to allow editing of database records.
          </p>
        </div>
      </div>

      <div className="settings-section">
        <div className="setting-item">
          <label className="switch-label">
            <span>Use Auto Data In Calculations</span>
            <div className="switch">
              <input
                type="checkbox"
                checked={useAutoData}
                onChange={(e) => handleAutoDataToggle(e.target.checked)}
              />
              <span className="slider"></span>
            </div>
          </label>
          <p className="setting-description">
            When enabled, includes auto data in averages and totals. Not implemented yet. If you see this message, remind Jiayu to make it.
          </p>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Admin Password Required</h3>
            <p>Enter the admin password to enable database editing permissions:</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              className="password-input"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <div className="modal-buttons">
              <button onClick={handlePasswordSubmit} className="btn-confirm">
                Confirm
              </button>
              <button onClick={handlePasswordCancel} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unused Matches Section */}
      <div className="settings-section">
        <h3>Unused Data</h3>

        {loading ? (
          <p>Loading unused matches...</p>
        ) : (
          <div className="team-data-table-container">
            <table>
              <thead>
                <tr>
                  {/* Always render Use Data as the first column */}
                  <th>Use Data</th>
                  {/* Dynamically render all other columns from the first row, excluding "Use Data" to avoid duplication */}
                  {unusedMatches.length > 0 && Object.keys(unusedMatches[0])
                    .filter(col => col !== 'Use Data')
                    .map(col => (
                      <th key={col}>{col}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {unusedMatches.length === 0 ? (
                  <tr>
                    <td colSpan="100%" style={{ textAlign: 'center', fontStyle: 'italic', color: '#888' }}>
                      No unused data.
                    </td>
                  </tr>
                ) : (
                  unusedMatches.map((row, idx) => (
                    <tr key={row["Scouting ID"] ?? row.id ?? idx}>
                      {/* Use Data checkbox always first */}
                      <td>
                        <input
                          type="checkbox"
                          checked={!!row['Use Data']}
                          onChange={e => handleUseDataToggle(row["Scouting ID"], e.target.checked)}
                          disabled={!databaseEditingPerms}
                        />
                      </td>
                      {/* Render other columns dynamically, convert boolean/null to string */}
                      {Object.keys(unusedMatches[0])
                        .filter(col => col !== 'Use Data')
                        .map(col => {
                          let val = row[col];
                          if (typeof val === 'boolean' || val === null) {
                            val = String(val);
                          }
                          const displayVal = String(val);
                          return (
                            <td 
                              key={col} 
                              title={displayVal.length > 15 ? displayVal : undefined}
                            >
                              {displayVal}
                            </td>
                          )
                        })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
