import { useEffect, useState } from 'react'
import { init } from './sdk-bridge'
import { detachWallet } from './wallet'
import { NETWORKS } from './config'
import QueryPanel from './components/QueryPanel'
import UtxoPanel from './components/UtxoPanel'
import CheckTokenPanel from './components/CheckTokenPanel'
import SetAddressPanel from './components/SetAddressPanel'
import UpgradePanel from './components/UpgradePanel'
import MultisigPanel from './components/MultisigPanel'
import RebuildPanel from './components/RebuildPanel'
import CosignPanel from './components/CosignPanel'
import PanelBoundary from './components/PanelBoundary'

const TABS = [
  { id: 'query', label: '信息查询', Panel: QueryPanel },
  { id: 'utxo', label: 'UTXO 详情', Panel: UtxoPanel },
  { id: 'check', label: 'CheckToken 管理', Panel: CheckTokenPanel },
  { id: 'set', label: '设置地址', Panel: SetAddressPanel },
  { id: 'upgrade', label: 'Holder 升级', Panel: UpgradePanel },
  { id: 'multisig', label: 'Admin 多签', Panel: MultisigPanel },
  { id: 'cosign', label: '交易补签', Panel: CosignPanel },
  { id: 'rebuild', label: '交易重组', Panel: RebuildPanel },
]

const FIRST_TAB = TABS[0].id

export default function App() {
  const [network, setNetwork] = useState('testnet')
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState(FIRST_TAB)
  // 已打开过的标签页。面板一旦挂载就不再卸载，靠 CSS 隐藏——
  // 否则切走再切回来构建结果、表单输入、查询结果全丢。
  // 首次访问才挂载，避免一上来就把 6 个面板全渲染出来。
  const [visited, setVisited] = useState(() => new Set([FIRST_TAB]))

  useEffect(() => {
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }, [tab])

  const connect = async () => {
    setBusy(true)
    setErr('')
    try {
      await init(network)
      setConnected(true)
    } catch (e) {
      setErr(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }

  // 换网络时旧链上的数据不再适用，重置面板（下次访问重新挂载）
  const switchNetwork = (next) => {
    setNetwork(next)
    setConnected(false)
    detachWallet()
    setVisited(new Set([tab]))
  }

  return (
    <div>
      <header>
        <h1>⛓ Crosschain Contracts Management</h1>
        <select
          value={network}
          onChange={(e) => switchNetwork(e.target.value)}
          disabled={connected}
          style={{ width: 180 }}
        >
          {Object.entries(NETWORKS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        {connected ? (
          <span className="ok">● 已连接 {NETWORKS[network].label}</span>
        ) : (
          <button className="primary" onClick={connect} disabled={busy}>
            {busy ? '连接中…' : '连接网络'}
          </button>
        )}
        {err && <span className="err">{err}</span>}
        <span className="muted" style={{ marginLeft: 'auto' }}>
          crosschain-sdk-old (v1.3.1) / crosschain-sdk-new (1.5.0) · 纯前端 · 私钥仅内存 ·
          支持插件钱包签名
        </span>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
            disabled={!connected}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {!connected ? (
          <div className="card">
            <h3>请先连接网络</h3>
            <p className="muted">
              选择网络（testnet / mainnet）后点击"连接网络"。连接会初始化
              crosschain-sdk-old 与 crosschain-sdk-new 双实例并获取所有合约
              script ref UTXO。
            </p>
          </div>
        ) : (
          TABS.map(({ id, label, Panel }) =>
            // 访问过的面板保持挂载，仅用 display 隐藏，故内部状态不会丢。
            // 每个面板套一层错误边界：面板常驻挂载，任一个在 render 期抛错都会
            // 冒泡到根、整站白屏，边界把它限制在出错的那个标签页内。
            visited.has(id) ? (
              <div key={id} style={{ display: tab === id ? undefined : 'none' }}>
                <PanelBoundary name={label}>
                  <Panel network={network} onNavigate={setTab} />
                </PanelBoundary>
              </div>
            ) : null
          )
        )}
      </main>
    </div>
  )
}
