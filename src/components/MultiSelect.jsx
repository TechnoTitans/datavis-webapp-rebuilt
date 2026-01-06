import React from 'react'

export default function MultiSelect({ options, selected, onChange, label, style }) {
  return (
    <div style={style}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={e => {
                if (e.target.checked) {
                  onChange([...selected, opt])
                } else {
                  onChange(selected.filter(k => k !== opt))
                }
              }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}