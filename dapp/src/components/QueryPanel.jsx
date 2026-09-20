import { useState, useCallback } from 'react'
import { getOverview, getContracts, getScriptRefs } from '../api/query'
import { GROUP_INFO_PARAMS } from '../config'

// 查询面板：groupInfo / adminInfo / 合约地址+policy / script refs（功能 5、6）
export default function QueryPanel({ network }) {
  const [kind, setKind] = useState('new')
  const [overview, setOverview] = useState(null)
  const [contracts, setContracts] = useState(null)
  const [scriptRefs, setScriptRefs] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const refresh = useCallback(async () => {
    setBusy(true)
    setErr('')
    try {
      const [ov, cs, sr] = await Promise.all([
        getOverview(kind),
        getContracts(kind),
        getScriptRefs(kind),
      ])
      setOverview(ov)
      setContracts(cs)
      setScriptRefs(sr)
    } catch (e) {
      setErr(String(e.message || e))
    } finally {
      setBusy(false)
    }
  }, [kind])

  return (
    <div>
      <div className="card">
        <h3>信息查询（功能 5/6）</h3>
        <div className="row">
          <div>
            <label>SDK 版本</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="new">crosschain-sdk-new (1.5.0)</option>
              <option value="old">crosschain-sdk-old (v1.3.1)</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="primary" onClick={refresh} disabled={busy}>
              {busy ? '查询中…' : '查询'}
            </button>
          </div>
        </div>
        {err && <div className="err">{err}</div>}
      </div>

      {overview && (
        <div className="card">
          <h3>GroupInfo（13 参数）</h3>
          {overview.group.error ? (
            <div className="err">{overview.group.error}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>参数</th>
                  <th>值（hex）</th>
                </tr>
              </thead>
              <tbody>
                {GROUP_INFO_PARAMS.map((p) => (
                  <tr key={p.index}>
                    <td>{p.index}</td>
                    <td>{p.label}</td>
                    <td className="mono">
                      {overview.group.params[p.index] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 style={{ marginTop: 16 }}>AdminInfo</h3>
          {overview.admin.error ? (
            <div className="err">{overview.admin.error}</div>
          ) : (
            <table>
              <tbody>
                <tr>
                  <th>minNumSignatures</th>
                  <td>{overview.admin.info.minNumSignatures}</td>
                </tr>
                <tr>
                  <th>signatories</th>
                  <td className="mono">
                    {(overview.admin.info.signatories || []).join('\n')}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {contracts && (
        <div className="card">
          <h3>合约地址 / Token Policy（功能 6）</h3>
          <table>
            <thead>
              <tr>
                <th>合约</th>
                <th>分组</th>
                <th>地址</th>
                <th>Policy</th>
                <th>TokenId</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.name}>
                  <td>{c.label}</td>
                  <td>{c.group}</td>
                  <td className="mono">{c.address || '—'}</td>
                  <td className="mono">{c.policy || '—'}</td>
                  <td className="mono">{c.tokenId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scriptRefs && (
        <div className="card">
          <h3>Script Ref UTXO（功能 5）</h3>
          <table>
            <thead>
              <tr>
                <th>合约</th>
                <th>script ref 状态</th>
              </tr>
            </thead>
            <tbody>
              {scriptRefs.map((s) => (
                <tr key={s.name}>
                  <td>{s.label}</td>
                  <td className="mono">
                    {s.error ? (
                      <span className="err">{s.error}</span>
                    ) : s.ref ? (
                      <span className="ok">
                        ✓ {s.ref.txId}#{s.ref.index}
                      </span>
                    ) : (
                      <span className="err">未找到</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
