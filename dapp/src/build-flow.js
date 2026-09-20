// build-flow.js: 三个写操作面板共用的「构建未签名草稿」状态机
//
// 这里**不签名、不提交**。整条链路分工：
//   写操作面板（本 hook）→ 构建未签名草稿
//   交易补签           → 用私钥/插件钱包对草稿签名
//   交易重组           → 汇总多方签名、校验 mustSignBy、提交上链

import { useState } from 'react'
import { updateTxStore, clearStoredWitnesses } from './tx-store'

const msg = (e) => String(e?.message || e)

export function useBuildFlow(opName = '') {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [built, setBuilt] = useState(null)

  const reset = () => {
    setError('')
    setBuilt(null)
  }

  // opts: TxOptions 的 params（{changeAddr, mustSignBy[]}）
  // op:   (opts) => Promise<{draftHex, txHex, txJson, txId, mustSignBy, changeAddr}>
  const run = async (opts, op) => {
    setBusy(true)
    reset()
    // 新构建 ⇒ 旧签名对新交易无效
    clearStoredWitnesses()
    try {
      const r = await op(opts)
      setBuilt(r)
      updateTxStore({
        draftHex: r.draftHex,
        txHex: r.txHex,
        changeAddr: r.changeAddr,
        mustSignBy: r.mustSignBy,
        opName,
        txHash: '',
      })
    } catch (e) {
      setError(msg(e))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, built, run, reset }
}
