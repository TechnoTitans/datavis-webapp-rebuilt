import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { parseMatchNumber, parseTeamNumber } from '../utils/helpers'

const SCOUTER_TABLE_CANDIDATES = ['match_data', 'scouter_data']
const OFFICIAL_TABLE_CANDIDATES = ['tba_data', 'tba_matches', 'statbotics_matches']

const SOURCE_SORT_ORDER = {
  scouter: 0,
  tba: 1,
}

const normalizeKey = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase()

const toFiniteNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (lowered === 'true' || lowered === 'yes' || lowered === 'y' || lowered === '1') return true
    if (lowered === 'false' || lowered === 'no' || lowered === 'n' || lowered === '0') return false
  }
  return null
}

const keyValueMapForRow = (row) => {
  const map = new Map()
  Object.entries(row || {}).forEach(([key, value]) => {
    map.set(normalizeKey(key), value)
  })
  return map
}

const pickAliasValue = (rowMap, aliases) => {
  for (const alias of aliases) {
    const value = rowMap.get(normalizeKey(alias))
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return null
}

const parseTeamFromAnyValue = (value) => {
  if (value === null || value === undefined) return null

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }

  const text = String(value)
  if (!text) return null
  const digits = text.match(/\d+/)
  if (!digits) return null
  const parsed = Number(digits[0])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const extractTeamNumber = (row) => {
  if (!row) return null
  const rowMap = keyValueMapForRow(row)
  const directValue = pickAliasValue(rowMap, [
    'team',
    'team_number',
    'team number',
    'team_num',
    'num',
    'team_key',
    'teamkey',
    'Team',
    'Team #',
  ])

  const directTeam = parseTeamFromAnyValue(directValue)
  if (directTeam) return directTeam

  const scoutingId = pickAliasValue(rowMap, ['Scouting ID', 'scouting_id', 'scoutingid'])
  const scoutingTeam = parseTeamNumber(scoutingId)
  if (scoutingTeam) return scoutingTeam

  return null
}

const extractMatchNumber = (row) => {
  if (!row) return 0
  const rowMap = keyValueMapForRow(row)

  const directValue = pickAliasValue(rowMap, [
    'match_number',
    'match number',
    'match',
    'match_num',
    'num',
    'match_no',
    'matchnumber',
  ])
  const directMatch = toFiniteNumber(directValue)
  if (directMatch !== null) return Math.max(0, Math.trunc(directMatch))

  const scoutingId = pickAliasValue(rowMap, ['Scouting ID', 'scouting_id', 'scoutingid'])
  return parseMatchNumber(scoutingId)
}

const extractEventKey = (row) => {
  const rowMap = keyValueMapForRow(row)
  const value = pickAliasValue(rowMap, ['event_key', 'event', 'event id', 'eventid', 'Event'])
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length ? text : null
}

const isMissingTableError = (error) => {
  const code = String(error?.code || '')
  const message = String(error?.message || '').toLowerCase()
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('could not find the table') ||
    message.includes('relation') && message.includes('does not exist')
  )
}

const fetchTableRows = async (tableName) => {
  const { data, error } = await supabase.from(tableName).select('*')
  if (error) {
    throw error
  }
  return data || []
}

const fetchFromCandidateTables = async (tableCandidates) => {
  let firstExisting = { tableName: null, rows: [] }

  for (const tableName of tableCandidates) {
    try {
      const rows = await fetchTableRows(tableName)
      if (!firstExisting.tableName) {
        firstExisting = { tableName, rows }
      }
      if (rows.length > 0) {
        return { tableName, rows }
      }
    } catch (error) {
      if (isMissingTableError(error)) continue
      throw error
    }
  }

  return firstExisting
}

