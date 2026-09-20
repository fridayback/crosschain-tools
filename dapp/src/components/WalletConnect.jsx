import { useEffect, useState } from 'react'
import {
  discoverWallets,
  watchWalletInjection,
  connectWallet,
  detachWallet,
  useWallet,
  networkNameOf,
} from '../wallet'

// CIP-30 钱包连接控件（选择 + 连接/断开 + 状态）。
// 钱包状态在 wallet.js 的模块级 store 里，多个面板各自放一份这个控件不会冲突。
export default function WalletConnect({ network, note }) {
  const wallet = useWallet()
  const [walletId, setWalletId] = useState('')

  // 发现已注入的钱包，并监听晚注入（cardano#initialize）
  useEffect(() => {
    discoverWallets()
    return watchWalletInjection()
  }, [])

  useEffect(() => {
    if (!walletId && wallet.available.length) setWalletId(wallet.available[0].id)
  }, [wallet.available, walletId])

  const doConnect = async () => {
    try {
      await connectWallet(walletId, network)
    } catch {
      // 错误已写进 wallet store，由下方 .err 展示
    }
  }

  return (
    <div className="sig">
      <div className="row">
        <div>
          <label>插件钱包（CIP-30）</label>
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            disabled={wallet.connected}
          >
            {wallet.available.length === 0 && <option value="">未检测到 CIP-30 钱包</option>}
            {wallet.available.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '0 0 auto', minWidth: 150 }}>
          <label>&nbsp;</label>
          {wallet.connected ? (
            <button className="secondary" onClick={detachWallet}>
              断开钱包
            </button>
          ) : (
            <button
              className="primary"
              onClick={doConnect}
              disabled={!walletId || wallet.connecting}
            >
              {wallet.connecting ? '连接中…' : '连接钱包'}
            </button>
          )}
        </div>
      </div>

      {wallet.connected && (
        <>
          <div className="kv">
            钱包 {wallet.name} · 网络 {networkNameOf(wallet.networkId)}（networkId=
            {wallet.networkId}）<span className="badge ok">已连接</span>
          </div>
          <div className="kv">钱包地址：{wallet.address}</div>
        </>
      )}
      {wallet.error && <div className="err">{wallet.error}</div>}
      {note && <p className="muted">{note}</p>}
    </div>
  )
}
