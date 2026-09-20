// tx-store.js: 最近一次构建的交易 + 收到的签名结果（模块级单例）
// 「交易重组」标签页靠它自动带入草稿 / mustSignBy / 已收集的钱包签名结果，
// 用户也可以全部手改，store 只是省去手工复制的往返。
import { useSyncExternalStore } from 'react'

let state = {
  draftHex: '', // 未签名草稿（钱包签这个）
  txHex: '', // 候选最终交易：私钥模式=已签名交易；钱包模式=草稿
  changeAddr: '',
  mustSignBy: [],
  opName: '',
  witnesses: [], // 已收集的 witness set CBOR（来自插件钱包签名）
  txHash: '',
  ts: 0,
}

const listeners = new Set()
const emit = () => listeners.forEach((f) => f())

export const getTxStore = () => state
export const subscribeTxStore = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const useTxStore = () => useSyncExternalStore(subscribeTxStore, getTxStore)

export function updateTxStore(patch) {
  state = { ...state, ...patch, ts: Date.now() }
  emit()
}

export function addStoredWitness(hex) {
  if (!hex) return
  const w = String(hex).trim()
  if (!w || state.witnesses.includes(w)) return
  updateTxStore({ witnesses: [...state.witnesses, w] })
}

export function clearStoredWitnesses() {
  updateTxStore({ witnesses: [] })
}
