import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

function loadEnvFile() {
  const env = {}
  try {
    const text = fs.readFileSync(path.join(root, '.env'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* no .env */
  }
  return env
}

const fileEnv = loadEnvFile()
const pick = (key, fallback) => process.env[key] ?? fileEnv[key] ?? fallback

export const config = {
  port: Number(pick('PORT', 8787)),
  root,
  durian: {
    base: pick('DURIAN_BASE', 'https://vpapi.durianrcs.com/out/ext_api'),
    name: pick('DURIAN_NAME', ''),
    apiKey: pick('DURIAN_APIKEY', ''),
  },
  grizzly: {
    base: pick('GRIZZLY_BASE', 'https://api.grizzlysms.com/stubs/handler_api.php'),
    apiKey: pick('GRIZZLY_APIKEY', ''),
  },
  phantom: {
    base: pick('PHANTOM_BASE', 'http://www.phantomunion.com:10023/pickCode-api/push'),
    key: pick('PHANTOM_KEY', ''),
  },
  smsbower: {
    base: pick('SMSBOWER_BASE', 'https://smsbower.online/stubs/handler_api.php'),
    apiKey: pick('SMSBOWER_APIKEY', ''),
  },
  mailtm: {
    base: pick('MAILTM_BASE', 'https://api.mail.tm'),
  },
}

// server 1 services -> durianrcs project ids (pid)
export const SERVER1_SERVICES = [
  { id: 'swarail', name: 'RailOne (ex-SwaRail)', icon: '\uD83D\uDE84', price: 9, pid: '5821', skipUsed: true },
  { id: 'irctc', name: 'IRCTC', icon: '\uD83C\uDFAB', price: 9, pid: '0183', skipUsed: true },
]

// server 2 services -> GrizzlySMS (sms-activate) service codes
export const SERVER2_SERVICES = [
  { id: 'railone', name: 'RailOne (ex-SwaRail)', icon: '\uD83D\uDE84', price: 9, code: 'swr', skipUsed: true },
  { id: 'irctc', name: 'IRCTC', icon: '\uD83C\uDFAB', price: 9, code: 'us', skipUsed: true },
]

// server 3 services -> PhantomUnion business codes
export const SERVER3_SERVICES = [
  { id: 'railone', name: 'RailOne', icon: '\uD83D\uDE84', price: 9, businessCode: '11161', skipUsed: true },
  { id: 'swarail', name: 'SwaRail', icon: '\uD83D\uDE86', price: 9, businessCode: '11101', skipUsed: true },
  { id: 'irctc-reg', name: 'IRCTC reg', icon: '\uD83C\uDFAB', price: 9, businessCode: '10151', skipUsed: true },
  { id: 'irctc-2', name: 'IRCTC 2', icon: '\uD83C\uDF9F\uFE0F', price: 9, businessCode: '11109', skipUsed: true },
]

// server 4 services -> SMSBower (sms-activate) service codes
export const SERVER4_SERVICES = [
  { id: 'railone', name: 'RailOne (ex-SwaRail)', icon: '\uD83D\uDE84', price: 9, code: 'swl', skipUsed: true },
  { id: 'irctc', name: 'IRCTC', icon: '\uD83C\uDFAB', price: 9, code: 'us', skipUsed: true },
]

// email services -> Gmail via SMSBower mail API, Temp Mail via mail.tm
export const EMAIL_SERVICES = [
  { id: 'gmail', name: 'Gmail (RailOne)', icon: '\uD83D\uDCE7', price: 9, mail: 'smsbower', service: 'swl', domain: 'gmail.com' },
  { id: 'gmail-irctc', name: 'Gmail (IRCTC)', icon: '\uD83D\uDCE7', price: 9, mail: 'smsbower', service: 'us', domain: 'gmail.com' },
  { id: 'mailtm', name: 'Temp Mail', icon: '\uD83D\uDCE8', price: 0, free: true, mail: 'mailtm' },
]

export const DURIAN_COUNTRY = pick('DURIAN_COUNTRY', 'in')
export const GRIZZLY_COUNTRY = pick('GRIZZLY_COUNTRY', '22')
export const PHANTOM_COUNTRY = pick('PHANTOM_COUNTRY', 'IN')
export const SMSBOWER_COUNTRY = pick('SMSBOWER_COUNTRY', '22')
