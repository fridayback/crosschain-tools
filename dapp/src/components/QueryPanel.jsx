import { useState, useCallback } from 'react'
import { sdkLabel } from '../sdk-versions'
import { getOverview, getContracts, getScriptRefs, getScriptRefOwner } from '../api/query'
import { getPkg } from '../sdk-bridge'
import { groupInfoParamNames, GROUP_INFO_NOTES } from '../contract-registry'
import { CopyButton } from './TxViewer'
import Modal from './Modal'
import ScriptRefCreate from './ScriptRefCreate'

// 资产明细：没有资产时返回 '—'，多个资产每行一个（配合 whiteSpace: pre-line）
function assetLines(assets) {
  if (!assets) return '—'
  const keys = Object.keys(assets)
  return keys.length ? keys.map((k) => `${k}:${assets[k]}`).join('\n') : '—'
}

// script ref UTXO 承载的是脚本本身：给出 plutus 版本与字节数
function scriptInfo(script) {
  if (!script) return '—'
  const parts = Object.entries(script).filter(([, v]) => typeof v === 'string' && v)
  if (!parts.length) return '—'
  return parts.map(([k, v]) => `${k} (${Math.floor(v.length / 2)} B)`).join('\n')
}

// groupInfo 参数值 → 可渲染文本。
//
// 大多数槽位是 hex 字符串，但 `getGroupInfoByDatum` 会把 index 14（PendingGPKParam）
// 解码成对象 { new_gpk, activation_time }。直接塞进 JSX 会让 React 抛
// "Objects are not valid as a React child" —— 而本项目没有 ErrorBoundary，
// 那个错误会冒泡到根、**整页白屏**（且面板常驻挂载，会连带所有标签页）。
// 做通用格式化而不是特判 index 14，未来任何非字符串参数都不会再炸。
function formatParamValue(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    return Object.entries(v)
      .map(([k, val]) => `${k}: ${val}`)
      .join('\n')
  }
  return String(v)
}

// 合约清单条目 → 本地脚本的 hash/版本/字节数，供创建前核对。
// 注意这是**本地**脚本的 hash（TreasuryCheckScript.script().hash()）。
// 不做「与 groupInfo 的 *VH 参数比对」：SDK 的地址推导用的是本地脚本、
// 并不消费那些参数，所以那个相等关系无法证实，贸然打勾/打叉会误导。
function localScriptInfo(entry) {
  const s = entry?.script
  if (!s) return null
  try {
    // language_version() 返回 Language 对象（直接渲染会变成 [object Object]），
    // 要取 kind()：LanguageKind 0/1/2 = PlutusV1/V2/V3
    const kind = s.language_version().kind()
    return {
      hash: s.hash().to_hex(),
      version: ['plutus:v1', 'plutus:v2', 'plutus:v3'][kind] || `plutus:kind=${kind}`,
      bytes: s.bytes().byteLength,
      address: entry.address || '',
    }
  } catch {
    return null // wasm 调用失败（例如 SDK 未 init）
  }
}

// 查询面板：groupInfo / adminInfo / 合约地址+policy / script refs（功能 5、6）
export default function QueryPanel({ network, onNavigate }) {
  const [kind, setKind] = useState('new')
  const [overview, setOverview] = useState(null)
  const [contracts, setContracts] = useState(null)
  const [scriptRefs, setScriptRefs] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [creating, setCreating] = useState('') // 正在创建 script ref 的合约名

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

  // script ref UTXO 的默认 owner（SDK 的 scriptRefOwnerAddr）
  const scriptRefOwner = getScriptRefOwner(kind)

  // 以链上 datum **实际含有的索引**为准渲染（旧 datum 可能只到 11/13，
  // 新 datum 可到 14/18），名字从 GroupNFT 静态常量取，未知索引兜底。
  const paramNames = overview ? groupInfoParamNames(getPkg(kind)) : {}
  const groupParamRows =
    overview?.group?.params && !overview.group.error
      ? Object.keys(overview.group.params)
          .map(Number)
          .filter(Number.isInteger)
          .sort((a, b) => a - b)
          .map((index) => ({ index, name: paramNames[index] || `参数 ${index}` }))
      : []

  return (
    <div>
      <div className="card">
        <h3>信息查询（功能 5/6）</h3>
        <div className="row">
          <div>
            <label>SDK 版本</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="new">{sdkLabel('new')}</option>
              <option value="old">{sdkLabel('old')}</option>
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
          <h3>GroupInfo（{groupParamRows.length} 个参数）</h3>
          {overview.group.error ? (
            <div className="err">{overview.group.error}</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>参数</th>
                  <th>值（hex）</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {groupParamRows.map((p) => (
                  <tr key={p.index}>
                    <td>{p.index}</td>
                    <td>{p.name}</td>
                    <td className="mono" style={{ whiteSpace: 'pre-line' }}>
                      {formatParamValue(overview.group.params[p.index])}
                    </td>
                    <td className="muted">{GROUP_INFO_NOTES[p.index] || ''}</td>
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
          <h3>
            Script Ref UTXO（功能 5）
            <span style={{ float: 'right' }}>
              <CopyButton text={scriptRefOwner} label="复制 owner" />
            </span>
          </h3>
          <div className="kv">
            默认 owner（SDK scriptRefOwnerAddr）：
            <span className="mono">{scriptRefOwner || '（未读到，请先连接网络）'}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>合约</th>
                <th>txid</th>
                <th>index</th>
                <th>ADA</th>
                <th>资产</th>
                <th>脚本</th>
                <th style={{ width: 80 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {scriptRefs.map((s) => (
                <tr key={s.name}>
                  <td>{s.label}</td>
                  {s.error ? (
                    <td colSpan={5} className="err">
                      {s.error}
                    </td>
                  ) : !s.ref ? (
                    <td colSpan={5} className="err">
                      未找到 script ref UTXO
                    </td>
                  ) : (
                    <>
                      <td className="mono">
                        <span className="ok">✓</span> {s.ref.txHash || s.ref.txId || '—'}{' '}
                        <CopyButton text={s.ref.txHash || s.ref.txId || ''} label="复制" />
                      </td>
                      <td>{s.ref.index}</td>
                      <td>
                        {s.ref.value?.coins != null
                          ? (s.ref.value.coins / 1e6).toFixed(6)
                          : '—'}
                      </td>
                      <td className="mono" style={{ whiteSpace: 'pre-line' }}>
                        {assetLines(s.ref.value?.assets)}
                      </td>
                      <td className="mono">{scriptInfo(s.ref.script)}</td>
                    </>
                  )}
                  <td>
                    <button
                      className="secondary copy-btn"
                      disabled={s.ref}
                      title="为这个合约创建 script reference UTXO"
                      onClick={() => setCreating(s.name)}
                    >
                      创建
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 8 }}>
            script ref UTXO 本身通常只带最小 ADA（资产为空），它的「内容」是脚本本身，
            「脚本」列给出 plutus 版本与字节数。点每行的「创建」可为该合约新建一个 script ref UTXO。
          </p>
        </div>
      )}

      {creating && (
        <Modal
          title={`创建 Script Ref UTXO — ${scriptRefs?.find((s) => s.name === creating)?.label || creating}`}
          onClose={() => setCreating('')}
        >
          <ScriptRefCreate
            kind={kind}
            contract={
              scriptRefs?.find((s) => s.name === creating) || {
                name: creating,
                label: creating,
              }
            }
            scriptInfo={localScriptInfo(contracts?.find((c) => c.name === creating))}
            onNavigate={onNavigate}
            onClose={() => setCreating('')}
          />
        </Modal>
      )}
    </div>
  )
}
