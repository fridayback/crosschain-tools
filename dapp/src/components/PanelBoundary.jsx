import { Component } from 'react'

// 单个标签页面板的错误边界。
//
// 为什么必须有：App.jsx 让面板**常驻挂载**（首次访问挂载，之后用 display:none 隐藏），
// 好处是切页不丢状态，代价是——任何一个面板在 render 期抛错都会冒泡到根，
// 把**所有标签页**一起打成白屏。加上边界后，错误被关在出错的那个标签页里，
// 其余标签页照常可用。
//
// 真实案例：groupInfo 的 params[14] 被 SDK 解码成对象后裸插值进 JSX，
// React 抛 "Objects are not valid as a React child"，导致整站白屏。
export default class PanelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 打出面板名与组件栈，便于定位（浏览器 console 里能看到是哪一块坏的）
    console.error(
      `[PanelBoundary] 面板「${this.props.name}」渲染失败：`,
      error,
      info?.componentStack
    )
  }

  // 重试会重新挂载子组件 —— 出错面板自身的 state 在崩溃时已随卸载丢失，
  // 所以只要原因不是持续性的（例如接口恢复了），重试就能恢复。
  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="card">
        <h3>「{this.props.name}」渲染失败</h3>
        <div className="err">{String(error?.message || error)}</div>
        <p className="muted">
          该标签页已停止渲染，<strong>其它标签页不受影响</strong>。
          详细信息（含组件栈）已打印到浏览器 console。修好原因后点「重试」重新渲染。
        </p>
        <button className="primary" onClick={this.reset}>
          重试
        </button>
      </div>
    )
  }
}
