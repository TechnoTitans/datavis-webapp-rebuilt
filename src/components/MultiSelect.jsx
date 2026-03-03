export default function MultiSelect({
  options,
  selected,
  onChange,
  label,
  style,
  className = '',
  labelClassName = '',
}) {
  return (
    <div className={`multi-select ${className}`.trim()} style={style}>
      <div className={`multi-select-label ${labelClassName}`.trim()}>{label}</div>
      <div className="multi-select-options">
        {options.map(opt => (
          <label key={opt} className="multi-select-option">
            <input
              className="multi-select-checkbox"
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
            <span className="multi-select-option-text">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