const createCanonicalMetrics = (row) => {
  const rowMap = keyValueMapForRow(row)
  const metrics = {}

  const numberFields = [
    ['L4 Count', ['L4 Count', 'l4_count', 'teleop_coral_l4', 'teleopcorall4']],
    ['L4 Missed Count', ['L4 Missed Count', 'l4_missed_count', 'teleop_coral_l4_missed']],
    ['L3 Count', ['L3 Count', 'l3_count', 'teleop_coral_l3', 'teleopcorall3']],
    ['L3 Missed Count', ['L3 Missed Count', 'l3_missed_count', 'teleop_coral_l3_missed']],
    ['L2 Count', ['L2 Count', 'l2_count', 'teleop_coral_l2', 'teleopcorall2']],
    ['L2 Missed Count', ['L2 Missed Count', 'l2_missed_count', 'teleop_coral_l2_missed']],
    ['L1 Count', ['L1 Count', 'l1_count', 'teleop_coral_l1', 'teleopcorall1']],
    ['L1 Missed Count', ['L1 Missed Count', 'l1_missed_count', 'teleop_coral_l1_missed']],
    ['Processor Count', ['Processor Count', 'processor_count', 'teleop_processor', 'teleopprocessor']],
    ['Processor Missed Count', ['Processor Missed Count', 'processor_missed_count', 'teleop_processor_missed']],
    ['Net Count', ['Net Count', 'net_count', 'teleop_net', 'teleopnet']],
    ['Net Missed Count', ['Net Missed Count', 'net_missed_count', 'teleop_net_missed']],
    ['Auto Points', ['Auto Points', 'auto_points', 'autopoints']],
    ['Teleop Points', ['Teleop Points', 'teleop_points', 'teleoppoints']],
    ['Endgame Points', ['Endgame Points', 'endgame_points', 'endgamepoints']],
    ['Total Points', ['Total Points', 'total_points', 'totalpoints', 'score']],
    ['Coral Points', ['Coral Points', 'coral_points', 'coralpoints', 'teleop_coral_points', 'teleopcoral']],
    ['Algae Points', ['Algae Points', 'algae_points', 'algaepoints', 'auto_algae_points', 'teleop_algae_points']],
    ['EPA Sum', ['EPA Sum', 'epa_sum', 'total_epa', 'totalepa']],
    ['Pin', ['Pin', 'pin', 'pin_count', 'pins']],
    ['Ram', ['Ram', 'ram', 'ram_count', 'rams']],
    ['Block', ['Block', 'block', 'block_count', 'blocks']],
    ['Steal', ['Steal', 'steal', 'steal_count', 'steals']],
    ['Anti Pin', ['Anti Pin', 'anti_pin', 'anti pin', 'pin anti', 'anti_pins']],
    ['Anti Ram', ['Anti Ram', 'anti_ram', 'anti ram', 'ram anti', 'anti_rams']],
    ['Anti Block', ['Anti Block', 'anti_block', 'anti block', 'block anti', 'anti_blocks']],
    ['Anti Steal', ['Anti Steal', 'anti_steal', 'anti steal', 'steal anti', 'anti_steals']],
    ['Penalties', ['Penalties', 'penalties', 'penalty', 'fouls', 'foul_count']],
  ]

  for (const [fieldName, aliases] of numberFields) {
    const parsedValue = toFiniteNumber(pickAliasValue(rowMap, aliases))
    if (parsedValue !== null) {
      metrics[fieldName] = parsedValue
    }
  }

  const booleanFields = [
    ['Auton Leave', ['Auton Leave', 'auto_leave', 'auto_leaves', 'auto leaves']],
    ['Bump', ['Bump', 'bump', 'did_bump', 'has_bump']],
    ['Trench', ['Trench', 'trench', 'did_trench', 'has_trench']],
    ['Broke Down', ['Broke Down', 'broke_down', 'breakdown', 'broke down', 'broken_down']],
  ]

  for (const [fieldName, aliases] of booleanFields) {
    const value = toBoolean(pickAliasValue(rowMap, aliases))
    if (value !== null) {
      metrics[fieldName] = value
    }
  }

  const endgamePosition = pickAliasValue(rowMap, [
    'Endgame Position',
    'endgame_position',
    'endgame',
    'endgame_status',
    'park',
    'endgame park',
  ])
  if (endgamePosition !== null) {
    metrics['Endgame Position'] = String(endgamePosition)
  }

  return metrics
}

const createNormalizedId = (eventKey, teamNumber, matchNumber, fallbackPrefix) => {
  const cleanEvent = String(eventKey || fallbackPrefix || 'event').trim()
  const cleanMatch = Number.isFinite(matchNumber) ? matchNumber : 0
  return `${cleanEvent}_${teamNumber}_${cleanMatch}`
}

const normalizeScouterRows = (rows = [], sourceTable = 'match_data') => {
  const normalized = []
  for (const row of rows) {
    const teamNumber = extractTeamNumber(row)
    if (!teamNumber) continue
    const matchNumber = extractMatchNumber(row)
    const eventKey = extractEventKey(row)

    const canonicalMetrics = createCanonicalMetrics(row)

    normalized.push({
      ...row,
      ...canonicalMetrics,
      team: String(teamNumber),
      matchNumber,
      'Scouting ID':
        row['Scouting ID'] ||
        createNormalizedId(eventKey, teamNumber, matchNumber, sourceTable),
      _sourceType: 'scouter',
      _sourceTable: sourceTable,
      _sourceLabel: 'Scouter',
      _scouterName: row['Scouter Name'] ? String(row['Scouter Name']) : '',
    })
  }
  return normalized
}

