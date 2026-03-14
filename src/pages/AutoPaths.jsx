import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeamSelector from '../components/TeamSelector'
import Loading from '../components/Loading'
import FieldVisualization from '../components/FieldVisualization'
import { useTeamData } from '../hooks/useTeamData'
import { useSelectedTeams } from '../hooks/useLocalStorage'
import '../index.css'

function AutoPaths() {
  const coords = {
    O: { x: 250, y: 305},
    D: { x: 100, y: 150 },
    R: { x: 158, y: 295 },
    L: { x: 158, y: 370 },
    C: { x: 158, y: 330 },
    N: { x: 670, y: 305 },
    S: { x: 300, y: 305 },
    F: { x: 140, y: 580 },
  }
  const [selectedMatchNumber, setSelectedMatchNumber] = useState({})
  const handleMatchNumberChange = (team, matchNum) => {
    setSelectedMatchNumber(prev => ({ ...prev, [team]: matchNum }))
  }
  const getAutonPath = (team) => {
    const matchNum = selectedMatchNumber[team];
    if (!matchNum) return [];
    const row = matchRows.find(r => {
      const scoutingId = r['Scouting ID'];
      const parts = scoutingId.split('_');
      return parts.length > 2 && Number(parts[1]) === Number(team) && Number(parts[2]) === Number(matchNum);
    });
    if (!row || !row['Auto Path']) return [];
    const pathStr = row['Auto Path'];
    let pathArr = pathStr.split('').map(l => l.trim()).filter(l => coords[l]);
    if (pathArr.length === 0 || pathArr[0] !== 'O') {
      pathArr = ['O', ...pathArr];
    }
    return pathArr;
  }

  const renderArrows = () => {
    if (!safeSelectedTeams.length) return null
    const team = safeSelectedTeams[0]
    const path = getAutonPath(team)
    if (path.length < 2) return null


    const adjustedCoords = { ...coords }
    if (path.some(l => l === 'D' || l === 'R')) {
      adjustedCoords['S'] = { ...adjustedCoords['S'], y: adjustedCoords['S'].y - 90 }
      adjustedCoords['N'] = { ...adjustedCoords['N'], y: adjustedCoords['N'].y - 90 }
    }
    if (path.some(l => l === 'F' || l === 'L')) {
      adjustedCoords['S'] = { ...adjustedCoords['S'], y: adjustedCoords['S'].y + 90 }
      adjustedCoords['N'] = { ...adjustedCoords['N'], y: adjustedCoords['N'].y + 90 }
    }

    const arrows = [];
    const seenPaths = new Set();

    for (let i = 0; i < path.length - 1; i++) {
      const start = adjustedCoords[path[i]]
      const end = adjustedCoords[path[i + 1]]
      const pathKey = `${path[i]}-${path[i + 1]}`;
      const reversePathKey = `${path[i + 1]}-${path[i]}`;

      const opacity = (i + 1) / (path.length - 1);
      const markerId = `arrowhead-${i}`;

      if (seenPaths.has(pathKey) || seenPaths.has(reversePathKey)) {
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2 - 30;
        arrows.push(
          <>
            <defs key={`defs-${i}`}>
              <marker
                id={markerId}
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={`rgba(0, 255, 0, ${opacity})`} />
              </marker>
            </defs>
            <path
              key={i}
              d={`M ${start.x},${start.y} Q ${midX},${midY} ${end.x},${end.y}`}
              stroke={`rgba(0, 255, 0, ${opacity})`}
              strokeWidth="4"
              fill="none"
              markerEnd={`url(#${markerId})`}
            />
          </>
        );
      } else {
        arrows.push(
          <>
            <defs key={`defs-${i}`}>
              <marker
                id={markerId}
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={`rgba(0, 255, 0, ${opacity})`} />
              </marker>
            </defs>
            <line
              key={i}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={`rgba(0, 255, 0, ${opacity})`}
              strokeWidth="4"
              markerEnd={`url(#${markerId})`}
            />
          </>
        );
        seenPaths.add(pathKey);
      }
    }

    const circles = path.filter((l) => l !== 'O').map((l, idx) => (
      <circle key={l+idx} cx={adjustedCoords[l].x} cy={adjustedCoords[l].y} r="18" fill="orange" />
    ))
    const labels = path.filter((l) => l !== 'O').map((l, idx) => (
      <text
        key={l+"label"}
        x={adjustedCoords[l].x}
        y={adjustedCoords[l].y + 5}
        textAnchor="middle"
        fontSize="18"
        fill="black"
      >
        {l}
      </text>
    ))

    return [
      ...arrows,
      ...circles,
      ...labels,
    ];
  }
  
  const navigate = useNavigate()
  const [selectedTeams, setSelectedTeams] = useSelectedTeams('selectedTeamsAutoPaths', [])
  const safeSelectedTeams = Array.isArray(selectedTeams) ? selectedTeams : []
  
  const dummyTeams = safeSelectedTeams.length > 0 ? safeSelectedTeams : ['0']
  const { allTeams, matchRows: allMatchRows, loading } = useTeamData(dummyTeams, true)
  
  const matchRows = safeSelectedTeams.length > 0 
    ? allMatchRows.filter(row => safeSelectedTeams.includes(Number(row['Team Number'])))
    : allMatchRows

  const handleTeamToggle = (team) => {
    const teamNum = Number(team);
    if (safeSelectedTeams.includes(teamNum)) {
      setSelectedTeams([]);
      setSelectedMatchNumber({});
    } else {
      setSelectedTeams([teamNum]);
      setSelectedMatchNumber({ [teamNum]: null });
    }
  }

  const clearAllTeams = () => {
    setSelectedTeams([])
  }

  return (
    <div>
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
      </div>
      <div className="auto-paths-container">
        <h1>Auto Paths</h1>

        <TeamSelector
          allTeams={allTeams || []}
          selectedTeams={safeSelectedTeams}
          onTeamToggle={handleTeamToggle}
          onClearAll={clearAllTeams}
          title="Select Team"
        />

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px', marginBottom: '10px'}}>
          <strong>Select Match Number:</strong>
          {safeSelectedTeams.length === 1 && (() => {
            const team = safeSelectedTeams[0];
            const teamMatches = matchRows.filter(row => String(row['Scouting ID'].split('_')[1]) === String(team));
            const matchNumbers = teamMatches.map(row => {
              const scoutingId = row['Scouting ID'];
              const parts = scoutingId.split('_');
              return parts.length > 2 ? Number(parts[2]) : null;
            }).filter(num => num !== null);
            const uniqueMatchNumbers = [...new Set(matchNumbers)].sort((a, b) => a - b);
            const currentMatch = selectedMatchNumber[team];
            return (
              <div key={team} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: "white" }}>Team {team}:</span>
                <select
                  value={currentMatch || ''}
                  onChange={e => handleMatchNumberChange(team, e.target.value === '' ? null : Number(e.target.value))}
                  style={{ color: "black", backgroundColor: "white" }}
                >
                  <option value="">None</option>
                  {uniqueMatchNumbers.map(num => (
                    <option key={num} value={num}>Match {num}</option>
                  ))}
                </select>
              </div>
            );
          })()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '600px' }}>
          <div style={{ position: 'relative', width: '800px', height: '750px' }}>
            <img src="public/rebuiltauton.png" alt="Background" style={{ width: '100%', height: '100%' }} />
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              viewBox="0 0 800 600"
            >
              {renderArrows()}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AutoPaths
