import { config } from './config.js'

async function call(params) {
  const q = new URLSearchParams(params)
  const url = `${config.grizzly.base}?${q.toString()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) })
  return (await res.text()).trim()
}

const auth = () => ({ api_key: config.grizzly.apiKey })

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

const MESSAGES = {
  BAD_KEY: 'Provider authentication failed.',
  NO_BALANCE: 'No numbers available right now. Please try again later.',
  NO_NUMBERS: 'No numbers available for this service. Try again shortly.',
  'The service is prohibited for sale by administration': 'This service is currently unavailable.',
  SERVICE_UNAVAILABLE_REGION: 'Service is unavailable from this region.',
}

export function grizzlyError(raw) {
  return MESSAGES[raw] || raw || 'Provider error'
}
