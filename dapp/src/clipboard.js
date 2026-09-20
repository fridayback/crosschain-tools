// clipboard.js: 复制到剪贴板（含非安全源回退）
// localhost 属于安全源，可直接用 navigator.clipboard；
// 但若通过局域网 IP 以 http 访问 dapp，navigator.clipboard 不可用，需回退 execCommand。

export async function copyText(text) {
  if (!text) return false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 落到下面的 execCommand 回退
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, ta.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// 兜底：选中元素文本，提示用户手动 Ctrl+C
export function selectNodeText(el) {
  if (!el) return
  try {
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  } catch {
    // 忽略：UI 已有「请手动复制」提示
  }
}
