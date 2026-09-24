// tx.js: 写链操作（功能 1/2/3/4）
//
// 职责：**只构建未签名草稿**（已带 exUnits/redeemers）。签名在「交易补签」界面，
// 汇总与提交在「交易重组」界面 —— 三者的分工见 CLAUDE.md。
//
// 关键不变量：buildUnsigned 产出的 body 是终态的（build_tx() 只调用一次，
// signFn 只在 build_tx() 之后往 witness set 里塞 vkey，不碰 body），
// 因此后续任何签名者签的都是同一份字节，各方见证可以直接相加合并（txid 不变）。

import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs'
import { getSdk, getPkg, getOg } from '../sdk-bridge'
import { TX_PARAMS } from '../config'
import { SETTER_MAP } from '../contract-registry'
import { checkTokenAddress, getContracts } from './query'
import utils from 'crosschain-sdk-new/utils'

// ── 工具 ──────────────────────────────────────────

// 从地址取 fee UTXO（排除 collateral/参数化金额）
export async function getUtxosForFee(addr) {
  const utxos = await getOg().getUtxo(addr)
  return utxos.filter(
    (o) =>
      o.value.coins * 1 !== TX_PARAMS.collateralAmount &&
      o.value.coins * 1 !== TX_PARAMS.parameterizedAmount &&
      o.value.coins * 1 !== TX_PARAMS.parameterizedAmount2
  )
}

// 取 collateral UTXO（恰好 5M ADA 且无资产）；找不到返回 null（需先准备）
export async function getCollateralUtxo(addr) {
  const utxos = await getOg().getUtxo(addr)
  return (
    utxos.find(
      (o) =>
        o.value.coins * 1 === TX_PARAMS.collateralAmount &&
        (!o.value.assets || Object.keys(o.value.assets).length === 0)
    ) || null
  )
}

// CSL 对个别交易 to_json 会抛，降级为 null 由 UI 提示
function safeTxJson(tx) {
  try {
    return tx.to_json()
  } catch {
    return null
  }
}

// 两遍构建：draft(无见证) → evaluate 拿 exUnits → 用同一 exUnits 重建（仍无见证）
// 返回的 tx 已含 redeemer / exUnits / script / script_data_hash，body 即终态。
async function buildUnsigned(sdk, build) {
  const draft = await build(undefined, undefined)
  const exUnits = await getOg().evaluateTx(draft)
  if (!exUnits) throw new Error('evaluateTx 未返回执行单元，构建失败')
  const spendKeys = Object.keys(exUnits).filter((k) => k.startsWith('spend:'))
  if (spendKeys.length === 0) {
    // wandevs evaluate 失败时返回 {success:false, data, error}
    throw new Error(
      'evaluate 失败（链上脚本验证未通过）：' + JSON.stringify(exUnits).slice(0, 300)
    )
  }
  return build(undefined, exUnits)
}

// 4 个操作共用的收尾：只产出未签名草稿
// makeBuild({sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral}) → (signFn, exUnitTx) => Promise<Transaction>
async function runOp(kind, makeBuild, opts) {
  const sdk = getSdk(kind)
  const { changeAddr, mustSignBy = [] } = opts || {}
  if (!changeAddr) throw new Error('缺少 changeAddr')

  const utxosForFee = await getUtxosForFee(changeAddr)
  const utxoForCollateral = await getCollateralUtxo(changeAddr)
  if (!utxoForCollateral)
    throw new Error(
      `changeAddr(${changeAddr}) 下没有恰好 ${TX_PARAMS.collateralAmount} ADA 的 collateral UTXO`
    )

  const build = makeBuild({ sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral })
  const draft = await buildUnsigned(sdk, build)

  return {
    draftHex: draft.to_hex(),
    txHex: draft.to_hex(), // 构建阶段尚无签名，即草稿本身（保持下游取用一致）
    txJson: safeTxJson(draft),
    txId: CardanoWasm.hash_transaction(draft.body()).to_hex(),
    mustSignBy,
    changeAddr,
  }
}

// ── 提交（唯一的写链入口）──────────────────────────
export async function submitFinalTx(txHex, changeAddr) {
  if (!txHex) throw new Error('没有可提交的最终交易')
  const tx = CardanoWasm.Transaction.from_hex(txHex)
  // txid 本地算：它是 body 的纯函数，不能依赖 wandevs 代理的返回形状
  const txId = CardanoWasm.hash_transaction(tx.body()).to_hex()
  const ret = await getOg().submitTx(tx)
  // 代理失败时返回 {success:false,error,...} 而非 txid 字符串；
  // 若直接透传给 waitTxConfirmed，会空转 20×5 秒再抛 Timeout
  if (typeof ret !== 'string') {
    throw new Error('提交失败：' + JSON.stringify(ret).slice(0, 300))
  }
  if (changeAddr) await getOg().waitTxConfirmed(changeAddr, txId)
  return { submitted: true, txHash: txId }
}

