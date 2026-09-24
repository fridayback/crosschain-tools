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
  'src/components/CheckTokenPanel.jsx', 'src/components/Modal.jsx',
  'src/components/ScriptRefCreate.jsx',
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

  // CheckToken 管理：选项卡位置（必须在 UTXO 详情之后）与 mint/burn 方法映射齐全
  const app = read('src/App.jsx')
  const iUtxo = app.indexOf("id: 'utxo'")
  const iCheck = app.indexOf("id: 'check'")
  if (iCheck < 0) err("App.jsx 缺少 check 标签页")
  else if (iUtxo < 0 || iCheck < iUtxo) err("check 标签页必须排在 utxo 之后")

  const txjs = read('src/api/tx.js')
  for (const m of [
    'mintTreasuryCheckToken', 'mintMintCheckToken',
    'mintNFTTreasuryCheckToken', 'mintNFTMintCheckToken',
    'burnTreasuryCheckToken', 'burnMintCheckToken',
    'burnNFTTreasuryCheckTokenWithHolder', 'burnNFTMintCheckTokenWithHolder',
  ]) {
    if (!txjs.includes(m)) err(`api/tx.js 缺少方法映射 ${m}`)
  }
  // NFT 的 burn 只有 WithHolder 变体，holder 必须在第 2 位传入
  if (!/sdk\[method\]\(amount, holder, \.\.\.tail\)/.test(txjs)) {
    err('api/tx.js 的 WithHolder burn 未按 (amount, holder, ...) 传参')
  }

  // 上游 nft-contract.js 里 NFTTreasuryCheckScript.burn 曾有个游离的 `dd`
  // 导致调用必抛 ReferenceError；这里防回归（全部 vendored 副本都要干净）
  for (const p of [
    'node_modules/crosschain-sdk-new/nft-contract.js',
    'node_modules/crosschain-sdk-old/nft-contract.js',
  ]) {
    try {
      if (/^[ \t]*dd[ \t]*$/m.test(read(p))) err(`${p} 里仍有游离的 dd（NFT TreasuryCheck burn 会抛 ReferenceError）`)
    } catch {
      err(`读取失败: ${p}`)
    }
  }

  // SDK 笔误：mintInboundCheckToken 曾调用 InboundCheckScript.mint（该类只有 burn），
  // 必然抛 TypeError。正确目标是继承 CheckTokenScriptBase.mint 的 InboundCheckTokenScript。
  for (const p of [
    'node_modules/crosschain-sdk-new/sdk.js',
    'node_modules/crosschain-sdk-old/sdk.js',
  ]) {
    try {
      const sdk = read(p)
      if (/InboundCheckScript\.mint\(/.test(sdk)) {
        err(`${p}: mintInboundCheckToken 调用了不存在的 InboundCheckScript.mint`)
      }
      if (!/InboundCheckTokenScript\.mint\(/.test(sdk)) {
        err(`${p}: 缺少 InboundCheckTokenScript.mint 调用`)
      }
      if (!sdk.includes('async burnInboundCheckToken')) {
        err(`${p}: 缺少 burnInboundCheckToken`)
      }
      // InboundCheckScript.burn 要两个 ref (花费验证器, 铸币策略)。少传一个会让后面
      // 所有实参错位一位 —— 运行时只报 "Cannot read properties of undefined (reading 'txHash')"，
      // 完全指不到真正原因，所以这里直接卡住这个模式。
      // 注意 \s* 不能写死成单个空格：两份 sdk.js 的逗号后空格并不一致，
      // 写死会把已经正确的代码误判成缺失（踩过一次）。
      if (/burnUtxos,\s*this\.inboundCheckTokenScriptRefUtxo/.test(sdk)) {
        err(`${p}: InboundCheck burn 少传了 inboundCheckScriptRefUtxo（验证器 ref），实参会整体错位`)
      }
      const dual = sdk.match(
        /burnUtxos,\s*this\.inboundCheckScriptRefUtxo,\s*this\.inboundCheckTokenScriptRefUtxo/g
      )
      if (!dual || dual.length !== 2) {
        err(`${p}: InboundCheck 的两个 burn（plain/WithHolder）应各传双 ref，实际 ${dual?.length ?? 0} 处`)
      }
    } catch {
      err(`读取失败: ${p}`)
    }
  }

  // groupInfo 参数名必须由 GroupNFT 常量派生，不能再用第二份手写清单
  const registry = read('src/contract-registry.js')
  if (!registry.includes('groupInfoParamNames')) err('contract-registry.js 缺少 groupInfoParamNames')
  if (read('src/config.js').includes('GROUP_INFO_PARAMS')) {
    err('config.js 仍保留 GROUP_INFO_PARAMS（应由 GroupNFT 常量派生，避免漂移）')
  }
  if (!read('src/components/QueryPanel.jsx').includes('groupInfoParamNames')) {
    err('QueryPanel.jsx 未使用 groupInfoParamNames')
  }

  // InboundCheck 必须与其它 check token 一样有 mint + burn
  for (const m of ['mintInboundCheckToken', 'burnInboundCheckToken']) {
    if (!txjs.includes(m)) err(`api/tx.js 缺少 ${m}`)
  }

  // 创建 script ref UTXO：必须走 utils.createScriptRef，且**不能**走 runOp
  // （runOp 强制要求 5 ADA collateral 与 spend: 执行单元，本操作两者都不需要）
  if (!txjs.includes('createScriptRefUtxo')) err('api/tx.js 缺少 createScriptRefUtxo')
  const csrBody = txjs.slice(
    txjs.indexOf('export async function createScriptRefUtxo'),
    txjs.indexOf('export async function createScriptRefUtxo') + 1600
  )
  if (!csrBody.includes('utils.createScriptRef')) err('createScriptRefUtxo 未调用 utils.createScriptRef')
  if (/return runOp\(/.test(csrBody)) err('createScriptRefUtxo 不应走 runOp（本操作无需 collateral / 执行单元）')
  if (!read('src/api/query.js').includes('getScriptRefOwner')) err('api/query.js 缺少 getScriptRefOwner')

  // fix-sdk 必须带上 utils.js 的 signFn 保护规则，否则该修复会在 yarn install 后丢失
  if (!read('scripts/fix-sdk.mjs').includes('无条件调用 signFn')) {
    err('fix-sdk.mjs 缺少 utils.js signFn 保护规则')
  }

  // 创建 script ref 前必须能核对脚本：弹窗要显示 hash，且 hash 来自本地脚本
  const srcCreate = read('src/components/ScriptRefCreate.jsx')
  if (!srcCreate.includes('scriptInfo.hash')) err('ScriptRefCreate.jsx 未显示脚本 hash')
  const qp = read('src/components/QueryPanel.jsx')
  if (!qp.includes('localScriptInfo')) err('QueryPanel.jsx 未计算本地脚本信息')
  if (!/s\.hash\(\)\.to_hex\(\)/.test(qp)) err('localScriptInfo 未取 script().hash()')
  // language_version() 返回 Language 对象，直接渲染会变成 [object Object]
  if (/version:\s*s\.language_version\(\)/.test(qp)) {
    err('localScriptInfo 直接把 Language 对象当字符串用（应取 .kind()）')
  }
  if (!read('src/api/query.js').includes("InboundCheck: 'InboundCheck'") &&
      !read('src/api/query.js').includes("'InboundCheck',")) {
    err('api/query.js 的 CHECK_TOKEN_TYPES 缺少 InboundCheck')
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
