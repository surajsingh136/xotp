import { createContext, useContext, useEffect, useState } from 'react'
import { get, post } from './api.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [overview, setOverview] = useState(null)

  const refresh = () => {
    get('/dashboard')
      .then(setOverview)
      .catch(() => {})
  }

  const signIn = (token, u) => {
    localStorage.setItem('xotp_token', token)
    setUser(u)
    refresh()
  }

  const signOut = () => {
    post('/auth/logout').catch(() => {})
    localStorage.removeItem('xotp_token')
    setUser(null)
    setOverview(null)
  }

  const reloadUser = () => {
    get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {})
  }

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setOverview(null)
    }
    window.addEventListener('xotp-unauthorized', onUnauthorized)
    ;(async () => {
      if (!localStorage.getItem('xotp_token')) {
        setReady(true)
        return
      }
      try {
        const { user: u } = await get('/auth/me')
        setUser(u)
        refresh()
      } catch {
        /* token invalid */
      }
      setReady(true)
    })()
    return () => window.removeEventListener('xotp-unauthorized', onUnauthorized)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, ready, overview, refresh, signIn, signOut, reloadUser }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)