const normalizeAllianceRows = (row, tableName) => {
  const eventKey = extractEventKey(row)
  const matchNumber = extractMatchNumber(row)
  const redEpa = toFiniteNumber(row.red_epa_sum)
  const blueEpa = toFiniteNumber(row.blue_epa_sum)

  const allianceEntries = [
    { team: row.red_team_1, alliance: 'red' },
    { team: row.red_team_2, alliance: 'red' },
    { team: row.red_team_3, alliance: 'red' },
    { team: row.blue_team_1, alliance: 'blue' },
    { team: row.blue_team_2, alliance: 'blue' },
    { team: row.blue_team_3, alliance: 'blue' },
  ]

  return allianceEntries
    .map((entry) => ({
      teamNumber: parseTeamFromAnyValue(entry.team),
      alliance: entry.alliance,
    }))
    .filter((entry) => Boolean(entry.teamNumber))
    .map((entry) => ({
      ...createCanonicalMetrics(row),
      team: String(entry.teamNumber),
      matchNumber,
      'Scouting ID': createNormalizedId(eventKey, entry.teamNumber, matchNumber, tableName),
      'EPA Sum': entry.alliance === 'red' ? redEpa : blueEpa,
      _sourceType: 'tba',
      _sourceTable: tableName,
      _sourceLabel: 'TBA',
      _scouterName: '',
      'Use Data': true,
    }))
}

const normalizeOfficialRows = (rows = [], tableName = null) => {
  if (!tableName) return []
  const normalized = []

  for (const row of rows) {
    const hasAllianceColumns =
      row &&
      Object.prototype.hasOwnProperty.call(row, 'red_team_1') &&
      Object.prototype.hasOwnProperty.call(row, 'blue_team_1')

    if (hasAllianceColumns) {
      normalized.push(...normalizeAllianceRows(row, tableName))
      continue
    }

    const teamNumber = extractTeamNumber(row)
    if (!teamNumber) continue

    const matchNumber = extractMatchNumber(row)
    const eventKey = extractEventKey(row)
    const canonicalMetrics = createCanonicalMetrics(row)

    normalized.push({
      ...row,
      ...canonicalMetrics,
      team: String(teamNumber),
      matchNumber,
      'Scouting ID':
        row['Scouting ID'] ||
        createNormalizedId(eventKey, teamNumber, matchNumber, tableName),
      'Use Data': true,
      _sourceType: 'tba',
      _sourceTable: tableName,
      _sourceLabel: 'TBA',
      _scouterName: '',
    })
  }

  return normalized
}

