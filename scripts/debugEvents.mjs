// debugEvents.mjs
import fetch from 'node-fetch'

const TEAM_NUMBER = 1683

async function main() {
  const res = await fetch(`https://api.statbotics.io/v3/events?team=${TEAM_NUMBER}`)
  const data = await res.json()
  console.log("RAW API RESPONSE:", JSON.stringify(data, null, 2))
}

main().catch(err => console.error(err))
