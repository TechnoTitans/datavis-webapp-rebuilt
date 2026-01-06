/**
 * Parses team number from scouting ID
 * @param {string} scoutingId - The scouting ID string
 * @returns {number|null} - The team number or null if invalid
 */
export const parseTeamNumber = (scoutingId) => {
  if (typeof scoutingId !== "string") return null
  const parts = scoutingId.split('_')
  if (parts.length > 1 && !isNaN(Number(parts[1]))) {
    return Number(parts[1])
  }
  return null
}

/**
 * Parses match number from scouting ID
 * @param {string} scoutingId - The scouting ID string
 * @returns {number} - The match number or 0 if invalid
 */
export const parseMatchNumber = (scoutingId) => {
  if (typeof scoutingId !== "string") return 0
  const parts = scoutingId.split('_')
  if (parts.length > 2 && !isNaN(Number(parts[2]))) {
    return Number(parts[2])
  }
  return 0
}

/**
 * Gets color for team based on index
 * @param {string} team - Team number
 * @param {number} idx - Index in team list
 * @param {string[]} colors - Array of color codes
 * @returns {string} - Color code
 */
export const getColorForTeam = (team, idx, colors) => {
  return colors[idx % colors.length]
}

/**
 * Safely converts value to number
 * @param {any} value - Value to convert
 * @returns {number} - Converted number or 0
 */
export const safeNumber = (value) => {
  if (typeof value === 'number' && !isNaN(value)) return value
  return 0
}