// ── 功能 1：设置地址参数 ──────────────────────────
/**
 * @param {'old'|'new'} kind SDK 版本
 * @param {string} paramKey SETTER_MAP 键（GPK/Admin/BalanceWorker/...）
 * @param {string} newValue bech32 地址
 * @param {{changeAddr, mustSignBy[]}} opts
 */
export async function setAddress(kind, paramKey, newValue, opts) {
  const pkg = getPkg(kind)
  const def = SETTER_MAP[paramKey]
  if (!def) throw new Error(`未知参数: ${paramKey}`)
  if (!def.method) throw new Error(def.note || '该参数无独立设置方法')

  const newHash = utils.addressToPkhOrScriptHash(newValue)

  const makeBuild =
    ({ sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral }) =>
    async (signFn, exUnitTx) => {
      if (def.direct) {
        // GPK(switchGroup) / Stake(setStakeVH)：SDK 无高层方法，直调静态（内部不转 hash，需预转）
        const mgr = pkg.contracts_mgr
        const groupInfoUtxo = await sdk.getGroupInfoNft()
        const adminNftUtxo = await sdk.getAdminNft()
        const adminInfo = {
          adminNftUtxo,
          adminNftHoldRefScript: sdk.adminNftHoldRefScript,
          mustSignBy: mustSignBy.map((a) => utils.addressToPkhOrScriptHash(a)),
        }
        const protocolParams = await getOg().getParamProtocol()
        const fn = mgr.GroupInfoNFTHolderScript[def.method]
        return fn(
          protocolParams, utxosForFee, [utxoForCollateral], groupInfoUtxo,
          sdk.groupInfoHolderRef, adminInfo, newHash, changeAddr,
          undefined, signFn, exUnitTx
        )
      }
      // 高层方法（invokeGroupInfoHolder）内部会转换 bech32 → hash，直接传 bech32 地址
      return sdk[def.method](
        newValue, mustSignBy, utxosForFee, [utxoForCollateral], changeAddr, signFn, exUnitTx
      )
    }

  return runOp(kind, makeBuild, opts)
}

// ── 功能 2：groupNftHolder 升级 ───────────────────
// newDatum: PlutusData hex（含除 Version 外全部参数的新 datum，可由 UI 从当前 groupInfo 生成）
export async function upgradeGroupNFTHolder(kind, newHolder, newDatumHex, opts) {
  const makeBuild =
    ({ sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral }) =>
    (signFn, exUnitTx) =>
      sdk.upgradeGroupNFTHolder(
        // 高层内部会转换 bech32 → hash，直接传 bech32 地址
        newHolder, newDatumHex, mustSignBy,
        utxosForFee, [utxoForCollateral], changeAddr, signFn, exUnitTx
      )
  return runOp(kind, makeBuild, opts)
}

// ── 功能 4：adminHolder 升级 ──────────────────────
export async function upgradeAdminNFTHolder(kind, newHolder, newDatumHex, opts) {
  const makeBuild =
    ({ sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral }) =>
    (signFn, exUnitTx) =>
      sdk.upgradeAdminNFTHolder(
        newHolder, newDatumHex, mustSignBy,
        utxosForFee, [utxoForCollateral], changeAddr, signFn, exUnitTx
      )
  return runOp(kind, makeBuild, opts)
}

// ── 功能 3：设置 admin 多签参数 ───────────────────
export async function setAdminMultisig(kind, signatories, minNumSignatures, opts) {
  const makeBuild =
    ({ sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral }) =>
    (signFn, exUnitTx) =>
      sdk.setAdmin(
        signatories, minNumSignatures, mustSignBy,
        utxosForFee, [utxoForCollateral], changeAddr, signFn, exUnitTx
      )
  return runOp(kind, makeBuild, opts)
}

// ── Script Ref UTXO：创建 ──────────────────────────
/**
 * 给 ownerAddr 创建一个 script reference UTXO（把 script 作为引用附在输出上）
 *
 * 刻意**不走 runOp/buildUnsigned**：创建 script ref 输出只是「引用」脚本、并不执行脚本，
 * 所以没有 redeemer、不需要 collateral、也没有执行单元 —— 两遍构建和 collateral 校验
 * 在这里都是多余的（runOp 会因为没有 `spend:` 执行单元而误判失败）。
 *
 * @param {'old'|'new'} kind
 * @param {string} scriptName 合约名（contract-registry 里的 name）
 * @param {string} ownerAddr 接收该 UTXO 的 bech32 地址（默认 scriptRefOwnerAddr）
 * @param {{changeAddr}} opts 手续费与找零来源
 */
