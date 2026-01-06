import { deleteOp, listPendingOps, updateOp } from './offlineQueue'
import { supabase } from '../supabaseClient'

const isLikelyNetworkError = (err) => {
  if (!err) return false
  const message = String(err.message || err)
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed') ||
    message.includes('fetch')
  )
}

const isDuplicateKeyError = (err) => {
  if (!err) return false
  const code = err.code
  const message = String(err.message || '')
  return code === '23505' || message.toLowerCase().includes('duplicate key')
}

const MAX_ATTEMPTS = 5

const processOne = async (op) => {
  switch (op.type) {
    case 'updateMatchUseData': {
      const { scoutingId, value } = op.payload
      return await supabase
        .from('match_data')
        .update({ 'Use Data': value })
        .eq('"Scouting ID"', scoutingId)
    }
    case 'insertUnconfirmedData': {
      const { row } = op.payload
      const result = await supabase.from('unconfirmed_data').insert([row])
      if (result.error && isDuplicateKeyError(result.error)) return { data: true, error: null }
      return result
    }
    case 'approveUnconfirmedData': {
      const { unconfirmedItem } = op.payload
      const scoutingId = unconfirmedItem?.['Scouting ID']

      await supabase.from('match_data').delete().eq('"Scouting ID"', scoutingId)

      const matchData = {
        'Scouting ID': unconfirmedItem['Scouting ID'],
        'Scouter Name': unconfirmedItem['Scouter Name'],
        'Position': unconfirmedItem['Position'],
        'Auto Path': unconfirmedItem['Auto Path'],
        'L4 Count': unconfirmedItem['L4 Count'],
        'L4 Missed Count': unconfirmedItem['L4 Missed Count'],
        'L3 Count': unconfirmedItem['L3 Count'],
        'L3 Missed Count': unconfirmedItem['L3 Missed Count'],
        'L2 Count': unconfirmedItem['L2 Count'],
        'L2 Missed Count': unconfirmedItem['L2 Missed Count'],
        'L1 Count': unconfirmedItem['L1 Count'],
        'L1 Missed Count': unconfirmedItem['L1 Missed Count'],
        'Processor Count': unconfirmedItem['Processor Count'],
        'Processor Missed Count': unconfirmedItem['Processor Missed Count'],
        'Net Count': unconfirmedItem['Net Count'],
        'Net Missed Count': unconfirmedItem['Net Missed Count'],
        'Endgame Position': unconfirmedItem['Endgame Position'],
        'Is Ground Coral?': unconfirmedItem['Is Ground Coral?'],
        'Is Ground Algae?': unconfirmedItem['Is Ground Algae?'],
        'Driver Quality': unconfirmedItem['Driver Quality'],
        'Defense Ability': unconfirmedItem['Defense Ability'],
        'Mechanical Reliability': unconfirmedItem['Mechanical Reliability'],
        'Algae Descorability': unconfirmedItem['Algae Descorability'],
        'Notes': unconfirmedItem['Notes'],
        'Use Data': true,
      }

      const insertResult = await supabase.from('match_data').insert([matchData])
      if (insertResult.error) return insertResult

      const deleteUnconfirmedResult = await supabase
        .from('unconfirmed_data')
        .delete()
        .eq('"Scouting ID"', scoutingId)
      return deleteUnconfirmedResult
    }
    case 'rejectUnconfirmedData': {
      const { scoutingId } = op.payload
      return await supabase.from('unconfirmed_data').delete().eq('"Scouting ID"', scoutingId)
    }
    default:
      return { data: null, error: new Error(`Unknown offline op type: ${op.type}`) }
  }
}

export const flushOfflineQueue = async () => {
  if (!supabase) {
    return { synced: 0, remaining: null, stoppedOnNetwork: false }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, remaining: null, stoppedOnNetwork: true }
  }

  const ops = await listPendingOps()
  let synced = 0

  for (const op of ops) {
    if ((op.attempts || 0) >= MAX_ATTEMPTS) {
      await updateOp(op.id, { status: 'dead', lastError: op.lastError || 'Max attempts reached.' })
      continue
    }

    await updateOp(op.id, { attempts: (op.attempts || 0) + 1, lastError: null })

    try {
      const result = await processOne(op)
      if (result?.error) {
        if (isLikelyNetworkError(result.error)) {
          await updateOp(op.id, { lastError: String(result.error.message || result.error) })
          return { synced, remaining: ops.length - synced, stoppedOnNetwork: true }
        }

        await updateOp(op.id, {
          lastError: String(result.error.message || result.error),
          status: (op.attempts || 0) + 1 >= MAX_ATTEMPTS ? 'dead' : 'pending',
        })
        continue
      }

      await deleteOp(op.id)
      synced++
    } catch (err) {
      if (isLikelyNetworkError(err)) {
        await updateOp(op.id, { lastError: String(err.message || err) })
        return { synced, remaining: ops.length - synced, stoppedOnNetwork: true }
      }

      await updateOp(op.id, {
        lastError: String(err.message || err),
        status: (op.attempts || 0) + 1 >= MAX_ATTEMPTS ? 'dead' : 'pending',
      })
    }
  }

  return { synced, remaining: 0, stoppedOnNetwork: false }
}
