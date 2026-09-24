import { useState } from 'react'
import { sdkLabel } from '../sdk-versions'
import { getPkg, getGroupInfo } from '../sdk-bridge'
import { upgradeGroupNFTHolder, upgradeAdminNFTHolder } from '../api/tx'
import { useBuildFlow } from '../build-flow'
import TxOptions from './TxOptions'
import BuildResult from './BuildResult'

// 功能 2：groupNftHolder 升级；功能 4：adminHolder 升级
export default function UpgradePanel({ onNavigate }) {
  const [kind, setKind] = useState('new')
  const [mode, setMode] = useState('group') // group | admin
  const [newHolder, setNewHolder] = useState('')
  const [newDatum, setNewDatum] = useState('')
  const [adminEditHex, setAdminEditHex] = useState('') // 从当前 groupInfo 生成的 datum（可改 Admin 字段）
  const [datumError, setDatumError] = useState('')

  const flow = useBuildFlow('Holder 升级')

  // 从链上当前 groupInfo 生成新 datum（默认不改任何字段，仅用于升级 holder）
  const loadCurrentGroupDatum = async () => {
    setDatumError('')
    try {
      const { params } = await getGroupInfo(kind)
      const mgr = getPkg(kind).contracts_mgr
      const datum = mgr.GroupNFT.genGroupInfoDatum(params)
      setNewDatum(datum.to_hex())
      setAdminEditHex(JSON.stringify(params))
    } catch (e) {
      setDatumError(String(e.message || e))
    }
  }

  // 基于编辑后的 params 重新生成 datum hex
  const applyAdminEdit = () => {
    setDatumError('')
    try {
      const params = JSON.parse(adminEditHex)
      const mgr = getPkg(kind).contracts_mgr
      const datum = mgr.GroupNFT.genGroupInfoDatum(params)
      setNewDatum(datum.to_hex())
    } catch (e) {
      setDatumError('params JSON 解析失败: ' + e.message)
    }
  }

  const run = (opts) =>
    flow.run(opts, (o) =>
      mode === 'group'
        ? upgradeGroupNFTHolder(kind, newHolder, newDatum, o)
        : upgradeAdminNFTHolder(kind, newHolder, newDatum, o)
    )

  return (
    <div>
      <div className="card">
        <h3>Holder 升级（功能 2 / 功能 4）</h3>
        <div className="row">
          <div>
            <label>SDK 版本</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="new">{sdkLabel('new')}</option>
              <option value="old">{sdkLabel('old')}</option>
            </select>
          </div>
          <div>
            <label>升级类型</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="group">groupNftHolder 升级（功能 2）</option>
              <option value="admin">adminHolder 升级（功能 4）</option>
            </select>
          </div>
          <div>
            <label>新 Holder 地址（bech32）</label>
            <input
              value={newHolder}
              onChange={(e) => setNewHolder(e.target.value)}
              placeholder="addr_test1... / addr1..."
            />
          </div>
        </div>

        {mode === 'group' && (
          <div className="row" style={{ marginTop: 8 }}>
            <div>
              <label>New Datum（PlutusData hex）</label>
              <textarea
                rows={2}
                value={newDatum}
                onChange={(e) => setNewDatum(e.target.value)}
                placeholder="d8799f...（可用下方按钮从链上当前 groupInfo 生成）"
              />
              <button
                className="secondary"
                style={{ marginTop: 6 }}
                onClick={loadCurrentGroupDatum}
              >
                从链上当前 groupInfo 生成 datum
              </button>
            </div>
          </div>
        )}
        {mode === 'group' && adminEditHex && (
          <div className="row" style={{ marginTop: 8 }}>
            <div>
              <label>
                groupInfo params（JSON，可改 Admin 等字段后再生成 datum —— 改 Admin
                需新 Admin holder 的 script hash hex）
              </label>
              <textarea
                rows={4}
                value={adminEditHex}
                onChange={(e) => setAdminEditHex(e.target.value)}
                className="mono"
              />
              <button
                className="secondary"
                style={{ marginTop: 6 }}
                onClick={applyAdminEdit}
              >
                由编辑后的 params 生成 datum hex
              </button>
            </div>
          </div>
        )}

        {mode === 'admin' && (
          <p className="muted" style={{ marginTop: 8 }}>
            adminHolder 升级的 newDatum 由新 admin holder 的 datum（signatories +
            minNumSignatures，PlutusData hex）填写；可用功能 3 的
            AdminNFTHolderScript.genDatum 生成（见多签面板说明）。
          </p>
        )}

        {datumError && <div className="err">{datumError}</div>}
      </div>

      <TxOptions
        onRun={run}
        runLabel="构建升级交易"
        busy={flow.busy}
        disabled={!newHolder || !newDatum}
      />
      <BuildResult built={flow.built} error={flow.error} onNavigate={onNavigate} />
    </div>
  )
}
