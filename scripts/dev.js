import { spawn } from 'node:child_process'

const isWin = process.platform === 'win32'
const children = []

function run(name, cmd, args, shell = false) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell })
  child.on('exit', (code) => {
    if (code) console.log(`[${name}] exited with code ${code}`)
  })
  children.push(child)
  return child
}

run('api', process.execPath, ['server/index.js'])
run('web', 'npx', ['vite'], isWin)

function shutdown() {
  for (const c of children) {
    try {
      c.kill()
    } catch {
      /* ignore */
    }
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)