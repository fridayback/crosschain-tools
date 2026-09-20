// mustSignBy 一一对应校验的展示（交易补签 / 交易重组 / 构建结果都用）
export default function CoverageCard({ check }) {
  if (!check) return null
  return (
    <div className="card">
      <h3>
        签名校验
        {check.ok ? (
          <span className="badge ok">必须签名已全覆盖</span>
        ) : (
          <span className="badge bad">缺少签名</span>
        )}
      </h3>
      <table>
        <thead>
          <tr>
            <th>mustSignBy 地址</th>
            <th>公钥哈希</th>
            <th style={{ width: 90 }}>状态</th>
          </tr>
        </thead>
        <tbody>
          {check.required.map((r) => (
            <tr key={r.addr}>
              <td className="mono">{r.addr}</td>
              <td className="mono">{r.pkh}</td>
              <td>
                {r.ok ? <span className="ok">✓ 已签</span> : <span className="err">✗ 未签</span>}
              </td>
            </tr>
          ))}
          {check.required.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                未填写 mustSignBy，跳过一一对应校验
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {check.extra?.length > 0 && (
        <div className="kv">
          额外见证（不在 mustSignBy 中，仅提示）：{' '}
          {check.extra.map((w) => w.pkh.slice(0, 12) + '…').join(', ')}
        </div>
      )}
      {check.warnings?.map((w, i) => (
        <div key={i} className="warn">
          ⚠ {w}
        </div>
      ))}
      {check.errors?.map((e, i) => (
        <div key={i} className="err">
          ✗ {e}
        </div>
      ))}
    </div>
  )
}
