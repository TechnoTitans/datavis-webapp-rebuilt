import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.VITE_SUPABASE_URL || 'https://vyrwirioxoelcgrguxpq.supabase.co/'
const key = process.env.VITE_SUPABASE_KEY || ''
if (!key) throw new Error('Set VITE_SUPABASE_KEY in environment')

const supabase = createClient(url, key)

const EVENT_ID = '2025gagai'
const API_URL = `https://api.statbotics.io/v3/matches?event=${EVENT_ID}`

async function run() {
  // Fetch JSON from API instead of reading file
  const res = await fetch(API_URL)
  const rows = await res.json()  // array of match objects

  // Map or transform to your DB schema
  const transformed = rows.map(r => {
    const red = r.alliances.red.team_keys
    const blue = r.alliances.blue.team_keys
    return {
      match_key: r.match_key,
      event: r.event,
      match_number: r.match_number,
      comp_level: r.comp_level,
      red_team_1: red[0],
      red_team_2: red[1],
      red_team_3: red[2],
      blue_team_1: blue[0],
      blue_team_2: blue[1],
      blue_team_3: blue[2],
      red_epa_sum: r.red_epa_sum,
      blue_epa_sum: r.blue_epa_sum,
      winner: r.winner
    }
  })

  // Insert in batches
  const batchSize = 200
  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize)
    const { data, error } = await supabase.from('statbotics_matches').insert(batch)
    if (error) {
      console.error('Insert error on batch', i / batchSize, error)
      process.exit(1)
    }
    console.log(`Inserted batch ${i / batchSize}: ${data.length} rows`)
  }

  console.log('Import complete')
}

run().catch(err => { console.error(err); process.exit(1) })

