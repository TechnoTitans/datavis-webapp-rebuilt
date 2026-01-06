import PropTypes from 'prop-types'

/**
 * Reusable toggle switch component
 * @param {Object} props - Component props
 * @param {boolean} props.checked - Whether the toggle is checked
 * @param {Function} props.onChange - Function to handle toggle change
 * @param {string} props.label - Label text for the toggle
 * @param {string} props.className - Additional CSS class
 * @returns {JSX.Element} - Toggle component
 */
const Toggle = ({ checked, onChange, label, className = "toggle-container" }) => {
  return (
    <label className={className}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className="toggle-text">{label}</span>
    </label>
  )
}

Toggle.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  className: PropTypes.string
}

export default Toggle
