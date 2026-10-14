import { Link } from 'react-router-dom'

/** "Back to Home" link that asks for confirmation if there is unsaved work. */
export default function BackToHomeLink({ isDirty = false }) {
  return (
    <Link
      to="/"
      onClick={(e) => {
        if (
          isDirty &&
          !window.confirm('Leave this page? Anything you entered here has not been saved and will be lost.')
        ) {
          e.preventDefault()
        }
      }}
      className="no-print inline-block mb-3 text-sm text-blue-600 hover:text-blue-800"
    >
      ← Back to Home
    </Link>
  )
}
