import { useState } from 'react'
import { getPkg } from '../sdk-bridge'
import { setAdminMultisig } from '../api/tx'
import { useBuildFlow } from '../build-flow'
import TxOptions from './TxOptions'
import RowList from './RowList'
import BuildResult from './BuildResult'

// 功能 3：设置 admin 多签参数（signatories + minNumSignatures）
export default function MultisigPanel({ onNavigate }) {
  const [kind, setKind] = useState('new')
  const [signatories, setSignatories] = useState([''])
  const [minNum, setMinNum] = useState('2')
  const [datumHex, setDatumHex] = useState('')
  const [datumError, setDatumError] = useState('')

  const flow = useBuildFlow('设置 admin 多签参数')

  const signatoryList = () => signatories.map((s) => s.trim()).filter(Boolean)

  // 用 AdminNFTHolderScript.genDatum 生成 datum hex（adminHolder 升级时复用）
  const genDatum = () => {
    setDatumError('')
    try {
      const mgr = getPkg(kind).contracts_mgr
      const datum = mgr.AdminNFTHolderScript.genDatum(
        signatoryList(),
        parseInt(minNum, 10)
      )
      setDatumHex(datum.to_hex())
    } catch (e) {
      setDatumError(String(e.message || e))
    }
  }

  const run = (opts) =>
    flow.run(opts, (o) =>
      setAdminMultisig(kind, signatoryList(), parseInt(minNum, 10), o)
    )

  return (
    <div>
      <div className="card">
        <h3>设置 Admin 多签参数（功能 3）</h3>
        <div className="row">
          <div>
            <label>SDK 版本</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="new">crosschain-sdk-new (1.5.0)</option>
              <option value="old">crosschain-sdk-old (v1.3.1)</option>
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <RowList
              label="Signatories（bech32 地址）"
              values={signatories}
              onChange={setSignatories}
              placeholder="addr_test1... / addr1..."
              addLabel="添加 signatory"
            />
          </div>
          <div>
            <label>minNumSignatures（最小签名数）</label>
            <input
              type="number"
              min="1"
              value={minNum}
              onChange={(e) => setMinNum(e.target.value)}
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div>
            <label>生成的 datum hex（adminHolder 升级时复用）</label>
            <textarea
              rows={2}
              value={datumHex}
              onChange={(e) => setDatumHex(e.target.value)}
              className="mono"
              placeholder="d8799f..."
            />
            <button className="secondary" style={{ marginTop: 6 }} onClick={genDatum}>
              生成 datum hex
            </button>
            {datumError && <div className="err">{datumError}</div>}
          </div>
        </div>
      </div>

      <TxOptions
        onRun={run}
        runLabel="构建设置多签交易"
        busy={flow.busy}
        disabled={signatoryList().length === 0 || !minNum}
      />
      <BuildResult built={flow.built} error={flow.error} onNavigate={onNavigate} />
    </div>
  )
}
