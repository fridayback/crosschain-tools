import { useState } from 'react'
import { setAddress } from '../api/tx'
import { useBuildFlow } from '../build-flow'
import { SETTER_MAP } from '../contract-registry'
import TxOptions from './TxOptions'
import BuildResult from './BuildResult'

// 功能 1：设置新的地址参数（13 项）
export default function SetAddressPanel({ onNavigate }) {
  const [kind, setKind] = useState('new')
  const [paramKey, setParamKey] = useState('GPK')
  const [newValue, setNewValue] = useState('')

  const def = SETTER_MAP[paramKey]
  const flow = useBuildFlow('设置地址参数')

  const run = (opts) => flow.run(opts, (o) => setAddress(kind, paramKey, newValue, o))

  return (
    <div>
      <div className="card">
        <h3>设置地址参数（功能 1）</h3>
        <div className="row">
          <div>
            <label>SDK 版本</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="new">crosschain-sdk-new (1.5.0)</option>
              <option value="old">crosschain-sdk-old (v1.3.1)</option>
            </select>
          </div>
          <div>
            <label>参数</label>
            <select
              value={paramKey}
              onChange={(e) => setParamKey(e.target.value)}
            >
              {Object.entries(SETTER_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                  {v.note ? ' *' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>新地址（bech32）</label>
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="addr_test1... / addr1..."
            />
          </div>
        </div>
        {def?.note && <p className="muted">{def.note}</p>}
      </div>

      <TxOptions
        onRun={run}
        runLabel="构建设置交易"
        busy={flow.busy}
        disabled={!newValue}
      />
      <BuildResult built={flow.built} error={flow.error} onNavigate={onNavigate} />
    </div>
  )
}
