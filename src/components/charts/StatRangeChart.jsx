import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function StatRangeChart({ data, fieldName }) {
    if (!data || data.length === 0) {
      return <p className="no-table-data">No data available</p>
    }
  
    return (
      <div className="stat-range-table-container">
        <table className="stat-range-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Average</th>
              <th>Minimum</th>
              <th>Maximum</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td className="field-name">{row.field}</td>
                <td className="stat-value">{row.avg.toFixed(2)}</td>
                <td className="stat-value">{row.min.toFixed(2)}</td>
                <td className="stat-value">{row.max.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  
  export default StatRangeChart