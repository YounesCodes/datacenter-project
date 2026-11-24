import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./tests',testMatch:'**/*.e2e.spec.ts',fullyParallel:false,workers:1,timeout:35_000,
  use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:900},
    reducedMotion:'reduce',launchOptions:{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']},
    screenshot:'only-on-failure',trace:'retain-on-failure',
  },
  webServer:{command:'npm run dev -- --port 5173 --strictPort',url:'http://127.0.0.1:5173',reuseExistingServer:true,timeout:35_000},
})
