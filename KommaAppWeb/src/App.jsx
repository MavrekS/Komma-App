import './App.css'
import { useEffect, useRef, useState } from 'react'
import Header from './Header/Header'
import NavigationBoard from './NavigationBoard/NavigationBoard'
import Main from './Main/Main'
import LoginForma from './Login/LoginForma'

function App() {
  const [activeView, setActiveView] = useState('unos-naloga')
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertIsError, setAlertIsError] = useState(false)
  const originalAlertRef = useRef(window.alert)
  const alertButtonRef = useRef(null)

  useEffect(() => {
    const nativeAlert = originalAlertRef.current
    window.alert = (message) => {
      const normalized = message === undefined || message === null ? '' : String(message)
      const isErrorMessage = /greška|greska|error|neuspje/i.test(normalized)
      setAlertMessage(normalized)
      setAlertIsError(isErrorMessage)
    }

    return () => {
      window.alert = nativeAlert
    }
  }, [])

  const handleLogout = () => {
    setLoggedInUser(null)
    setActiveView('unos-naloga')
  }

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user)
    const role = String(user?.role || 'user').toLowerCase()
    setActiveView(role === 'user' ? 'unos-radni-dan' : 'unos-naloga')
  }

  const closeAlert = () => {
    setAlertMessage('')
    setAlertIsError(false)
  }

  useEffect(() => {
    if (!alertMessage) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        closeAlert()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    requestAnimationFrame(() => {
      alertButtonRef.current?.focus()
    })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [alertMessage])

  if (!loggedInUser) {
    return (
      <>
        <LoginForma onLoginSuccess={handleLoginSuccess} />

        {alertMessage && (
          <div className="app-alert-overlay" onClick={closeAlert}>
            <div className="app-alert-modal" onClick={(event) => event.stopPropagation()}>
              <p className={`app-alert-message${alertIsError ? ' app-alert-message--error' : ''}`}>
                {alertMessage}
              </p>
              <button
                ref={alertButtonRef}
                type="button"
                className="app-alert-button"
                onClick={closeAlert}
              >
                U redu
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="app-shell">
        <Header onLogout={handleLogout} loggedInUsername={loggedInUser?.username} />
        <div className="app-layout">
          <NavigationBoard
            activeView={activeView}
            onSelectView={setActiveView}
            loggedInUser={loggedInUser}
          />
          <Main activeView={activeView} loggedInUser={loggedInUser} />
        </div>
      </div>

      {alertMessage && (
        <div className="app-alert-overlay" onClick={closeAlert}>
          <div className="app-alert-modal" onClick={(event) => event.stopPropagation()}>
            <p className={`app-alert-message${alertIsError ? ' app-alert-message--error' : ''}`}>
              {alertMessage}
            </p>
            <button
              ref={alertButtonRef}
              type="button"
              className="app-alert-button"
              onClick={closeAlert}
            >
              U redu
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
