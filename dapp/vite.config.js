import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'node:url'
import { HttpsProxyAgent } from 'https-proxy-agent'

const src = (p) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

// WSL 直连境外不稳定（大响应会挂起），proxy 目标请求显式走 Clash 代理
const proxyAgent = new HttpsProxyAgent(
  process.env.HTTPS_PROXY || 'http://127.0.0.1:7897'
)

// 纯前端方案：SDK (CommonJS) + cardano-serialization-lib 浏览器版
// - alias: nodejs 版 serialization-lib → src/csl-wrapper.js（?init 实例化 wasm）
// - nodePolyfills: Buffer/process/global 注入（SDK 依赖 Buffer.from hex 等）
// - ws/@cardano-ogmios: WS 通道在浏览器不可用，stub 掉（HTTP 通道不触发）
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, process: true, global: true },
    }),
  ],
  resolve: {
    alias: {
      '@emurgo/cardano-serialization-lib-nodejs': src('csl-wrapper.js'),
      // WS 通道依赖在浏览器不可用，全部 stub（HTTP 通道不触发）
      ws: src('stubs/ws.js'),
      '@cardano-ogmios/client': src('stubs/ws.js'),
    },
  },
  build: {
    target: 'esnext', // wrapper 顶层 await，需要 esnext
  },
  optimizeDeps: {
    // 排除 browser 包：bg.js 被 esbuild 预构建(CJS 转换)后 wasm imports 与
    // __wbg_set_wasm 闭包不一致导致 BigNum 等运行时崩溃；排除后走源码 ESM
    exclude: ['@emurgo/cardano-serialization-lib-browser'],
    esbuildOptions: {
      target: 'esnext', // dev 预构建 SDK(CJS) 时允许 top-level await
    },
  },
  server: {
    port: 5173,
    proxy: {
      // dev 模式：浏览器同源访问 /cardano-* → vite 转发到 wandevs（经 Clash 代理）
      '/cardano-mainnet': {
        target: 'https://nodes.wandevs.org',
        changeOrigin: true,
        agent: proxyAgent,
        rewrite: (p) => p.replace(/^\/cardano-mainnet/, '/cardano'),
      },
      '/cardano-testnet': {
        target: 'https://nodes-testnet.wandevs.org',
        changeOrigin: true,
        agent: proxyAgent,
        rewrite: (p) => p.replace(/^\/cardano-testnet/, '/cardano'),
      },
    },
  },
})