export const useCompareData = ({
  selectedTeams = [],
  sourceMode = 'combined',
  useDataOnly = true,
  selectedScouters = [],
}) => {
  const [allTeams, setAllTeams] = useState([])
  const [matchRows, setMatchRows] = useState([])
  const [tbaRows, setTbaRows] = useState([])
  const [scouterNames, setScouterNames] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [officialTableUsed, setOfficialTableUsed] = useState(null)
  const [diagnostics, setDiagnostics] = useState({
    scouterRawRows: 0,
    scouterRowsAfterUseData: 0,
    officialRows: 0,
    totalRowsBeforeTeamFilter: 0,
  })

  const selectedTeamSet = useMemo(
    () => new Set((selectedTeams || []).map((team) => String(team))),
    [selectedTeams],
  )
  const selectedScouterSet = useMemo(
    () => new Set((selectedScouters || []).map((name) => String(name).trim()).filter(Boolean)),
    [selectedScouters],
  )

  useEffect(() => {
    let isCancelled = false

    const loadCompareData = async () => {
      if (!supabase) {
        if (!isCancelled) {
          setAllTeams([])
          setMatchRows([])
          setTbaRows([])
          setScouterNames([])
          setOfficialTableUsed(null)
          setDiagnostics({
            scouterRawRows: 0,
            scouterRowsAfterUseData: 0,
            officialRows: 0,
            totalRowsBeforeTeamFilter: 0,
          })
          setError(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        let scouterRows = []
        let scouterRowsRaw = []
        let officialRows = []
        let scouterSourceTable = null
        let officialSourceTable = null

        if (sourceMode === 'scouter' || sourceMode === 'combined') {
          const scouterResult = await fetchFromCandidateTables(SCOUTER_TABLE_CANDIDATES)
          scouterSourceTable = scouterResult.tableName
          scouterRowsRaw = normalizeScouterRows(scouterResult.rows, scouterSourceTable || 'match_data')
          scouterRows = scouterRowsRaw
          if (useDataOnly) {
            scouterRows = scouterRows.filter((row) => row['Use Data'] === true)
          }
        }

        if (sourceMode === 'tba' || sourceMode === 'combined') {
          const officialResult = await fetchFromCandidateTables(OFFICIAL_TABLE_CANDIDATES)
          officialSourceTable = officialResult.tableName
          officialRows = normalizeOfficialRows(officialResult.rows, officialSourceTable)
        }

        const fullRowSet =
          sourceMode === 'scouter'
            ? scouterRows
            : sourceMode === 'tba'
              ? officialRows
              : [...scouterRows, ...officialRows]

        const totalRowsBeforeTeamFilter = fullRowSet.length

        const teamDiscoveryRows =
          sourceMode === 'scouter'
            ? scouterRowsRaw
            : sourceMode === 'tba'
              ? officialRows
              : [...scouterRowsRaw, ...officialRows]

        const allTeamNumbers = Array.from(
          new Set(
            teamDiscoveryRows
              .map((row) => toFiniteNumber(row.team))
              .filter((team) => team !== null)
              .map((team) => Number(team)),
          ),
        ).sort((a, b) => a - b)

        const availableScouters = Array.from(
          new Set(
            scouterRowsRaw
              .map((row) => String(row._scouterName || '').trim())
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b))

        let filteredRows = fullRowSet
        if (selectedTeamSet.size > 0) {
          filteredRows = filteredRows.filter((row) => selectedTeamSet.has(String(row.team)))
        }

        if (selectedScouterSet.size > 0) {
          filteredRows = filteredRows.filter((row) => {
            if (row._sourceType !== 'scouter') return true
            return selectedScouterSet.has(String(row._scouterName || '').trim())
          })
        }

        filteredRows.sort((a, b) => {
          if (a.team !== b.team) return Number(a.team) - Number(b.team)
          if (a.matchNumber !== b.matchNumber) return a.matchNumber - b.matchNumber
          const sourceOrderA = SOURCE_SORT_ORDER[a._sourceType] ?? 99
          const sourceOrderB = SOURCE_SORT_ORDER[b._sourceType] ?? 99
          return sourceOrderA - sourceOrderB
        })

        // Build filtered tbaRows for the TBA data table (respects selectedTeams)
        let filteredTbaRows = officialRows
        if (selectedTeamSet.size > 0) {
          filteredTbaRows = filteredTbaRows.filter((row) => selectedTeamSet.has(String(row.team)))
        }
        filteredTbaRows.sort((a, b) => {
          if (a.team !== b.team) return Number(a.team) - Number(b.team)
          return a.matchNumber - b.matchNumber
        })

        if (!isCancelled) {
          setAllTeams(allTeamNumbers)
          setScouterNames(availableScouters)
          setMatchRows(filteredRows)
          setTbaRows(filteredTbaRows)
          setOfficialTableUsed(officialSourceTable)
          setDiagnostics({
            scouterRawRows: scouterRowsRaw.length,
            scouterRowsAfterUseData: scouterRows.length,
            officialRows: officialRows.length,
            totalRowsBeforeTeamFilter,
          })
        }
      } catch (loadError) {
        console.error('Failed to load compare data:', loadError)
        if (!isCancelled) {
          setError(loadError?.message || 'Failed to load compare data')
          setAllTeams([])
          setScouterNames([])
          setMatchRows([])
          setTbaRows([])
          setOfficialTableUsed(null)
          setDiagnostics({
            scouterRawRows: 0,
            scouterRowsAfterUseData: 0,
            officialRows: 0,
            totalRowsBeforeTeamFilter: 0,
          })
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadCompareData()

    return () => {
      isCancelled = true
    }
  }, [
    selectedTeamSet,
    selectedScouterSet,
    sourceMode,
    useDataOnly,
  ])

  return {
    allTeams,
    matchRows,
    tbaRows,
    scouterNames,
    loading,
    error,
    officialTableUsed,
    diagnostics,
  }
}