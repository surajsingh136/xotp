import { config } from './config.js'

async function call(params) {
  const q = new URLSearchParams(params)
  const url = `${config.smsbower.base}?${q.toString()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) })
  return (await res.text()).trim()
}

const auth = () => ({ api_key: config.smsbower.apiKey })

export function getNumber(service, country) {
  return call({ ...auth(), action: 'getNumber', service, country })
}

export function getStatus(activationId) {
  return call({ ...auth(), action: 'getStatus', id: activationId })
}

export function setStatus(activationId, status) {
  return call({ ...auth(), action: 'setStatus', id: activationId, status })
}

export function getBalance() {
  return call({ ...auth(), action: 'getBalance' })
}

export function getPrices(service, country) {
  return call({ ...auth(), action: 'getPrices', service, country })
}

export function parseNumber(raw) {
  const m = /^ACCESS_NUMBER:(\d+):(\d+)$/.exec(raw)
  return m ? { activationId: m[1], phone: m[2] } : null
}

// --- temporary mail API (https://smsbower.online/api/mail/*) ---
const MAIL_BASE = config.smsbower.base.replace(/\/stubs\/handler_api\.php.*$/, '/api/mail')

async function mailCall(endpoint, params) {
  const q = new URLSearchParams({ api_key: config.smsbower.apiKey, ...params })
  const res = await fetch(`${MAIL_BASE}/${endpoint}?${q.toString()}`, { signal: AbortSignal.timeout(25000) })
  const text = (await res.text()).trim()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Mail provider returned an invalid response')
  }
}

export function mailActivate(service = 'swl', domain = 'gmail.com', alias = 0) {
  return mailCall('getActivation', { service, domain, alias: String(alias) })
}

export function mailGetCode(mailId) {
  return mailCall('getCode', { mailId })
}

const MESSAGES = {
  BAD_KEY: 'Provider authentication failed.',
  NO_BALANCE: 'No numbers available right now. Please try again later.',
  NO_NUMBERS: 'No numbers available for this service. Try again shortly.',
  'The service is prohibited for sale by administration': 'This service is currently unavailable.',
  SERVICE_UNAVAILABLE_REGION: 'Service is unavailable from this region.',
}

export function smsbowerError(raw) {
  return MESSAGES[raw] || raw || 'Provider error'
}
