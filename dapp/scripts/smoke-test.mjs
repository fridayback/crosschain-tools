// scripts/smoke-test.mjs — dapp 冒烟测试（构建产物 + 关键文件 + 依赖完整性）
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let fail = 0
const err = (m) => { console.error('✗', m); fail++ }

const required = [
  'src/config.js', 'src/sdk-bridge.js', 'src/contract-registry.js',
  'src/csl-wrapper.js', 'src/App.jsx', 'src/main.jsx',
  'src/api/query.js', 'src/api/tx.js',
  // 构建 → 补签 → 重组 三段式
  'src/witness.js', 'src/wallet.js', 'src/tx-store.js', 'src/build-flow.js',
  'src/clipboard.js',
  'src/components/QueryPanel.jsx', 'src/components/UtxoPanel.jsx',
  'src/components/SetAddressPanel.jsx', 'src/components/UpgradePanel.jsx',
  'src/components/MultisigPanel.jsx', 'src/components/TxOptions.jsx',
  'src/components/TxViewer.jsx', 'src/components/RebuildPanel.jsx',
  'src/components/CodeField.jsx', 'src/components/RowList.jsx',
  'src/components/CosignPanel.jsx', 'src/components/WalletConnect.jsx',
  'src/components/BuildResult.jsx', 'src/components/CoverageCard.jsx',
  'scripts/witness-test.mjs',
  'dist/index.html',
]
for (const f of required) if (!existsSync(join(root, f))) err(`missing: ${f}`)

// 接线断言：新流程的关键约束
const read = (f) => readFileSync(join(root, f), 'utf8')
try {
  const witness = read('src/witness.js')
  for (const need of ['hash_transaction', 'PublicKey', 'set_vkeys', 'TransactionWitnessSet']) {
    if (!witness.includes(need)) err(`witness.js 缺少 ${need}`)
  }
  // 见证的密码学校验是「挡住别的交易的签名」的唯一手段
  if (!/\.verify\(/.test(witness)) err('witness.js 缺少签名有效性校验')

  const wallet = read('src/wallet.js')
  if (!/signTx\([^)]*,\s*true\s*\)/.test(wallet)) err('wallet.js 的 signTx 必须 partialSign=true')

  // csl-wrapper 没有 default export，所有用到 CSL 的模块必须 import *
  for (const f of ['src/witness.js', 'src/wallet.js', 'src/api/tx.js', 'src/components/TxViewer.jsx']) {
    const src = read(f)
    if (src.includes("from '@emurgo/cardano-serialization-lib-nodejs'")) {
      if (!/import \* as \w+ from '@emurgo\/cardano-serialization-lib-nodejs'/.test(src)) {
        err(`${f}: 必须用 import * as（csl-wrapper 无 default export）`)
      }
    }
  }

  if (!read('src/App.jsx').includes("id: 'rebuild'")) err("App.jsx 缺少 rebuild 标签页")
  if (!read('src/App.jsx').includes("id: 'cosign'")) err("App.jsx 缺少 cosign 标签页")
  if (!read('src/api/tx.js').includes('submitFinalTx')) err('api/tx.js 缺少 submitFinalTx')

  // 构建界面只构建：不得再出现签名入口（签名统一在交易补签界面）
  const txOptions = read('src/components/TxOptions.jsx')
  for (const banned of ['prvKeys', 'signTx', 'UseWallet', 'submitTx']) {
    if (txOptions.includes(banned)) err(`TxOptions.jsx 不应再含 ${banned}（签名已移到交易补签界面）`)
  }
  if (!txOptions.includes('mustSignBy') || !txOptions.includes('changeAddr')) {
    err('TxOptions.jsx 必须保留 changeAddr 与 mustSignBy')
  }
  // 构建流程 hook 不得再签名/提交
  const buildFlow = read('src/build-flow.js')
  for (const banned of ['signWithWallet', 'submitFinalTx', 'addSignature']) {
    if (buildFlow.includes(banned)) err(`build-flow.js 不应含 ${banned}`)
  }

  // 用到 onNavigate 的组件必须从 props 解构出来 —— 否则调用会退化成静默 no-op
  // （曾实际发生过：RebuildPanel 没接 props，「前往交易补签」点了完全没反应）
  for (const f of ['BuildResult', 'CosignPanel', 'RebuildPanel']) {
    const src = read(`src/components/${f}.jsx`)
    if (/\bonNavigate\b/.test(src) && !/function \w+\(\{[^}]*\bonNavigate\b/.test(src)) {
      err(`${f}.jsx 用到了 onNavigate 但未从 props 解构`)
    }
  }
  // App 必须把 setTab 作为 onNavigate 传下去，否则上面的按钮无处可去
  if (!/onNavigate=\{setTab\}/.test(read('src/App.jsx'))) {
    err('App.jsx 未把 setTab 作为 onNavigate 传给面板')
  }
} catch (e) {
  err('接线断言读取失败: ' + (e.message || e))
}

// 构建产物 JS 资源
let jsCount = 0
try {
  const html = readFileSync(join(root, 'dist/index.html'), 'utf8')
  jsCount = html.match(/assets\/[^"]+\.js/g)?.length || 0
  if (jsCount === 0) err('dist 无 JS 资源（先跑 vite build）')
} catch { err('dist/index.html 不可读') }

// csl-wrapper 必须是 base64 内联同步初始化（无 XHR/TLA）
try {
  const w = readFileSync(join(root, 'src/csl-wrapper.js'), 'utf8')
  if (!/const B64 = '/.test(w)) err('csl-wrapper 缺 base64 内联')
  if (/XMLHttpRequest/.test(w)) err('csl-wrapper 含 XHR（同步 XHR arraybuffer 在浏览器受限）')
  if (/await\s/.test(w) && /WebAssembly\.instantiate/.test(w)) err('csl-wrapper 含 TLA')
} catch { err('csl-wrapper.js 不可读') }

// 依赖完整
try {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  for (const d of ['crosschain-sdk-old', 'crosschain-sdk-new', '@emurgo/cardano-serialization-lib-browser', 'react', 'react-dom']) {
    if (!existsSync(join(root, 'node_modules', d))) err(`dep missing: ${d}`)
  }
} catch { err('package.json 不可读') }

if (fail) { console.error(`FAIL: ${fail} 项异常`); process.exit(1) }
console.log(`✓ dapp smoke test passed: ${required.length} files, ${jsCount} js assets, deps OK`)
