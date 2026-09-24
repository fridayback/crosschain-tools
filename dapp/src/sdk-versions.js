// SDK 版本号统一从 package.json 的依赖声明里取，避免界面硬编码漂移。
//
// 为什么不用「安装包自己的 version 字段」：两个 SDK 都是从 GitHub 按 tag 检出的
// （`contracts-sdk.git#1.5.1` / `#v1.5.0`），但 tarball 内的 package.json 里
// version 一直写着 `1.3.0`（上游没随 tag 更新）。读它比硬编码更误导。
//
// 这里取的是依赖声明里的 git ref —— 也就是「实际检出的是哪个版本」，
// 与 dapp/package.json 保持一致；升级依赖时界面自动跟着变。
import pkg from '../package.json'

export const SDK_PKG = {
  new: 'crosschain-sdk-new',
  old: 'crosschain-sdk-old',
}

// "https://github.com/fridayback/contracts-sdk.git#1.5.1" → "1.5.1"
function refOf(name) {
  const spec = pkg?.dependencies?.[name]
  if (typeof spec !== 'string' || !spec) return '?'
  const ref = spec.split('#').pop()
  return ref && ref !== spec ? ref : '?'
}

export const SDK_VERSIONS = {
  new: refOf(SDK_PKG.new),
  old: refOf(SDK_PKG.old),
}

// 下拉框与页头用的标签，例如 "crosschain-sdk-new (1.5.1)"
export function sdkLabel(kind) {
  return `${SDK_PKG[kind] || kind} (${SDK_VERSIONS[kind] || '?'})`
}
