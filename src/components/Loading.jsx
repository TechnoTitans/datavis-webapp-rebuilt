import PropTypes from 'prop-types'

/**
 * Reusable loading component
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {string} props.className - Additional CSS class
 * @returns {JSX.Element} - Loading component
 */
const Loading = ({ message = "Loading...", className = "" }) => {
  return (
    <div className={`loading-container ${className}`}>
      <p>{message}</p>
    </div>
  )
}

Loading.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string
}

export default Loading
