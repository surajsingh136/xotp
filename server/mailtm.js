import { randomBytes } from 'node:crypto'
import { config } from './config.js'

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(config.mailtm.base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(json?.['hydra:description'] || json?.message || `Mail provider error (${res.status})`)
  }
  return json
}

export async function createMailbox() {
  const domains = await req('/domains?page=1')
  const list = domains?.['hydra:member'] || []
  const domain = list.find((d) => d.isActive && !d.isPrivate)?.domain || list[0]?.domain
  if (!domain) throw new Error('No mail domain available right now. Please try again.')
  const address = `xotp${randomBytes(5).toString('hex')}@${domain}`
  const password = 'Xotp@' + randomBytes(6).toString('hex')
  await req('/accounts', { method: 'POST', body: { address, password } })
  const tok = await req('/token', { method: 'POST', body: { address, password } })
  if (!tok?.token) throw new Error('Could not create mailbox. Please try again.')
  return { address, token: tok.token }
}

export async function latestCode(token) {
  const list = await req('/messages?page=1', { token })
  const items = list?.['hydra:member'] || []
  if (!items.length) return null
  const msg = await req('/messages/' + items[0].id, { token })
  const blob = [msg?.subject, msg?.intro, msg?.text].filter(Boolean).join(' \n ')
  return extractOtp(blob)
}

export function extractOtp(text) {
  if (!text) return null
  const s = String(text)
  const m = s.match(/\b(\d{6})\b/) || s.match(/\b(\d{4,6})\b/)
  return m ? m[1] : null
}
