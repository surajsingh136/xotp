import { createContext, useContext, useEffect, useState } from 'react'

const ThemeCtx = createContext(null)
const KEY = 'xotp_theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)

export function ThemeToggle({ fixed, grow }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      className={`theme-toggle ${fixed ? 'theme-toggle-fixed' : ''} ${grow ? 'theme-toggle-grow' : ''}`}
      onClick={toggle}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '\u2600\uFE0F Light' : '\uD83C\uDF19 Dark'}
    </button>
  )
}