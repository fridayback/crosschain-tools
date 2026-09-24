import { useState, useCallback } from 'react'
import { getContractUtxos } from '../api/query'
import { UTXO_CONTRACTS } from '../contract-registry'

// UTXO 查询面板：TreasuryCheck / MintCheck / NFTTreasuryCheck / NFTMintCheck / InboundCheck / OutboundHolder（功能 7）
export default function UtxoPanel({ network }) {
  const [kind, setKind] = useState('new')
  const [contractName, setContractName] = useState(UTXO_CONTRACTS[0])
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const query = useCallback(async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await getContractUtxos(kind, contractName)
      setData(r)
    } catch (e) {
      setErr(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }, [kind, contractName])

  return (
    <div>
      <div className="card">
        <h3>合约 UTXO 详情（功能 7）</h3>
        <div className="row">
          <div>
            <label>SDK 版本</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="new">crosschain-sdk-new (1.5.0)</option>
              <option value="old">crosschain-sdk-old (v1.3.1)</option>
            </select>
          </div>
          <div>
            <label>合约</label>
            <select
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
            >
              {UTXO_CONTRACTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="primary" onClick={query} disabled={busy}>
              {busy ? '查询中…' : '查询 UTXO'}
            </button>
          </div>
        </div>
        {err && <div className="err">{err}</div>}
      </div>

      {data && (
        <div className="card">
          <h3>
            {data.contract.label} — {data.contract.address}
          </h3>
          <p className="muted">共 {data.utxos.length} 个 UTXO</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>txId</th>
                <th>index</th>
                <th>ADA</th>
                <th>资产</th>
                <th>datum</th>
              </tr>
            </thead>
            <tbody>
              {data.utxos.map((u, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="mono">{u.txHash || u.txId || '—'}</td>
                  <td>{u.index}</td>
                  <td>{(u.value.coins / 1e6).toFixed(6)}</td>
                  {/* whiteSpace: pre-line 让 join('\n') 真的换行 ——
                      否则多个资产在 HTML 里会挤成一行，看不出是几笔 */}
                  <td className="mono" style={{ whiteSpace: 'pre-line' }}>
                    {u.value.assets && Object.keys(u.value.assets).length
                      ? Object.entries(u.value.assets)
                          .map(([k, v]) => `${k}:${v}`)
                          .join('\n')
                      : '—'}
                  </td>
                  <td className="mono">{u.datum ? u.datum.slice(0, 40) + '…' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
