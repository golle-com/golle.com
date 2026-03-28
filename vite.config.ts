import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function safeExec(command: string) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const buildInfo = {
  BUILD_DATE: new Date().toISOString(),
  GIT_SHA: safeExec('git rev-parse --short HEAD'),
  GIT_SHA_FULL: safeExec('git rev-parse HEAD'),
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
