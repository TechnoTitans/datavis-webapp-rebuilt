// Import rankings (NEW STRUCTURE)
async function importRankings() {
  console.log('Fetching rankings...')
  const rankings = await fetchAPI(`rankings?event=${EVENT_KEY}`)
  if (!rankings?.length) return console.log('No rankings found.')

  const rows = rankings.map(r => ({
    num: r.rank ?? null,                // integer rank
    team: r.team ?? null,
    first_event: r.first_event ?? null,

    unitless_epa: r.unitless_epa ?? 0,
    norm_epa: r.norm_epa ?? 0,
    total_epa: r.total_epa ?? 0,
    auto_epa: r.auto_epa ?? 0,
    teleop_epa: r.teleop_epa ?? 0,
    endgame_epa: r.endgame_epa ?? 0,

    rp_1_epa: r.rp_1_epa ?? 0,
    rp_2_epa: r.rp_2_epa ?? 0,
    rp_3_epa: r.rp_3_epa ?? 0
  }))

  for (let row of rows) {
    const { error } = await supabase
      .from('statbotics_rankings')
      .upsert(row, {
        onConflict: ['team']   // use team as unique key
      })

    if (error) console.error('Insert error:', error)
  }

  console.log('Rankings imported.')
}