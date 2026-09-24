import { useEffect } from 'react'

// 极简弹窗。点遮罩或按 Esc 关闭；内容自己滚动，避免长内容把页面撑破。
export default function Modal({ title, onClose, children, width = 720 }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 16px',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // 点内容区不关闭
        style={{ background: '#f5f6fa', borderRadius: 8, width, maxWidth: '100%' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: '#2d3436',
            color: '#fff',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <strong style={{ flex: 1, fontSize: 15 }}>{title}</strong>
          <button className="secondary" onClick={onClose}>
            关闭
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  )
}
