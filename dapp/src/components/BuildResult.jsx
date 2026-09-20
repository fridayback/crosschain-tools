import TxViewer, { CopyButton } from './TxViewer'

// 构建结果：未签名草稿 + 下一步引导
//
// 构建界面不签名也不提交（未签名的交易无法上链），所以这里给出通往
// 「交易补签」「交易重组」的入口，不让流程断在这一步。
export default function BuildResult({ built, error, onNavigate }) {
  if (!built && !error) return null

  return (
    <>
      {error && (
        <div className="card">
          <h3>构建失败</h3>
          <div className="err">{error}</div>
        </div>
      )}

      {built && (
        <>
          <div className="card">
            <h3>交易概览</h3>
            <div className="kv">
              交易 hash（txId）：<span className="mono">{built.txId}</span>{' '}
              <CopyButton text={built.txId} label="复制" />
            </div>
            <div className="kv">
              changeAddr：<span className="mono">{built.changeAddr}</span>
            </div>
            <div className="kv">
              mustSignBy：{built.mustSignBy?.length || 0} 个地址
              <span className="badge warn">尚未签名</span>
            </div>
            <p className="muted">
              这是未签名草稿，已带好 exUnits/redeemers，body 即终态 —— 谁签它、签几次，
              txid 都不会变。所有签名者必须对**同一份字节**签名，因此请用下面这份 CBOR。
            </p>
          </div>

          <TxViewer
            hex={built.draftHex}
            title="交易内容（未签名草稿）"
            footer={
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="primary" onClick={() => onNavigate?.('cosign')}>
                  前往「交易补签」
                </button>
                <button className="secondary" onClick={() => onNavigate?.('rebuild')}>
                  前往「交易重组」
                </button>
                <span className="muted" style={{ alignSelf: 'center' }}>
                  草稿已自动带入这两个界面，无需手动复制
                </span>
              </div>
            }
          />
        </>
      )}
    </>
  )
}
