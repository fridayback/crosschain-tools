import { useEffect, useState } from 'react'
import { sdkLabel } from '../sdk-versions'
import { mintCheckToken, burnCheckToken } from '../api/tx'
import { getCheckTokenUtxos, CHECK_TOKEN_TYPES } from '../api/query'
import { useBuildFlow } from '../build-flow'
import TxOptions from './TxOptions'
import BuildResult from './BuildResult'

const LABELS = {
  TreasuryCheck: 'TreasuryCheck',
  MintCheck: 'MintCheck',
  NFTTreasuryCheck: 'NFT TreasuryCheck',
  NFTMintCheck: 'NFT MintCheck',
  InboundCheck: 'InboundCheck',
}

// CheckToken 管理：四类 check token 的铸造与销毁
//
// 与其它写操作面板一样只构建未签名草稿，签名去「交易补签」、汇总提交去「交易重组」。
export default function CheckTokenPanel({ onNavigate }) {
  const [kind, setKind] = useState('new')
  const [op, setOp] = useState('mint') // mint | burn
  const [tokenType, setTokenType] = useState(CHECK_TOKEN_TYPES[0])
  const [amount, setAmount] = useState('1')

  // 销毁时要显示可销毁笔数（= 该代币地址下持有该 tokenId 的 UTXO 数）
  const [available, setAvailable] = useState(null)
  const [availableErr, setAvailableErr] = useState('')
  const [loadingAvail, setLoadingAvail] = useState(false)

  const flow = useBuildFlow('CheckToken 管理')

  const loadAvailable = async () => {
    setLoadingAvail(true)
    setAvailableErr('')
    try {
      const { utxos, address } = await getCheckTokenUtxos(kind, tokenType)
      setAvailable({ count: utxos.length, address })
    } catch (e) {
      setAvailable(null)
      setAvailableErr(String(e.message || e))
    } finally {
      setLoadingAvail(false)
    }
  }

  // 切到销毁、或换了 SDK 版本 / 代币类型时刷新可销毁笔数
  useEffect(() => {
    if (op !== 'burn') return
    loadAvailable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, kind, tokenType])

  const n = parseInt(amount, 10)
  const amountValid = Number.isInteger(n) && n >= 1
  const overLimit = op === 'burn' && available && amountValid && n > available.count
  const amountMsg = !amount
    ? ''
    : !amountValid
      ? '笔数必须是 ≥1 的整数'
      : overLimit
        ? `超出可销毁笔数（当前最多 ${available.count} 笔）`
        : ''

  const run = (opts) =>
    flow.run(opts, (o) =>
      op === 'mint'
        ? mintCheckToken(kind, tokenType, n, o)
        : burnCheckToken(kind, tokenType, n, o)
    )

  return (
    <div>
      <div className="card">
        <h3>CheckToken 管理</h3>
        <p className="muted">
          铸造或销毁 check token。本界面只构建未签名草稿，签名去「交易补签」，
          汇总与提交去「交易重组」。
        </p>

        <div className="row">
          <div>
            <label>操作</label>
            <div className="seg">
              <button className={op === 'mint' ? 'active' : ''} onClick={() => setOp('mint')}>
                铸造
              </button>
              <button className={op === 'burn' ? 'active' : ''} onClick={() => setOp('burn')}>
                销毁
              </button>
            </div>
          </div>
          <div>
            <label>SDK 版本</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="new">{sdkLabel('new')}</option>
              <option value="old">{sdkLabel('old')}</option>
            </select>
          </div>
          <div>
            <label>代币类型</label>
            <select value={tokenType} onChange={(e) => setTokenType(e.target.value)}>
              {CHECK_TOKEN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>笔数（每笔 1 枚）</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {amountMsg && <div className="err">{amountMsg}</div>}

        {op === 'burn' && (
          <div style={{ marginTop: 8 }}>
            {loadingAvail && <div className="muted">正在查询可销毁笔数…</div>}
            {!loadingAvail && available && (
              <div className="kv">
                当前可销毁 <strong>{available.count}</strong> 笔
                <span className="muted">（{available.address}）</span>{' '}
                <button className="secondary copy-btn" onClick={loadAvailable}>
                  刷新
                </button>
              </div>
            )}
            {!loadingAvail && available && available.count === 0 && (
              <div className="warn">该地址下没有可销毁的代币 UTXO。</div>
            )}
            {availableErr && (
              <div className="err">
                查询可销毁笔数失败：{availableErr}
                <button className="secondary copy-btn" style={{ marginLeft: 8 }} onClick={loadAvailable}>
                  重试
                </button>
              </div>
            )}
            <p className="muted" style={{ margin: '4px 0 0' }}>
              销毁会消耗该地址下的前 N 个代币 UTXO（顺序由节点返回决定，无法指定具体哪几笔）。
            </p>
          </div>
        )}
      </div>

      <TxOptions
        onRun={run}
        runLabel={op === 'mint' ? '构建铸造交易' : '构建销毁交易'}
        busy={flow.busy}
        disabled={!amount || !amountValid || overLimit}
      />
      <BuildResult built={flow.built} error={flow.error} onNavigate={onNavigate} />
    </div>
  )
}
