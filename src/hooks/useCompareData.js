import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useTeamData } from './useTeamData'

const OFFICIAL_TABLE_CANDIDATES = ['tba_data', 'tba_matches', 'statbotics_matches']

const fetchFromCandidateTables = async (tableNames) => {
  for (const tableName of tableNames) {
    try {
      const result = await Promise.race([
        supabase.from(tableName).select('*'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ])
      if (result.data && result.data.length > 0) {
        return { tableName, rows: result.data }
      }
    } catch (err) {
      console.warn(`Failed to fetch from ${tableName}:`, err)
    }
  }
  return { tableName: null, rows: [] }
}

export const useCompareData = ({
  selectedTeams = [],
  useDataOnly = true,
  selectedScouters = [],
}) => {
  const {
    allTeams,
    matchRows: rawMatchRows,
    loading: scouterLoading,
    error: scouterError,
  } = useTeamData(selectedTeams, useDataOnly)

  const [tbaRows, setTbaRows] = useState([])
  const [officialTableUsed, setOfficialTableUsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load TBA data
  useEffect(() => {
    const loadTbaData = async () => {
      if (!supabase) return
      try {
        const result = await fetchFromCandidateTables(OFFICIAL_TABLE_CANDIDATES)
        setOfficialTableUsed(result.tableName)
        setTbaRows(result.rows)
      } catch (err) {
        console.warn('Failed to load TBA data:', err)
        setTbaRows([])
        setOfficialTableUsed(null)
      }
    }
    loadTbaData()
  }, [])

  // Extract scouter names from the data
  const scouterNames = useMemo(() => {
    return Array.from(
      new Set(
        (rawMatchRows || [])
          .map((row) => String(row['Scouter Name'] || row._scouterName || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [rawMatchRows])

  // Filter by selected scouters
  const selectedScouterSet = useMemo(
    () => new Set((selectedScouters || []).map((name) => String(name).trim()).filter(Boolean)),
    [selectedScouters],
  )

  const matchRows = useMemo(() => {
    let filtered = rawMatchRows || []
    
    // Filter by selected scouters if any are selected
    if (selectedScouterSet.size > 0) {
      filtered = filtered.filter((row) => {
        const scouterName = String(row['Scouter Name'] || row._scouterName || '').trim()
        return selectedScouterSet.has(scouterName)
      })
    }

    // Sort by team, then match number
    filtered.sort((a, b) => {
      const teamA = Number(a.team) || 0
      const teamB = Number(b.team) || 0
      if (teamA !== teamB) return teamA - teamB
      return (a.matchNumber || 0) - (b.matchNumber || 0)
    })

    return filtered
  }, [rawMatchRows, selectedScouterSet])

  // Diagnostics
  const diagnostics = useMemo(() => ({
    scouterRawRows: rawMatchRows.length,
    scouterRowsAfterUseData: matchRows.length,
    officialRows: tbaRows.length,
    totalRowsBeforeTeamFilter: rawMatchRows.length + tbaRows.length,
  }), [rawMatchRows, matchRows, tbaRows])

  return {
    allTeams,
    matchRows,
    tbaRows,
    scouterNames,
    loading: scouterLoading,
    error: scouterError || error,
    officialTableUsed,
    diagnostics,
  }
}
