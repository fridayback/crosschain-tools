// scripts/fix-sdk.mjs — 重放 vendored SDK 的上游缺陷修复（幂等）
//
// 为什么需要它：vendor 进来的 crosschain-sdk 有几处上游缺陷，只能改 node_modules。
// 而 node_modules 会被 `yarn install` 覆盖，dapp/patches/ 又是空的 ——
// 「手改没有任何记录」是本项目反复丢失修复的根因（已经丢过三次）。
// 挂到 package.json 的 postinstall 上，安装后自动重放，就不会再静默丢。
//
// 幂等：已修好的文件不会被改动，也不会重复插入。
// 失败即报错退出：如果上游代码变了形状导致某条规则匹配不到，要吵出来，
// 而不是默默跳过、把问题留到运行时（那里的报错通常指不到真因）。

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// dapp 自己 vendor 的两个 SDK，必装
const SDK_DIRS = ['crosschain-sdk-new', 'crosschain-sdk-old']
// 仓库根目录 CLI 脚本（tools.js / interactive-cli.js）用的 SDK，存在才处理
const SIBLING_SDK_DIRS = ['crosschain-sdk-1-2', 'crosschain-sdk-1-3']

const TARGETS = [
  ...SDK_DIRS.map((d) => ({ label: d, dir: join(root, 'node_modules', d) })),
  ...SIBLING_SDK_DIRS.map((d) => ({
    label: `../${d}`,
    dir: join(root, '..', 'node_modules', d),
    optional: true,
  })),
]

const FIXES = [
  {
    id: 'contracts-mgr.js: setVersion 多传 exUnitTx',
    file: 'contracts-mgr.js',
    // setVersion 把 exUnitTx 传了两次，第二个落到形参 validityStartSlot，
    // 于是 BigNum.from_str("[object Object]") 抛 ParseIntError{InvalidDigit}。
    // 影响：upgradeGroupNFTHolder（Holder 升级）必崩。
    broken: /adminInfo, exUnitTx, exUnitTx\);/,
    apply: (s) => s.replace(/(adminInfo, exUnitTx), exUnitTx\);/, '$1);'),
  },
  {
    id: 'nft-contract.js: NFTTreasuryCheckScript.burn 里的游离 dd',
    file: 'nft-contract.js',
    // 函数体第一行是个游离标识符，调用必抛 ReferenceError。
    broken: /^[ \t]*dd[ \t]*$/m,
    apply: (s) => s.replace(/^[ \t]*dd[ \t]*\r?\n/m, ''),
  },
  {
    id: 'sdk.js: mintInboundCheckToken 调用了不存在的类',
    file: 'sdk.js',
    // InboundCheckScript 只有 burn；mint 在 InboundCheckTokenScript（继承
    // CheckTokenScriptBase）上，签名与实参完全吻合 —— 少的就是 Token 二字。
    broken: /InboundCheckScript\.mint\(/,
    apply: (s) => s.replace(/InboundCheckScript\.mint\(/g, 'InboundCheckTokenScript.mint('),
  },
  {
    id: 'sdk.js: InboundCheck burn 少传「花费验证器」ref',
    file: 'sdk.js',
    // InboundCheckScript.burn 要两个 ref (花费验证器, 铸币策略)。少传一个会让其后
    // 所有实参错位一位，adminNftInfo 收到 changeAddr 字符串，
    // 函数体第一行 adminNftInfo.adminNftUtxo.txHash 抛
    // "Cannot read properties of undefined (reading 'txHash')" —— 指不到真因。
    // \s* 而非写死空格：两份 sdk.js 的逗号后空格并不一致
    broken: /burnUtxos,\s*this\.inboundCheckTokenScriptRefUtxo/,
    apply: (s) =>
      s.replace(
        /,\s*utxoForCollaterals,\s*burnUtxos,\s*this\.inboundCheckTokenScriptRefUtxo$/gm,
        ', utxoForCollaterals, burnUtxos, this.inboundCheckScriptRefUtxo, this.inboundCheckTokenScriptRefUtxo'
      ),
  },
  {
    id: 'utils.js: createScriptRef/transfer 无条件调用 signFn',
    file: 'utils.js',
    // 其余构建器都带 if (signFn) 保护，utils.js 这两个漏了 —— 于是拿不到
    // 「未签名草稿」，而本 app 的构建链路正是 build(undefined, …)。
    // 判定用函数而非正则：包裹之后那 4 行仍然相邻，只有看「上一行是不是
    // if (signFn) {」才能区分「已修」和「没修」。
    broken: (s) => {
      const a = s.split('\n')
      return a.some(
        (l, i) =>
          /const vkeyWitnesses = CardanoWasm\.Vkeywitnesses\.new\(\);/.test(l) &&
          /const signResult = await signFn\(txBodyHash\.to_hex\(\)\);/.test(a[i + 1] || '') &&
          !/if \(signFn\) \{/.test(a[i - 1] || '')
      )
    },
    apply: (s) => {
      const a = s.split('\n')
      const out = []
      for (let i = 0; i < a.length; i++) {
        if (
          /const vkeyWitnesses = CardanoWasm\.Vkeywitnesses\.new\(\);/.test(a[i]) &&
          /const signResult = await signFn\(txBodyHash\.to_hex\(\)\);/.test(a[i + 1] || '') &&
          /vkeyWitnesses\.add\(CardanoWasm\.Vkeywitness\.from_json/.test(a[i + 2] || '') &&
          /transactionWitnessSet\.set_vkeys\(vkeyWitnesses\);/.test(a[i + 3] || '')
        ) {
          const ind = (a[i].match(/^\s*/) || [''])[0]
          out.push(`${ind}if (signFn) {`)
          for (let k = 0; k < 4; k++) out.push('    ' + a[i + k])
          out.push(`${ind}}`)
          i += 3
          continue
        }
        out.push(a[i])
      }
      return out.join('\n')
    },
  },
]

// broken 可以是正则，也可以是 (src) => boolean —— 后者用于「包裹 4 行块」这类
// 无法用单个正则区分「已修/未修」的场景
const isBroken = (fix, src) => (typeof fix.broken === 'function' ? fix.broken(src) : fix.broken.test(src))

let applied = 0
let already = 0
const problems = []

for (const { label, dir, optional } of TARGETS) {
  if (optional && !existsSync(dir)) continue
  for (const fix of FIXES) {
    const path = join(dir, fix.file)
    if (!existsSync(path)) {
      // 可选目标整个包缺失已跳过；必装目标缺文件才是问题
      if (!optional) problems.push(`${label}/${fix.file} 不存在`)
      continue
    }
    const src = readFileSync(path, 'utf8')
    if (!isBroken(fix, src)) {
      already++
      continue
    }
    const next = fix.apply(src)
    if (next === src || isBroken(fix, next)) {
      problems.push(`${label}: 「${fix.id}」规则未能修复（上游代码形状可能已变）`)
      continue
    }
    writeFileSync(path, next)
    applied++
    console.log(`  ✓ 已修 ${label}: ${fix.id}`)
  }
}

if (problems.length) {
  console.error('\n✗ SDK 修复失败：')
  for (const p of problems) console.error('   -', p)
  process.exit(1)
}

console.log(
  applied
    ? `✓ fix-sdk: 修复 ${applied} 处，${already} 处本就正常`
    : `✓ fix-sdk: 无需修复（${already} 处均已正常）`
)
