// sdk-bridge: crosschain-sdk-old / crosschain-sdk-new 双实例封装（纯前端，HTTP ogmios 通道）
// old = v1.3.1（旧版合约），new = 1.5.0（新版合约）
import sdkOldPkg from 'crosschain-sdk-old'
import sdkNewPkg from 'crosschain-sdk-new'
import ogmiosUtils from 'crosschain-sdk-new/ogmios-utils2'
import { NETWORKS } from './config'

const state = {
  network: 'testnet',
  old: null, // ContractSdk 实例（old SDK）
  sdkNew: null, // ContractSdk 实例（new SDK）
  ready: false,
}

export const getOg = () => ogmiosUtils
export const getState = () => state

export function getSdk(kind = 'new') {
  const sdk = kind === 'old' ? state.old : state.sdkNew
  if (!sdk) throw new Error('SDK 未初始化，请先连接网络')
  return sdk
}

export function getPkg(kind = 'new') {
  return kind === 'old' ? sdkOldPkg : sdkNewPkg
}

// 初始化：创建 old/new 双 ContractSdk 实例并连接 ogmios
export async function init(network = 'testnet') {
  const cfg = NETWORKS[network]
  if (!cfg) throw new Error(`未知网络: ${network}`)

  state.network = network
  state.old = new sdkOldPkg.ContractSdk(cfg.isMainnet, cfg.scriptRefOwner, false)
  state.sdkNew = new sdkNewPkg.ContractSdk(cfg.isMainnet, cfg.scriptRefOwner, false)

  await state.old.init(cfg.ogmiosUrl)
  await state.sdkNew.init(cfg.ogmiosUrl)
  state.ready = true
  return state
}

// ── 功能 5：信息查询 ──────────────────────────────
// groupInfo datum（13 参数，hex）
export async function getGroupInfo(kind = 'new') {
  const sdk = getSdk(kind)
  const mgr = getPkg(kind).contracts_mgr
  const utxo = await sdk.getGroupInfoNft()
  if (!utxo) throw new Error(`[${kind}] groupInfo NFT UTXO 未找到`)
  return {
    utxo,
    params: mgr.GroupNFT.groupInfoFromDatum(utxo.datum),
  }
}

// adminInfo（signatories + minNumSignatures）
export async function getAdminInfo(kind = 'new') {
  const sdk = getSdk(kind)
  const mgr = getPkg(kind).contracts_mgr
  const utxo = await sdk.getAdminNft()
  if (!utxo) throw new Error(`[${kind}] admin NFT UTXO 未找到`)
  return {
    utxo,
    info: mgr.AdminNFTHolderScript.getSignatoriesInfoFromDatum(utxo.datum),
  }
}

// 指定合约的 script ref utxo
export async function getScriptRefUtxo(kind, contract) {
  const sdk = getSdk(kind)
  return sdk.getScriptRefUtxo(contract.script())
}

// ── 功能 7：UTXO 查询 ─────────────────────────────
export async function getUtxo(address) {
  return ogmiosUtils.getUtxo(address)
}
