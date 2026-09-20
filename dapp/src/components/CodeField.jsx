import { useRef, useState } from 'react'
import { selectNodeText } from '../clipboard'
import { CopyButton } from './TxViewer'

// 带 CBOR / JSON 切换 + 一键复制的输入框
//
//   CBOR 视图 = 可编辑 textarea（真正的内容源，唯一可写的地方）
//   JSON 视图 = 只读预览，由 toJson 从当前内容派生
//
// 之所以不做成「JSON 也可编辑」：这里的 JSON 是派生出来的可读视图
// （例如把 witness set 展开成逐条见证），它不是回路格式，无法可靠地反解回 CBOR。
export default function CodeField({
  label,
  value,
  onChange,
  toJson,
  placeholder = '',
  rows = 4,
  extra,
  disabled = false,
  hint,
}) {
  const [view, setView] = useState('cbor')
  const preRef = useRef(null)

  // JSON 视图下按需计算；值一改（切回 CBOR 编辑后再切回）自然重算，不存在过期缓存
  const isEmpty = !String(value || '').trim()
  let jsonText = ''
  let jsonError = ''
  if (view === 'json' && !isEmpty) {
    try {
      const out = toJson(value)
      jsonText = typeof out === 'string' ? out : JSON.stringify(out, null, 2)
    } catch (e) {
      jsonError = String(e?.message || e)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
        <label style={{ margin: 0, flex: 1 }}>{label}</label>
        <span className="seg">
          <button className={view === 'cbor' ? 'active' : ''} onClick={() => setView('cbor')}>
            CBOR
          </button>
          <button className={view === 'json' ? 'active' : ''} onClick={() => setView('json')}>
            JSON
          </button>
        </span>
        <CopyButton
          text={view === 'cbor' ? value : jsonText}
          label={view === 'cbor' ? '复制 CBOR' : '复制 JSON'}
          onFail={() => selectNodeText(preRef.current)}
        />
      </div>

      {view === 'cbor' ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : jsonError && !isEmpty ? (
        <div className="err">无法转换为 JSON：{jsonError}</div>
      ) : (
        <pre ref={preRef}>{isEmpty ? '(空)' : jsonText}</pre>
      )}

      {extra}
      {hint && <p className="muted">{hint}</p>}
      {view === 'json' && (
        <p className="muted">JSON 为只读预览（由当前 CBOR 派生），如需编辑请切回 CBOR。</p>
      )}
    </div>
  )
}
