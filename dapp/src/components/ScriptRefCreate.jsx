import { useState } from 'react'
import { createScriptRefUtxo } from '../api/tx'
import { getScriptRefOwner } from '../api/query'
import { useBuildFlow } from '../build-flow'
import BuildResult from './BuildResult'
import { CopyButton } from './TxViewer'

// 创建 script reference UTXO 的弹窗内容。
//
// 与其它写操作面板一致：只构建未签名草稿 → 交易补签 → 交易重组。
// owner 默认取 SDK 的 scriptRefOwnerAddr（可在界面上看到/修改）。
// scriptInfo 由调用方从合约清单取出，用于构建前核对脚本。
export default function ScriptRefCreate({ kind, contract, scriptInfo, onNavigate, onClose }) {
  const defaultOwner = getScriptRefOwner(kind)
  const [ownerAddr, setOwnerAddr] = useState(defaultOwner)
  const [changeAddr, setChangeAddr] = useState('')
  const [useDefaultOwner, setUseDefaultOwner] = useState(true)

  const flow = useBuildFlow('创建 Script Ref UTXO')

  const run = () =>
    flow.run({ changeAddr }, () =>
      createScriptRefUtxo(kind, contract.name, ownerAddr, { changeAddr })
    )

  return (
    <div>
      <div className="card">
        <h3>创建 Script Ref UTXO</h3>
        <p className="muted">
          把 <span className="mono">{contract.label}</span> 的脚本作为引用附在一个新输出上，
          以后交易就能引用它而不必在每个交易里内嵌脚本。这只是「引用」脚本、不执行脚本，
          因此不需要 collateral，也不需要 mustSignBy。
        </p>

        <div className="row">
          <div>
            <label>合约（脚本来源）</label>
            <input value={`${contract.label}（${contract.name}）`} readOnly
              style={{ background: '#f1f2f6', color: '#636e72' }} />
          </div>
          <div style={{ flex: 2 }}>
            <label>脚本 hash（构建前请核对）</label>
            {scriptInfo ? (
              <>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    value={scriptInfo.hash}
                    readOnly
                    className="mono"
                    style={{ background: '#f1f2f6', color: '#2d3436' }}
                  />
                  <CopyButton text={scriptInfo.hash} label="复制 hash" />
                </div>
                <div className="kv" style={{ marginTop: 4 }}>
                  {scriptInfo.version} · {scriptInfo.bytes} 字节
                </div>
                <div className="kv">
                  该脚本对应的合约地址：<span className="mono">{scriptInfo.address || '—'}</span>
                </div>
              </>
            ) : (
              <div className="err">读不到脚本（合约清单里没有该条目，或 SDK 未 init）</div>
            )}
          </div>
          <div>
            <label>owner 地址（接收该 UTXO）</label>
            <input
              value={ownerAddr}
              onChange={(e) => {
                setOwnerAddr(e.target.value)
                setUseDefaultOwner(false)
              }}
              placeholder="addr_test1... / addr1..."
              readOnly={useDefaultOwner}
              style={useDefaultOwner ? { background: '#f1f2f6', color: '#636e72' } : undefined}
            />
            <div style={{ marginTop: 6 }}>
              {useDefaultOwner ? (
                <button className="secondary copy-btn" onClick={() => setUseDefaultOwner(false)}>
                  改为自定义
                </button>
              ) : (
                <button
                  className="secondary copy-btn"
                  onClick={() => {
                    setOwnerAddr(defaultOwner)
                    setUseDefaultOwner(true)
                  }}
                >
                  恢复默认（scriptRefOwnerAddr）
                </button>
              )}
            </div>
            {!defaultOwner && (
              <p className="warn" style={{ margin: '4px 0 0' }}>
                未能从 SDK 读到 scriptRefOwnerAddr（是否已连接网络？），请手动填写 owner。
              </p>
            )}
          </div>
          <div>
            <label>changeAddr（手续费与找零来源）</label>
            <input
              value={changeAddr}
              onChange={(e) => setChangeAddr(e.target.value)}
              placeholder="addr_test1... / addr1..."
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            className="primary"
            disabled={flow.busy || !changeAddr || !ownerAddr || !scriptInfo}
            onClick={run}
          >
            {flow.busy ? '构建中…' : '构建交易'}
          </button>
          <span className="muted" style={{ marginLeft: 12 }}>
            只构建未签名草稿；签名请到「交易补签」，汇总提交请到「交易重组」
          </span>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          构建后 script 内容就固定在这个引用 UTXO 里了 —— 请先核对上面的 hash 是预期的那份脚本。
        </p>
      </div>

      <BuildResult
        built={flow.built}
        error={flow.error}
        onNavigate={(id) => {
          onClose?.()
          onNavigate?.(id)
        }}
      />
    </div>
  )
}
