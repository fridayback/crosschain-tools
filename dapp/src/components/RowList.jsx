import { useRef, useState } from 'react'
import { selectNodeText } from '../clipboard'
import { CopyButton } from './TxViewer'

// RowList: 多个值的列表输入
//
// 替代「每行一个」的 textarea：一行一个输入框，配「添加一项」与每行「删除」。
// 好处是条数一目了然、能单独改/删某一项，也不会因为误按回车或粘贴带空行而错位。
//
// values 是数组（可能含空串）。调用方在使用时自行 trim + filter(Boolean)。
//
// 传了 toJson 时，标题行会多出字段级的 CBOR/JSON 切换与一键复制：
//   CBOR 视图 = 各行输入框（唯一可编辑处）
//   JSON 视图 = 整组内容的只读派生预览
// 做成字段级而非每行一份，是为了避免每行堆三个控件；单行仍可选中文本手动复制。
export default function RowList({
  label,
  values,
  onChange,
  placeholder = '',
  addLabel = '添加一项',
  hint,
  rows = 1, // 多行文本项（如长 hex）可调大
  toJson,
  canEdit = true, // false 时只读展示（用于「结果」这类不需编辑的列表）
}) {
  const [view, setView] = useState('cbor')
  const preRef = useRef(null)

  // 保持「至少一行」的不变量，避免出现没有任何输入框的死状态
  const list = values.length ? values : ['']
  const multiline = rows > 1
  const joined = list.map((r) => r.trim()).filter(Boolean).join('\n\n')

  let jsonText = ''
  let jsonError = ''
  if (toJson && view === 'json' && joined) {
    try {
      const out = toJson(joined)
      jsonText = typeof out === 'string' ? out : JSON.stringify(out, null, 2)
    } catch (e) {
      jsonError = String(e?.message || e)
    }
  }

  const setAt = (i, v) => {
    const next = [...list]
    next[i] = v
    onChange(next)
  }

  const removeAt = (i) => {
    const next = list.filter((_, idx) => idx !== i)
    onChange(next.length ? next : [''])
  }

  const add = () => onChange([...list, ''])

  return (
    <div>
      {/* 标题行：标签 + （可选）CBOR/JSON 切换与复制 + 新增按钮 ——
          新增按钮放在标题行而非列表末尾，避免每多一项就把按钮往下推 */}
      <div className="rowlist-head">
        <label>{label}</label>
        {canEdit && (
          <button
            className="secondary icon-btn"
            onClick={add}
            title={`${addLabel}（新增一行）`}
            aria-label={addLabel}
          >
            +
          </button>
        )}
        {toJson && (
          <>
            <span className="seg">
              <button className={view === 'cbor' ? 'active' : ''} onClick={() => setView('cbor')}>
                CBOR
              </button>
              <button className={view === 'json' ? 'active' : ''} onClick={() => setView('json')}>
                JSON
              </button>
            </span>
            <CopyButton
              text={view === 'cbor' ? joined : jsonText}
              label={view === 'cbor' ? '复制 CBOR' : '复制 JSON'}
              onFail={() => selectNodeText(preRef.current)}
            />
          </>
        )}
      </div>

      {toJson && view === 'json' ? (
        jsonError ? (
          <div className="err">无法转换为 JSON：{jsonError}</div>
        ) : (
          <pre ref={preRef}>{jsonText || '(空)'}</pre>
        )
      ) : (
        <>
          {list.map((v, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 6,
                alignItems: multiline ? 'flex-start' : 'center',
                marginBottom: 4,
              }}
            >
              {multiline ? (
                <textarea
                  rows={rows}
                  value={v}
                  onChange={(e) => setAt(i, e.target.value)}
                  placeholder={placeholder}
                  readOnly={!canEdit}
                  style={{ flex: 1, ...(canEdit ? null : { background: '#f1f2f6' }) }}
                />
              ) : (
                <input
                  value={v}
                  onChange={(e) => setAt(i, e.target.value)}
                  placeholder={placeholder}
                  readOnly={!canEdit}
                  style={{ flex: 1, ...(canEdit ? null : { background: '#f1f2f6' }) }}
                />
              )}
              {canEdit && (
                <button
                  className="secondary icon-btn"
                  onClick={() => removeAt(i)}
                  disabled={list.length === 1 && !v}
                  title="删除这一项"
                  aria-label="删除这一项"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {hint && (
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {hint}
        </p>
      )}
      {toJson && view === 'json' && (
        <p className="muted">JSON 为只读预览（由当前各行 CBOR 派生），如需编辑请切回 CBOR。</p>
      )}
    </div>
  )
}