export async function createScriptRefUtxo(kind, scriptName, ownerAddr, opts) {
  const { changeAddr } = opts || {}
  if (!changeAddr) throw new Error('缺少 changeAddr')
  if (!ownerAddr) throw new Error('缺少 owner 地址')

  const registry = await getContracts(kind)
  const c = registry.find((x) => x.name === scriptName)
  if (!c) throw new Error(`合约清单中没有: ${scriptName}`)
  if (!c.script) throw new Error(`合约没有可用脚本（SDK 是否已 init）: ${scriptName}`)

  const utxosForFee = await getUtxosForFee(changeAddr)
  if (!utxosForFee.length) {
    throw new Error(`changeAddr(${changeAddr}) 下没有可用作手续费的 UTXO`)
  }
  const protocolParams = await getOg().getParamProtocol()

  const tx = await utils.createScriptRef(
    protocolParams, utxosForFee, changeAddr, ownerAddr, c.script, undefined
  )

  return {
    draftHex: tx.to_hex(),
    txHex: tx.to_hex(),
    txJson: safeTxJson(tx),
    txId: CardanoWasm.hash_transaction(tx.body()).to_hex(),
    mustSignBy: [], // 非脚本花费，无 mustSignBy 约束
    changeAddr,
  }
}

// ── CheckToken 管理：铸造 / 销毁 ───────────────────
//
// 参数顺序（已逐行核对 sdk.js:449-756，错这个是最主要的风险）：
//   mint          (amount, mustSignBy, utxosForFee, [collateral], changeAddr, signFn, exUnitTx)
//   plain burn    (amount, mustSignBy, utxosForFee, [collateral], changeAddr, signFn, exUnitTx)
//   WithHolder    (amount, holder, mustSignBy, utxosForFee, [collateral], changeAddr, signFn, exUnitTx)
//
// amount 是「UTXO 笔数」不是「代币枚数」：mint 每次 add_output 只放 1 枚，
// burn 是 getUtxo(地址).slice(0, amount)。SDK 固定每笔 1 枚，故两者数值相等。

const MINT_METHOD = {
  TreasuryCheck: 'mintTreasuryCheckToken',
  MintCheck: 'mintMintCheckToken',
  NFTTreasuryCheck: 'mintNFTTreasuryCheckToken',
  NFTMintCheck: 'mintNFTMintCheckToken',
  InboundCheck: 'mintInboundCheckToken',
}

// NFT 的两个 burn **只有 WithHolder 变体**（没有 burnNFTTreasuryCheckToken），
// 所以 holder 必须由前台提供；其余（含 InboundCheck）都走 plain 变体，
// SDK 内部自己从实时 groupInfo 推 holder。
const BURN_WITH_HOLDER = new Set(['NFTTreasuryCheck', 'NFTMintCheck'])
const BURN_METHOD = {
  TreasuryCheck: 'burnTreasuryCheckToken',
  MintCheck: 'burnMintCheckToken',
  NFTTreasuryCheck: 'burnNFTTreasuryCheckTokenWithHolder',
  NFTMintCheck: 'burnNFTMintCheckTokenWithHolder',
  InboundCheck: 'burnInboundCheckToken',
}

function assertAmount(amount) {
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error('笔数必须是 ≥1 的整数')
  }
}

/**
 * 铸造 check token
 * @param {'old'|'new'} kind SDK 版本
 * @param {'TreasuryCheck'|'MintCheck'|'NFTTreasuryCheck'|'NFTMintCheck'} tokenType
 * @param {number} amount 笔数（每笔 1 枚，铸到对应的 check 脚本地址）
 * @param {{changeAddr, mustSignBy[]}} opts
 */
export async function mintCheckToken(kind, tokenType, amount, opts) {
  assertAmount(amount)
  const method = MINT_METHOD[tokenType]
  if (!method) throw new Error(`未知代币类型: ${tokenType}`)

  const makeBuild =
    ({ sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral }) =>
    (signFn, exUnitTx) =>
      sdk[method](amount, mustSignBy, utxosForFee, [utxoForCollateral], changeAddr, signFn, exUnitTx)

  return runOp(kind, makeBuild, opts)
}

/**
 * 销毁 check token
 * @param {number} amount 笔数（消耗该代币地址下的前 N 个 UTXO）
 */
export async function burnCheckToken(kind, tokenType, amount, opts) {
  assertAmount(amount)
  const method = BURN_METHOD[tokenType]
  if (!method) throw new Error(`未知代币类型: ${tokenType}`)

  const makeBuild =
    ({ sdk, changeAddr, mustSignBy, utxosForFee, utxoForCollateral }) =>
    async (signFn, exUnitTx) => {
      const tail = [mustSignBy, utxosForFee, [utxoForCollateral], changeAddr, signFn, exUnitTx]
      if (BURN_WITH_HOLDER.has(tokenType)) {
        // holder 由链上实时 groupInfo 推出（见 query.js:checkTokenAddress 的说明）
        const holder = await checkTokenAddress(kind, tokenType)
        return sdk[method](amount, holder, ...tail)
      }
      return sdk[method](amount, ...tail)
    }

  return runOp(kind, makeBuild, opts)
}
