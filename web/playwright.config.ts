import { defineConfig, devices } from '@playwright/test'

const sizes = [[375, 812], [390, 844], [393, 852], [430, 932]] as const
export default defineConfig({
  testDir: process.env.E2E_DIR ?? 'e2e',
  timeout: 120_000,
  use: { baseURL: process.env.E2E_URL ?? 'http://localhost:4173', trace: 'off', screenshot: 'off' },
  webServer: process.env.E2E_URL ? undefined : { command: 'npm run preview', port: 4173, reuseExistingServer: true },
  projects: [
    ...sizes.map(([width, height]) => ({ name: `chromium-${width}x${height}`, use: { ...devices['iPhone 13'], browserName: 'chromium' as const, viewport: { width, height }, deviceScaleFactor: 1, launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } })),
    { name: 'webkit-390x844', use: { ...devices['iPhone 13'], browserName: 'webkit' as const, deviceScaleFactor: 1 } },
  ],
})
