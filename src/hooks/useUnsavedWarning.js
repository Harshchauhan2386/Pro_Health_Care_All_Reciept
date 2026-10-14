import { useEffect } from 'react'

/**
 * Asks the browser to warn before the tab is closed or reloaded while there
 * is unsaved work. (Nothing is stored anywhere, so leaving loses the data.)
 */
export default function useUnsavedWarning(isDirty) {
  useEffect(() => {
    if (!isDirty) return undefined
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
