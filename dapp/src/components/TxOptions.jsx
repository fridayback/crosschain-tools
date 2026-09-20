import { useState } from 'react'
import RowList from './RowList'

// 公共交易参数表单：changeAddr / mustSignBy，外加「构建交易」按钮
//
// 这里**不签名也不提交**。构建只产出未签名草稿，签名在「交易补签」界面、
// 汇总与提交在「交易重组」界面 —— 所以本表单里没有私钥、也没有钱包连接。
//
// changeAddr 与 mustSignBy 必须留在这里：前者是交易构造的输入（手续费 UTXO 与
// 5 ADA collateral 的来源），后者参与合约的签名人校验，两者都会写进交易本身。
export default function TxOptions({
  defaultChangeAddr = '',
  onRun,
  runLabel = '构建交易',
  busy = false,
  disabled = false,
}) {
  const [changeAddr, setChangeAddr] = useState(defaultChangeAddr)
  // 列表型字段用数组（配 RowList 的新增/删除），使用时再 trim + 过滤空项
  const [mustSignBy, setMustSignBy] = useState([''])

  const params = {
    changeAddr,
    mustSignBy: mustSignBy.map((s) => s.trim()).filter(Boolean),
  }

  return (
    <div className="card">
      <h3>交易参数</h3>

      <div className="row">
        <div>
          <label>找零地址 changeAddr（需有恰好 5 ADA 且无资产的 collateral UTXO）</label>
          <input
            value={changeAddr}
            onChange={(e) => setChangeAddr(e.target.value)}
            placeholder="addr_test1... / addr1..."
          />
        </div>
        <RowList
          label="mustSignBy 地址（用于校验签名公钥是否一一对应）"
          values={mustSignBy}
          onChange={setMustSignBy}
          placeholder="addr_test1... / addr1..."
          addLabel="添加签名地址"
        />
      </div>

      {onRun && (
        <div style={{ marginTop: 12 }}>
          <button
            className="primary"
            disabled={busy || disabled || !changeAddr}
            onClick={() => onRun(params)}
          >
            {busy ? '构建中…' : runLabel}
          </button>
          <span className="muted" style={{ marginLeft: 12 }}>
            只构建未签名草稿；签名请到「交易补签」，汇总提交请到「交易重组」
          </span>
        </div>
      )}
    </div>
  )
}
