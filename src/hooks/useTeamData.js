import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { parseTeamNumber, parseMatchNumber } from '../utils/helpers'

/**
 * Custom hook for fetching and managing team data
 * @param {string[]} selectedTeams - Array of selected team numbers as strings
 * @param {boolean} useDataOnly - Whether to filter for "Use Data" true only
 * @returns {object} - Hook return object with teams, matches, loading state, and functions
 */
export const useTeamData = (selectedTeams = [], useDataOnly = false) => {
  const [allTeams, setAllTeams] = useState([])
  const [matchRows, setMatchRows] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch all available teams
  const fetchAllTeams = async () => {
    if (!supabase) {
      setAllTeams([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('match_data')
        .select('"Scouting ID"')

      if (error) {
        console.error('Error fetching scouting IDs:', error)
        return
      }

      const teamNumbers = data
        .map(row => parseTeamNumber(row["Scouting ID"]))
        .filter(num => num !== null)
      
      const uniqueTeams = [...new Set(teamNumbers)].sort((a, b) => a - b)
      setAllTeams(uniqueTeams)
    } catch (error) {
      console.error('Error in fetchAllTeams:', error)
    }
  }

  // Fetch matches for selected teams
  const fetchMatches = async () => {
    if (!supabase) {
      setMatchRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let query = supabase.from('match_data').select('*')
      if (useDataOnly) {
        query = query.eq("Use Data", true)
      }
      const { data, error } = await query
      if (error) {
        console.error('Error fetching match data:', error)
        return
      }
      let filteredRows = []
      if (!selectedTeams || selectedTeams.length === 0) {
        // If no teams selected, return all rows
        filteredRows = data.map(row => {
          const teamNumber = parseTeamNumber(row["Scouting ID"]);
          return { ...row, team: String(teamNumber), "Team Number": teamNumber };
        });
      } else {
        for (const row of data) {
          const teamNumber = parseTeamNumber(row["Scouting ID"]);
          if (teamNumber && selectedTeams.includes(teamNumber)) {
            filteredRows.push({ ...row, team: String(teamNumber), "Team Number": teamNumber });
          }
        }
      }
      filteredRows.sort((a, b) => {
        if (a.team !== b.team) return Number(a.team) - Number(b.team)
        return parseMatchNumber(a["Scouting ID"]) - parseMatchNumber(b["Scouting ID"])
      })
      setMatchRows(filteredRows)
    } catch (error) {
      console.error('Error in fetchMatches:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reload all data
  const reloadData = async () => {
    await fetchAllTeams()
    await fetchMatches()
  }

  // Fetch data when selectedTeams changes
  useEffect(() => {
    fetchAllTeams()
    fetchMatches()
  }, [selectedTeams.join(','), useDataOnly]) // Use join to avoid unnecessary re-renders

  return {
    allTeams,
    matchRows,
    loading,
    fetchAllTeams,
    fetchMatches,
    reloadData,
    setMatchRows
  }
}
