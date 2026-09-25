import { createContext, useContext, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const show = (type, msg) => {
    const id = Math.random().toString(36).slice(2)
    setItems((p) => [...p, { id, type, msg }])
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4200)
  }

  const icon = (type) => (type === 'success' ? '\u2713' : type === 'error' ? '\u2715' : '\u2139')

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="toast-host" role="status">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{icon(t.type)}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)