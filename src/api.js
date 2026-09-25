const BASE = '/api'

export class ApiError extends Error {
  constructor(message, status, details, data) {
    super(message)
    this.status = status
    this.details = details
    this.data = data
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  const token = localStorage.getItem('xotp_token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  try { data = await res.json() } catch { /* no body */ }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('xotp_token')
      window.dispatchEvent(new Event('xotp-unauthorized'))
    }
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data?.details, data)
  }
  return data
}

export const get = (p, o) => request(p, { ...o, method: 'GET' })
export const post = (p, body) => request(p, { method: 'POST', body })
export const patch = (p, body) => request(p, { method: 'PATCH', body })
export const put = (p, body) => request(p, { method: 'PUT', body })
export const del = (p, o) => request(p, { ...o, method: 'DELETE' })