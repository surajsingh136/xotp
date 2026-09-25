import { config, PHANTOM_COUNTRY } from './config.js'

const EFFECTIVE = '10'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function call(endpoint, params) {
  const q = new URLSearchParams(params)
  const url = `${config.phantom.base}/${endpoint}?${q.toString()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('Provider returned an invalid response')
  }
  return json
}

export async function ticket() {
  const r = await call('ticket', { key: config.phantom.key })
  if (String(r.code) !== '200' || !r.data?.token) throw new Error(phantomError(r))
  return r.data.token
}

export async function buyCandy(token, businessCode) {
  return call('buyCandy', {
    token,
    businessCode,
    quantity: '1',
    country: PHANTOM_COUNTRY,
    effectiveTime: EFFECTIVE,
  })
}

export async function sweetWrapper(token, serialNumber) {
  return call('sweetWrapper', { token, serialNumber })
}

// ticket -> buyCandy, retrying while the provider says the number is "initializing" (code 221)
export async function fetchNumber(businessCode) {
  const token = await ticket()
  let lastErr = null
  for (let i = 0; i < 8; i++) {
    let r
    try {
      r = await buyCandy(token, businessCode)
    } catch (e) {
      lastErr = e
      await sleep(2000)
      continue
    }
    if (String(r.code) === '200') {
      const item = r.data?.phoneNumber?.[0]
      if (item?.number && item?.serialNumber) {
        return { phone: item.number, serial: item.serialNumber, token }
      }
    }
    lastErr = new Error(phantomError(r))
    await sleep(2000)
  }
  throw lastErr || new Error('No numbers available right now. Please try again.')
}

export function extractOtp(vc) {
  if (vc == null) return null
  const m = String(vc).match(/\d{4,6}/)
  return m ? m[0] : null
}

const MESSAGES = {
  221: 'Number is initializing, please try again.',
  403: 'No numbers available right now. Please try again in a moment.',
  404: 'No numbers available for this service. Try again shortly.',
  906: 'No numbers available for this service. Try again shortly.',
  908: 'Waiting for the code\u2026',
}

export function phantomError(result) {
  return MESSAGES[result?.code] || result?.message || 'Provider error'
}
