// src/App.jsx
import './App.css'
import './styles/tables.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './pages/TopBar' // acts as layout wrapper
import TeamData from './pages/TeamData'
import StatboticsData from './pages/StatboticsData'
import Compare from './pages/Compare'
import Settings from './pages/Settings'
import MatchStrategy from './pages/MatchStrategy'
import Rankings from './pages/Rankings'
import Picklist from './pages/Picklist'
import Upload from './pages/Upload'
import TeamAnalysis from './pages/TeamAnalysis'
import AutoPaths from './pages/AutoPaths'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<TeamData />} />
          <Route path="/team-data" element={<TeamData />} />
          <Route path="/statbotics-data" element={<StatboticsData />} /> {/* Statbotics tab */}
          <Route path="/compare" element={<Compare />} />
          <Route path="/team-analysis" element={<TeamAnalysis />} />
          <Route path="/match-strategy" element={<MatchStrategy />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/picklist" element={<Picklist />} />
          <Route path="/auto-paths" element={<AutoPaths />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App