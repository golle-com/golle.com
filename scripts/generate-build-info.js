#!/usr/bin/env node
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch (e) {
    return null
  }
}

const shortSha = safeExec('git rev-parse --short HEAD') || ''
const fullSha = safeExec('git rev-parse HEAD') || ''
const date = new Date().toISOString()

const content = `// This file is generated at build time. Do not edit.
export const BUILD_DATE = ${JSON.stringify(date)};
export const GIT_SHA = ${JSON.stringify(shortSha)};
export const GIT_SHA_FULL = ${JSON.stringify(fullSha)};
`

// Write to a generated file so we don't modify tracked sources during development.
const outPath = resolve(process.cwd(), 'src', 'build-info.ts')
writeFileSync(outPath, content, 'utf8')
console.log('Wrote build info to', outPath)
