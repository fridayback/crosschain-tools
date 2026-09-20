import { useRef, useState } from 'react'
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs'
import { copyText, selectNodeText } from '../clipboard'

// 一键复制按钮：失败时（非安全源且 execCommand 也不可用）回调 onFail 让调用方选中文本
export function CopyButton({ text, label = '复制', onFail }) {
  const [state, setState] = useState('idle') // idle | ok | fail

  const click = async () => {
    const ok = await copyText(text)
    if (!ok && onFail) onFail()
    setState(ok ? 'ok' : 'fail')
    setTimeout(() => setState('idle'), 2500)
  }

  return (
    <button className="secondary copy-btn" onClick={click} disabled={!text}>
      {state === 'ok' ? '✓ 已复制' : state === 'fail' ? '请手动复制' : label}
    </button>
  )
}

// 交易 / 数据的 CBOR ↔ JSON 双视图，带一键复制
// hex: 交易 CBOR hex；json 由本组件按需从 hex 懒算（大交易 to_json 会阻塞主线程）
export default function TxViewer({ hex, title = '交易内容', extra, footer, defaultView = 'cbor' }) {
  const [view, setView] = useState(defaultView)
  const [jsonCache, setJsonCache] = useState({ hex: null, text: null })
  const preRef = useRef(null)

  const showJson = () => {
    if (jsonCache.hex !== hex) {
      let text
      try {
        text = CardanoWasm.Transaction.from_hex(hex).to_json()
      } catch {
        text = '' // CSL 对个别交易 to_json 会抛，降级为提示
      }
      setJsonCache({ hex, text })
    }
    setView('json')
  }

  const json = jsonCache.hex === hex ? jsonCache.text : null
  const jsonFailed = view === 'json' && !json && hex
  const text = view === 'cbor' ? hex : json

  return (
    <div className="card">
      <h3>
        {title}
        <span className="seg" style={{ marginLeft: 12, verticalAlign: 'middle' }}>
          <button className={view === 'cbor' ? 'active' : ''} onClick={() => setView('cbor')}>
            CBOR
          </button>
          <button className={view === 'json' ? 'active' : ''} onClick={showJson}>
            JSON
          </button>
        </span>
        <span style={{ float: 'right' }}>
          <CopyButton
            text={text}
            label={view === 'cbor' ? '复制 CBOR' : '复制 JSON'}
            onFail={() => selectNodeText(preRef.current)}
          />
        </span>
      </h3>
      {extra}
      {jsonFailed ? (
        <p className="warn">该交易无法转换为 JSON（CSL to_json 失败），请切换到 CBOR 查看。</p>
      ) : (
        <pre ref={preRef}>{text || '(空)'}</pre>
      )}
      {footer}
    </div>
  )
}
