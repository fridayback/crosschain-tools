import { useEffect, useRef, useState } from 'react'
import { useTxStore } from '../tx-store'
import {
  validateWitnesses,
  prepareWitnessSources,
  parseTxOrThrow,
  normalizeHex,
  txToJsonObject,
  witnessesToJsonObject,
} from '../witness'
import { submitFinalTx } from '../api/tx'
import TxViewer, { CopyButton } from './TxViewer'
import CodeField from './CodeField'
import RowList from './RowList'
import CoverageCard from './CoverageCard'

// 交易重组：把不同钱包的签名结果汇总到同一笔交易上
//
// 草稿交易 / mustSignBy / changeAddr / 已收集的钱包签名结果 会从 tx-store 自动带入，
// 也可以全部手动填写。重组只往 witness set 追加 vkey，body 不变 ⇒ txid 不变。
export default function RebuildPanel({ onNavigate }) {
  // 跳转靠 App 注入的 setTab 完成。这里显式检查而不是写 onNavigate?.()：
  // 可选链会把「props 没接上」变成一个静默无反应的按钮，极难排查（这个坑踩过一次）。
  const goTo = (id) => {
    if (typeof onNavigate !== 'function') {
      console.warn(`[RebuildPanel] onNavigate 未注入，跳转到「${id}」被忽略`)
      return
    }
    onNavigate(id)
  }

  const store = useTxStore()

  const [txHex, setTxHex] = useState('')
  const [changeAddr, setChangeAddr] = useState('')
  // changeAddr 只用于提交后的 waitTxConfirmed，由构建页带入；默认锁定防止误改
  const [addrEditable, setAddrEditable] = useState(false)
  const [mustSignBy, setMustSignBy] = useState([''])
  const [witnessRows, setWitnessRows] = useState([''])

  const [busy, setBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { check, parseErrors, sourceCount }
  const [txHash, setTxHash] = useState('')

  // 从 store 带入。只在「换了一笔交易」时整组覆盖；同一笔交易下只把新签到的见证
  // 追加进来，不动用户已填的内容——否则用户在别处签个名（也会推新快照）就会把
  // 这里手工粘贴的其它钱包签名冲掉。
  const lastTxKey = useRef('')

  const loadFromStore = (force = false) => {
    const base = store.draftHex || store.txHex
    const txChanged = !!base && base !== lastTxKey.current

    if (force || txChanged) {
      lastTxKey.current = base || lastTxKey.current
      if (base) setTxHex(base)
      setMustSignBy(store.mustSignBy?.length ? [...store.mustSignBy] : [''])
      setChangeAddr(store.changeAddr || '')
      if (txChanged) {
        // 换了一笔交易：旧签名对新交易无效，整组替换
        setWitnessRows(store.witnesses?.length ? [...store.witnesses] : [''])
        return
      }
    }

    // 同一笔交易（含用户手动点重载）：只追加新见证，不冲掉已填内容
    const ws = store.witnesses || []
    if (!ws.length) return
    setWitnessRows((cur) => {
      const have = new Set(cur.map((r) => r.trim()).filter(Boolean))
      const add = ws.filter((w) => !have.has(w.trim()))
      if (!add.length) return cur
      return [...cur.filter((r) => r.trim()), ...add]
    })
  }

  useEffect(() => {
    if (!store.ts) return
    loadFromStore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ts])

  const mustSignByList = mustSignBy.map((s) => s.trim()).filter(Boolean)

  const doRebuild = () => {
    setBusy(true)
    setError('')
    setResult(null)
    setTxHash('')
    try {
      const draft = normalizeHex(txHex)
      parseTxOrThrow(draft) // 友好报错：hex 不合法 / 不是交易

      // 每行是一段签名结果；空行拼回去不影响 splitWitnessInputs（它本就按空行分段）
      const witnessText = witnessRows.map((r) => r.trim()).filter(Boolean).join('\n\n')
      const { sources, errors: parseErrors } = prepareWitnessSources(witnessText)

      const all = sources
      if (all.length === 0)
        throw new Error('请至少粘贴一段签名结果（可用「交易补签」界面产出）')

      const check = validateWitnesses(draft, all, mustSignByList)
      setResult({ check, parseErrors, sourceCount: all.length })
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  const doSubmit = async () => {
    const finalHex = result?.check?.txHex
    if (!finalHex || !result?.check?.ok) return
    const ok = window.confirm(
      `确认提交这笔重组后的交易上链？\n\n交易 hash:\n${result.check.txId}\n\n提交后不可撤销。`
    )
    if (!ok) return
    setSubmitting(true)
    setError('')
    try {
      const r = await submitFinalTx(finalHex, changeAddr)
      setTxHash(r.txHash)
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setSubmitting(false)
    }
  }

  const check = result?.check
  // 零见证 ⇒ 没签任何东西，提交必失败（手续费/抵押输入需要 vkey 见证）。
  // 注意 mustSignBy 为空时 check.ok 恒为 true（没有"缺少"的项），所以必须单独挡。
  const unsigned = !!check && check.witnesses.length === 0
  const canSubmit = !!check?.ok && !unsigned

  return (
    <div>
      <div className="card">
        <h3>交易重组</h3>
        <p className="muted">
          把各钱包的签名结果汇总到同一笔交易上。重组只往 witness set 追加 vkey 见证，
          不改动交易 body，因此 txid 与草稿完全一致。校验要求 mustSignBy
          全部被覆盖（缺失或签名无效会禁用提交），多余见证只提示。
        </p>

        <div className="row" style={{ marginTop: 8 }}>
          <div style={{ flex: 2 }}>
            <CodeField
              label="交易 CBOR（未签名草稿；也可粘贴已部分签名的交易）"
              value={txHex}
              onChange={setTxHex}
              toJson={txToJsonObject}
              rows={4}
              placeholder="84a40081825820... （在其它标签页构建后会自动带入）"
              extra={
                <button
                  className="secondary"
                  style={{ marginTop: 6 }}
                  onClick={() => loadFromStore(true)}
                >
                  重新载入最近一次构建的交易
                </button>
              }
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 8 }}>
          <div>
            <label>changeAddr（提交与等待确认用）</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={changeAddr}
                onChange={(e) => setChangeAddr(e.target.value)}
                readOnly={!addrEditable}
                placeholder="addr_test1... / addr1..."
                style={!addrEditable ? { background: '#f1f2f6', color: '#636e72' } : undefined}
              />
              <CopyButton text={changeAddr} label="复制" />
              <button
                className="secondary copy-btn"
                onClick={() => setAddrEditable((v) => !v)}
                title={addrEditable ? '锁定后防止误改' : '地址由构建页带入，默认锁定'}
              >
                {addrEditable ? '锁定' : '编辑'}
              </button>
            </div>
            {!addrEditable && !changeAddr && (
              <p className="muted" style={{ margin: '4px 0 0' }}>
                尚未带入地址，点「编辑」手动填写。
              </p>
            )}
          </div>
          <RowList
            label="mustSignBy 地址（用于一一对应校验）"
            values={mustSignBy}
            onChange={setMustSignBy}
            placeholder="addr_test1... / addr1..."
            addLabel="添加签名地址"
          />
        </div>

        <div className="row" style={{ marginTop: 8 }}>
          <div style={{ flex: 2 }}>
            <RowList
              label="签名结果（每行一段 witness set CBOR）"
              values={witnessRows}
              onChange={setWitnessRows}
              toJson={witnessesToJsonObject}
              rows={3}
              placeholder="a10081825820..."
              addLabel="添加签名结果"
              hint={
                '每行也接受完整交易 CBOR、单条 vkeywitness，或 {"vkey","signature"} 形式的 JSON。' +
                '切到 JSON 可逐条查看各见证的公钥哈希/签名（与 mustSignBy 校验对应）。'
              }
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="primary" disabled={busy || !txHex} onClick={doRebuild}>
            {busy ? '重组中…' : '重组交易'}
          </button>
          <span className="muted" style={{ marginLeft: 12 }}>
            重组不会提交；校验通过后由「提交上链」按钮单独提交
          </span>
        </div>
      </div>

      {error && (
        <div className="card">
          <h3>重组失败</h3>
          <div className="err">{error}</div>
        </div>
      )}

      {result?.parseErrors?.length > 0 && (
        <div className="card">
          <h3>部分输入无法解析</h3>
          {result.parseErrors.map((p, i) => (
            <div key={i} className="err">
              ✗ {p.source}：{p.message}
            </div>
          ))}
        </div>
      )}

      {check && (
        <>
          <div className="card">
            <h3>重组概览</h3>
            <div className="kv">
              交易 hash（txId）：<span className="mono">{check.txId}</span>{' '}
              <CopyButton text={check.txId} label="复制" />
            </div>
            <div className="kv">参与重组的签名输入：{result.sourceCount} 段</div>
            <div className="kv">
              合并后的见证数：{check.witnesses.length}
              {check.ok ? (
                <span className="badge ok">校验通过</span>
              ) : (
                <span className="badge bad">校验未通过</span>
              )}
            </div>
          </div>

          <CoverageCard check={check} />

          {/* 签名不足：红字提示 + 导向补签界面；此时不显示提交按钮 ——
              未达签名门槛的交易提交必失败（phase-1 会烧掉 5 ADA collateral） */}
          {!canSubmit && (
            <div className="card">
              <div className="err">
                ✗ 签名不足，无法提交：
                {unsigned
                  ? '合并后没有任何见证，请检查签名结果输入'
                  : `还缺 ${check.missing.length} 个 mustSignBy 地址的签名`}
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="primary" onClick={() => goTo('cosign')}>
                  前往「交易补签」
                </button>
                <span className="muted" style={{ marginLeft: 12 }}>
                  补齐后回到本界面重新点「重组交易」
                </span>
              </div>
            </div>
          )}

          <TxViewer
            hex={check.txHex}
            title={canSubmit ? '交易内容（最终交易）' : '交易内容（部分重组预览）'}
            footer={
              // 覆盖完整才给提交按钮；不完整时上方已给补签入口
              canSubmit ? (
                <div style={{ marginTop: 12 }}>
                  <button className="primary" disabled={submitting} onClick={doSubmit}>
                    {submitting ? '提交中…' : '提交上链'}
                  </button>
                  {submitting && (
                    <span className="muted" style={{ marginLeft: 12 }}>
                      已提交，等待确认（最长约 100 秒）…
                    </span>
                  )}
                </div>
              ) : null
            }
          />
        </>
      )}

      {txHash && (
        <div className="card">
          <h3>提交成功</h3>
          <div className="ok">✓ 已上链</div>
          <div className="kv">
            交易 hash：<span className="mono">{txHash}</span> <CopyButton text={txHash} label="复制" />
          </div>
          <p className="muted">请勿重复提交。</p>
        </div>
      )}
    </div>
  )
}
