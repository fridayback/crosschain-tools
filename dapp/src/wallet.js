// wallet.js: CIP-30 插件钱包接入层（纯前端，不做任何持久化）
//
// 与 sdk-bridge.js 一样用模块级单例，但组件用 useSyncExternalStore 订阅，
// 这样任意面板都能看到同一个钱包连接状态。
//
// 注意：必须 `import * as`（csl-wrapper.js 没有 default export）。

import { useSyncExternalStore } from 'react'
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs'
import { NETWORKS } from './config'

let state = {
  available: [],
  id: '',
  name: '',
  api: null,
  address: '',
  usedAddresses: [],
  networkId: null,
  connecting: false,
  connected: false,
  error: '',
}

const listeners = new Set()
const emit = () => listeners.forEach((f) => f())

export const getWalletState = () => state
export const subscribeWallet = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const useWallet = () => useSyncExternalStore(subscribeWallet, getWalletState)

function set(patch) {
  state = { ...state, ...patch }
  emit()
}

// ── 地址编码 ─────────────────────────────────────
// CIP-30 返回的是 hex 编码的地址字节；SDK 全链路要 bech32
function hexToBytes(h) {
  const s = String(h || '').replace(/^0x/i, '')
  const out = new Uint8Array(s.length >> 1)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16)
  return out
}

function toBech32(a) {
  if (typeof a !== 'string' || !a) throw new Error('钱包未返回地址')
  if (a.startsWith('addr')) return a
  return CardanoWasm.Address.from_bytes(hexToBytes(a)).to_bech32()
}

export const networkNameOf = (networkId) =>
  networkId === 1 ? 'mainnet' : networkId === 0 ? 'testnet' : '未知'

// ── 发现 ─────────────────────────────────────────
export function discoverWallets() {
  const c = typeof window !== 'undefined' ? window.cardano : null
  const list = !c
    ? []
    : Object.keys(c)
        .filter(
          (id) => c[id] && typeof c[id].enable === 'function' && typeof c[id].name === 'string'
        )
        .map((id) => ({ id, name: c[id].name, icon: c[id].icon || '' }))
  set({ available: list })
  return list
}

// 部分钱包注入较晚，监听 cardano#initialize 后再刷新一次
export function watchWalletInjection() {
  if (typeof window === 'undefined') return () => {}
  const onInit = () => discoverWallets()
  window.addEventListener('cardano#initialize', onInit)
  return () => window.removeEventListener('cardano#initialize', onInit)
}

// ── 连接 / 断开 ──────────────────────────────────
export async function connectWallet(id, network) {
  const provider = typeof window !== 'undefined' && window.cardano ? window.cardano[id] : null
  if (!provider) throw new Error(`插件钱包 ${id} 不可用`)

  set({ connecting: true, error: '' })
  try {
    // enable() 必须由用户手势触发，否则钱包会拒绝弹窗
    const api = await provider.enable()

    let networkId = null
    if (typeof api.getNetworkId === 'function') {
      networkId = await api.getNetworkId() // 0=testnet 1=mainnet
      const wantMainnet = !!NETWORKS[network]?.isMainnet
      if ((networkId === 1) !== wantMainnet) {
        try {
          api._detach?.()
        } catch {
          // 尽力而为，失败不影响报错
        }
        throw new Error(
          `钱包网络与所选网络不一致：钱包 networkId=${networkId}` +
            `（${networkNameOf(networkId)}），当前选择 ${network}`
        )
      }
    }

    const address = toBech32(await api.getChangeAddress())

    let usedAddresses = []
    try {
      if (typeof api.getUsedAddresses === 'function') {
        usedAddresses = (await api.getUsedAddresses()).map(toBech32)
      }
    } catch {
      // 部分钱包未实现 getUsedAddresses，忽略
    }

    set({
      api,
      id,
      name: provider.name || id,
      address,
      usedAddresses,
      networkId,
      connected: true,
      connecting: false,
      // networkId 为 null 表示该钱包未实现 getNetworkId（已在 kv 行显示为「未知」），
      // 不算连接错误，故不写进 error
      error: '',
    })
    return { address, networkId }
  } catch (e) {
    set({
      api: null,
      connected: false,
      connecting: false,
      address: '',
      usedAddresses: [],
      networkId: null,
      error: String(e?.message || e),
    })
    throw e
  }
}

export function detachWallet() {
  try {
    state.api?._detach?.()
  } catch {
    // 尽力而为
  }
  set({
    api: null,
    id: '',
    name: '',
    address: '',
    usedAddresses: [],
    networkId: null,
    connected: false,
    connecting: false,
    error: '',
  })
}

// ── 签名 ─────────────────────────────────────────
// partialSign 必须为 true：changeAddr 的 key 只是多个签名者之一，
// 其余 mustSignBy 签名者由别的钱包/私钥补。返回 witness set CBOR hex。
export async function signTxWithWallet(txHex) {
  if (!state.api) throw new Error('请先连接插件钱包')
  if (!txHex) throw new Error('没有可签名的交易')
  const wset = await state.api.signTx(txHex, true)
  if (!wset) throw new Error('钱包未返回 witness set')
  return String(wset).trim().replace(/^0x/i, '')
}
