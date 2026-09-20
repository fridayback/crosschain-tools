import { useEffect, useRef, useState } from 'react'
import { useTxStore, addStoredWitness } from '../tx-store'
import {
  normalizeHex,
  privateKeyWitnessHex,
  witnessesToJsonObject,
  validateWitnesses,
  txToJsonObject,
  stripWitnessesHex,
} from '../witness'
import { signTxWithWallet, useWallet } from '../wallet'
import RowList from './RowList'
import CodeField from './CodeField'
import WalletConnect from './WalletConnect'
import CoverageCard from './CoverageCard'

// 交易补签：对一笔已构建（可能已被别人部分签名）的交易追加签名。
//
// 与「交易重组」的分工：
//   交易补签 = 产出签名（私钥 / 插件钱包），输出一段 witness set
//   交易重组 = 汇总多方签名、校验 mustSignBy 一一对应、提交上链
//
// 补签结果会在「待补签交易与最近一次构建的完全相同」时自动同步到交易重组界面。
export default function CosignPanel({ network, onNavigate }) {
  const store = useTxStore()
  const wallet = useWallet()

  const [txHex, setTxHex] = useState('')
  const [mustSignBy, setMustSignBy] = useState([''])
  const [privKeys, setPrivKeys] = useState([''])
  const [results, setResults] = useState([]) // 已产出的 witness set CBOR
  const [method, setMethod] = useState('keys') // 'keys' | 'wallet' —— 一次只用一种
  const [stripExisting, setStripExisting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const lastTxKey = useRef('')

  // 从 store 带入待补签交易与 mustSignBy；换交易时清空已有补签结果
  useEffect(() => {
    const base = store.draftHex || store.txHex
    if (!base && !store.ts) return
    if (base && base !== lastTxKey.current) {
      lastTxKey.current = base
      setTxHex(base)
      setMustSignBy(store.mustSignBy?.length ? [...store.mustSignBy] : [''])
      setResults([])
      setError('')
      setNotice('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ts])

  const mustSignByList = mustSignBy.map((s) => s.trim()).filter(Boolean)
  const privKeyList = privKeys.map((s) => s.trim()).filter(Boolean)
  const finalizedTx = normalizeHex(txHex)
  // 只有补签的就是最近一次构建的那笔交易，结果才应该自动汇入重组界面
  const sameAsStore =
    !!finalizedTx && finalizedTx === normalizeHex(store.draftHex || store.txHex)

  const check = finalizedTx ? validateWitnesses(finalizedTx, results, mustSignByList) : null

  // 钱包要能为交易里的手续费/抵押输入签名，否则多数钱包直接拒签
  const walletAddrMismatch =
    wallet.connected && !!store.changeAddr && !!wallet.address && wallet.address !== store.changeAddr

  const pushResult = (hex, label) => {
    setResults((cur) => (cur.includes(hex) ? cur : [...cur, hex]))
    if (sameAsStore) {
      addStoredWitness(hex)
      setNotice(`${label}完成，已同步到「交易重组」界面。`)
    } else {
      setNotice(`${label}完成。该交易与最近一次构建的不同，请手动复制结果到「交易重组」界面。`)
    }
  }

  // ── 私钥补签 ──────────────────────────────────
  const cosignWithKeys = () => {
    setError('')
    setNotice('')
    try {
      if (!finalizedTx) throw new Error('请先填写待补签的交易 CBOR')
      if (!privKeyList.length) throw new Error('请至少填写一把私钥')
      for (const sk of privKeyList) pushResult(privateKeyWitnessHex(finalizedTx, sk), '私钥补签')
    } catch (e) {
      setError(String(e?.message || e))
    }
  }

  // ── 插件钱包补签 ──────────────────────────────
  const cosignWithWallet = async () => {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (!finalizedTx) throw new Error('请先填写待补签的交易 CBOR')
      if (!wallet.connected) throw new Error('请先连接插件钱包')
      // 剥掉见证只影响「发给钱包的那一份」：body 未变，签名对原交易照样有效，
      // 结果仍合并回带全部见证的原交易
      const forWallet = stripExisting ? stripWitnessesHex(finalizedTx) : finalizedTx
      const hex = await signTxWithWallet(forWallet)
      pushResult(hex, '钱包补签')
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="card">
        <h3>交易补签</h3>
        <p className="muted">
          对一笔交易追加签名，产出一段 witness set。给别的运维方补签、或自己拿私钥补签都用这里。
          汇总多方签名与提交上链请到「交易重组」界面。
        </p>

        <div className="row" style={{ marginTop: 8 }}>
          <div style={{ flex: 2 }}>
            <CodeField
              label="待补签交易 CBOR（未签名草稿，或已被部分签名的交易）"
              value={txHex}
              onChange={setTxHex}
              toJson={txToJsonObject}
              rows={4}
              placeholder="84a40081825820... （在其它标签页构建后会自动带入）"
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: 8 }}>
          <RowList
            label="mustSignBy 地址（用于显示签名覆盖情况）"
            values={mustSignBy}
            onChange={setMustSignBy}
            placeholder="addr_test1... / addr1..."
            addLabel="添加签名地址"
          />
        </div>
      </div>

      <div className="card">
        <h3>补签方式</h3>
        <p className="muted">一笔签名只会用其中一种方式，切换即换用另一种。</p>
        <div className="seg">
          <button className={method === 'keys' ? 'active' : ''} onClick={() => setMethod('keys')}>
            私钥补签
          </button>
          <button
            className={method === 'wallet' ? 'active' : ''}
            onClick={() => setMethod('wallet')}
          >
            插件钱包补签
          </button>
        </div>

        {method === 'keys' ? (
          <div style={{ marginTop: 8 }}>
            <div className="row">
              <RowList
                label="签名私钥（仅内存使用，不落盘）"
                values={privKeys}
                onChange={setPrivKeys}
                placeholder="hex 私钥"
                addLabel="添加私钥"
                rows={2}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="primary" disabled={busy || !txHex} onClick={cosignWithKeys}>
                用私钥补签
              </button>
              <span className="muted" style={{ marginLeft: 12 }}>
                每把私钥产出一段见证，追加到下方补签结果
              </span>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <WalletConnect
              network={network}
              note="钱包将对上方交易使用 partialSign 签名，只签钱包自己的 key，不要求交易已完整签名。"
            />
            {walletAddrMismatch && (
              <div className="warn" style={{ marginTop: 8 }}>
                钱包地址与这笔交易的 changeAddr 不一致：钱包需要为手续费/抵押输入签名，
                地址不匹配时多数钱包会拒绝签名。
                <br />
                <span className="mono">changeAddr = {store.changeAddr || '(未知)'}</span>
              </div>
            )}
            <div className="checkbox">
              <input
                type="checkbox"
                id="stripExisting"
                checked={stripExisting}
                onChange={(e) => setStripExisting(e.target.checked)}
              />
              <label htmlFor="stripExisting" style={{ margin: 0 }}>
                发送给钱包前剥离已有见证（部分钱包不接受带见证的交易；交易本身不变，签名仍有效）
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                className="primary"
                disabled={busy || !txHex || !wallet.connected}
                onClick={cosignWithWallet}
              >
                {busy ? '签名中…' : '用插件钱包补签'}
              </button>
              {!wallet.connected && (
                <span className="muted" style={{ marginLeft: 12 }}>
                  请先连接插件钱包
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="card">
          <h3>补签失败</h3>
          <div className="err">{error}</div>
        </div>
      )}

      {notice && <div className="card"><div className="ok">✓ {notice}</div></div>}

      {results.length > 0 && (
        <div className="card">
          <h3>补签结果</h3>
          <RowList
            label="每行一段 witness set（可复制到「交易重组」界面）"
            values={results}
            onChange={setResults}
            toJson={witnessesToJsonObject}
            rows={3}
            canEdit={false}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="primary" onClick={() => onNavigate?.('rebuild')}>
              前往「交易重组」
            </button>
            <button
              className="secondary"
              onClick={() => {
                setResults([])
                setNotice('')
              }}
            >
              清空补签结果
            </button>
          </div>
        </div>
      )}

      {check && <CoverageCard check={check} />}
    </div>
  )
}
