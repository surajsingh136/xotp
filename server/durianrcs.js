import { config, DURIAN_COUNTRY } from './config.js'

async function call(endpoint, params) {
  const q = new URLSearchParams(params)
  const url = `${config.durian.base}/${endpoint}?${q.toString()}`
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

const baseParams = () => ({ name: config.durian.name, ApiKey: config.durian.apiKey })

export function getMobile(pid, num = 1) {
  return call('getMobile', {
    ...baseParams(),
    cuy: DURIAN_COUNTRY,
    pid,
    num: String(num),
    noblack: '1',
    serial: '2',
    secret_key: 'null',
    vip: 'null',
  })
}

export function getMsg(pn, pid) {
  return call('getMsg', { ...baseParams(), pn, pid, serial: '2' })
}

export function passMobile(pn, pid) {
  return call('passMobile', { ...baseParams(), pn, pid, serial: '2' })
}

export function addBlack(pn, pid) {
  return call('addBlack', { ...baseParams(), pn, pid })
}

export function getStatus(pn, pid) {
  return call('getStatus', { ...baseParams(), pn, pid })
}

export function extractOtp(text) {
  if (text == null) return null
  const s = String(text)
  const six = s.match(/\b(\d{6})\b/)
  if (six) return six[1]
  const any = s.match(/\b(\d{4,8})\b/)
  return any ? any[1] : s.trim().slice(0, 40)
}

const MESSAGES = {
  403: 'No numbers available right now. Please try again in a moment.',
  406: 'Daily number limit reached. Please try again later.',
  200408: 'Number limit reached. Please try again later.',
  904: 'This service is currently unavailable.',
  906: 'No numbers available for this service. Try again shortly.',
  908: 'Waiting for the code\u2026',
}

export function durianError(result) {
  return MESSAGES[result?.code] || result?.msg || 'Provider error'
}
