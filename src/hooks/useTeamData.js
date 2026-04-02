import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { parseTeamNumber, parseMatchNumber } from '../utils/helpers'
import { fetchCSVData } from '../utils/csvHandler'

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
    try {
      const { data } = await supabase
        .from('match_data')
        .select('"Scouting ID"')
      
      const teamNumbers = data
        .map(row => parseTeamNumber(row["Scouting ID"]))
        .filter(num => num !== null)

      const uniqueTeams = [...new Set(teamNumbers)].sort((a, b) => a - b)
      setAllTeams(uniqueTeams)
    } catch (error) {
        console.error('Error fetching match data:', error)
        try {
          const csvData = await fetchCSVData()
          const teamNumbers = csvData.map(row => parseTeamNumber(row["Scouting ID"])).filter(num => num !== null)
          const uniqueTeams = [...new Set(teamNumbers)].sort((a, b) => a - b)
          setAllTeams(uniqueTeams)
        } catch (csvError) {
          console.error('Error fetching match data from CSV fallback:', csvError)
          alert('Failed to load match data.')
        return
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch matches for selected teams
  const fetchMatches = async () => {
    if (!selectedTeams || selectedTeams.length === 0) {
      setMatchRows([])
      return
    }

    setLoading(true)
    try {
      let query = supabase.from('match_data').select('*')

      if (useDataOnly) {
        query = query.eq("Use Data", true)
      }

      const { data, error } = await query

      // Filter and sort rows
      let filteredRows = []
      for (const row of data) {
        const teamNumber = parseTeamNumber(row["Scouting ID"])
        if (teamNumber && selectedTeams.includes(String(teamNumber))) {
          filteredRows.push({ ...row, team: Number(teamNumber) })
        }
      }

      // Sort by team, then by match number
      filteredRows.sort((a, b) => {
        if (a.team !== b.team) return Number(a.team) - Number(b.team)
        return parseMatchNumber(a["Scouting ID"]) - parseMatchNumber(b["Scouting ID"])
      })

      setMatchRows(filteredRows)
    } catch (error) {
        console.error('Error fetching match data:', error)
        try {
          const csvData = await fetchCSVData()
          let filteredRows = []
          
          for (const row of csvData) {
            const teamNumber = parseTeamNumber(row["Scouting ID"])
            if (teamNumber && selectedTeams.includes(Number(teamNumber))) {
              if (useDataOnly && row["Use Data"] !== 'true' && row["Use Data"] !== true) {
                continue
              }
              filteredRows.push({ ...row, team: Number(teamNumber) })
            }
          }
          
          filteredRows.sort((a, b) => {
            if (a.team !== b.team) return Number(a.team) - Number(b.team)
            return parseMatchNumber(a["Scouting ID"]) - parseMatchNumber(b["Scouting ID"])
          })

          setMatchRows(filteredRows)
        } catch (csvError) {
          console.error('Error fetching match data from CSV fallback:', csvError)
          alert('Failed to load match data.')
        return
      }
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