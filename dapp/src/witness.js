// witness.js: 见证（witness set）解析 / 合并 / mustSignBy 校验
//
// 本模块只依赖 CSL：不 import sdk-bridge，也不 import crosschain-sdk-new/utils
// （node ESM 不解析该包的无扩展名子路径），
// 这样 scripts/witness-test.mjs 能在纯 node 下直接 import 做单测。
//
// 注意：必须 `import * as`。csl-wrapper.js 只有 `export * from '..._bg.js'`，
// 而 bg.js 没有 default export，默认导入在运行时是 undefined。

import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs'

export const normalizeHex = (s) =>
  String(s || '')
    .trim()
    .replace(/^0x/i, '')
    .replace(/\s+/g, '')

const isHex = (s) => s.length > 0 && s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s)

export function hexToBytes(h) {
  const s = normalizeHex(h)
  if (!isHex(s)) throw new Error('不是合法的 hex')
  const out = new Uint8Array(s.length >> 1)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16)
  return out
}

// 解析交易 hex，失败时给中文错误（面板用来区分「hex 不合法」与「不是交易」）
export function parseTxOrThrow(txHex) {
  const hex = normalizeHex(txHex)
  if (!hex) throw new Error('请先填写交易 CBOR')
  if (!isHex(hex)) throw new Error('交易 CBOR 不是合法 hex')
  try {
    return CardanoWasm.Transaction.from_hex(hex)
  } catch {
    throw new Error('交易 CBOR 无法解析为一笔交易')
  }
}

// 剥掉 witness set（保留 body 与 aux）。
// 用于「部分钱包拒绝带已有见证的交易」：body 不变 ⇒ txid 不变 ⇒
// 钱包对剥离版的签名，对原交易同样有效，拿回来合并即可。
export function stripWitnessesHex(txHex) {
  const tx = parseTxOrThrow(txHex)
  const out = CardanoWasm.Transaction.new(
    tx.body(),
    CardanoWasm.TransactionWitnessSet.new(),
    tx.auxiliary_data()
  )
  try {
    if (!tx.is_valid()) out.set_is_valid(false)
  } catch {
    // 忽略：个别 CSL 版本无此方法
  }
  return out.to_hex()
}

// 交易 hex → JSON 对象（供 UI 的 CBOR/JSON 切换用）
export function txToJsonObject(txHex) {
  const text = parseTxOrThrow(txHex).to_json()
  try {
    return JSON.parse(text)
  } catch {
    return text // CSL 偶尔给出非严格 JSON，原样交回
  }
}

// 签名结果输入 → JSON 对象：把每段 witness set 展开成逐条见证
// 比 CSL 的 TransactionWitnessSet.to_json() 更可读，且直接对应 mustSignBy 校验用的公钥哈希
export function witnessesToJsonObject(rawText) {
  const { sources, errors } = prepareWitnessSources(rawText)
  const witnesses = []
  for (const { hex, source } of sources) {
    for (const w of extractWitnesses(hex)) {
      witnesses.push({
        source,
        publicKeyHash: w.pkh,
        vkey: w.vkeyHex,
        signature: w.sigHex,
      })
    }
  }
  return {
    sourceCount: sources.length,
    witnessCount: witnesses.length,
    witnesses,
    parseErrors: errors,
  }
}

// 用裸私钥对交易补签，返回只含该见证的 witness set hex
// （重组面板的「用私钥补签」：运维方自己也持有某把 admin 私钥时用）
export function privateKeyWitnessHex(txHex, skHex) {
  const tx = parseTxOrThrow(txHex)
  const sk = CardanoWasm.PrivateKey.from_normal_bytes(hexToBytes(skHex))
  const vw = CardanoWasm.make_vkey_witness(CardanoWasm.hash_transaction(tx.body()), sk)
  const vks = CardanoWasm.Vkeywitnesses.new()
  vks.add(vw)
  const ws = CardanoWasm.TransactionWitnessSet.new()
  ws.set_vkeys(vks)
  return ws.to_hex()
}

// 地址 → payment 公钥哈希。与 SDK 的 utils.addressToPkhOrScriptHash 同语义，
// 此处内联实现以避免 node 端解析失败。
export function pkhOfAddress(addrStr) {
  const addr = CardanoWasm.Address.from_bech32(String(addrStr || '').trim())
  const base =
    CardanoWasm.BaseAddress.from_address(addr) ||
    CardanoWasm.EnterpriseAddress.from_address(addr)
  if (!base || !base.payment_cred()) throw new Error(`不支持的地址类型: ${addrStr}`)
  const cred = base.payment_cred()
  if (cred.kind() !== CardanoWasm.CredKind.Key) {
    throw new Error(`不支持脚本凭据地址（SDK 会抛 not supports script address）: ${addrStr}`)
  }
  return cred.to_keyhash().to_hex()
}

// 提取交易里的 witness set hex（无 witness set 时返回空集合的 hex）
export function witnessSetHexOfTx(txHex) {
  const ws = CardanoWasm.Transaction.from_hex(normalizeHex(txHex)).witness_set()
  return ws ? ws.to_hex() : CardanoWasm.TransactionWitnessSet.new().to_hex()
}

// witness set hex → 见证描述列表
// 未签名草稿的 vkeys() 返回 undefined（已核实），必须守卫
export function extractWitnesses(wsetHex) {
  const out = []
  let ws
  try {
    ws = CardanoWasm.TransactionWitnessSet.from_hex(normalizeHex(wsetHex))
  } catch {
    return out
  }
  const vks = ws.vkeys()
  if (!vks) return out
  for (let i = 0; i < vks.len(); i++) {
    const w = vks.get(i)
    const pub = w.vkey().public_key()
    out.push({
      pkh: pub.hash().to_hex(),
      vkeyHex: pub.to_hex(),
      sigHex: w.signature().to_hex(),
      witnessHex: w.to_hex(),
    })
  }
  return out
}

// vkey 的三种常见形态 → PublicKey
//  - bech32（SDK ogmios-utils2.signFn 的返回形状）：ed25519_pk1...
//  - raw 公钥 hex：64 个 hex 字符
//  - CBOR 包过的 Vkey hex：5820 + 32 字节（Vkeywitness.vkey().to_hex() 的形状）
function publicKeyOf(str) {
  const s = String(str || '').trim()
  if (/^ed25519_pk/i.test(s)) return CardanoWasm.PublicKey.from_bech32(s)
  const hex = normalizeHex(s)
  if (hex.length === 64) return CardanoWasm.PublicKey.from_hex(hex)
  return CardanoWasm.Vkey.from_hex(hex).public_key()
}

// 用 {vkey, signature} 组装一个只含单条见证的 witness set
function singleWitnessSetHex(vkeyStr, signatureStr) {
  const vw = CardanoWasm.Vkeywitness.new(
    CardanoWasm.Vkey.new(publicKeyOf(vkeyStr)),
    CardanoWasm.Ed25519Signature.from_hex(normalizeHex(signatureStr))
  )
  const vks = CardanoWasm.Vkeywitnesses.new()
  vks.add(vw)
  const ws = CardanoWasm.TransactionWitnessSet.new()
  ws.set_vkeys(vks)
  return ws.to_hex()
}

// 单个输入块 → 一个或多个 witness set hex
// 兼容：witness set CBOR / 单条 vkeywitness CBOR / 完整交易 CBOR / {"vkey","signature"} JSON
export function parseWitnessInput(rawText) {
  const trimmed = String(rawText || '').trim()
  if (!trimmed) throw new Error('空输入')

  if (trimmed.startsWith('{')) {
    let obj
    try {
      obj = JSON.parse(trimmed)
    } catch (e) {
      throw new Error('JSON 解析失败: ' + e.message)
    }
    if (typeof obj.witnessSet === 'string') return parseWitnessInput(obj.witnessSet)
    if (typeof obj.witnessSetHex === 'string') return parseWitnessInput(obj.witnessSetHex)
    if (typeof obj.vkey === 'string' && typeof obj.signature === 'string') {
      return singleWitnessSetHex(obj.vkey, obj.signature)
    }
    throw new Error('无法识别的 JSON：需要 {vkey, signature} 或 {witnessSet}')
  }

  const hex = normalizeHex(trimmed)
  if (!isHex(hex)) throw new Error('不是合法的 hex（含非 hex 字符或长度为奇数）')

  try {
    return CardanoWasm.TransactionWitnessSet.from_hex(hex).to_hex()
  } catch {
    // 继续尝试其它形状
  }
  try {
    const vw = CardanoWasm.Vkeywitness.from_hex(hex)
    const ws = CardanoWasm.TransactionWitnessSet.new()
    const vks = CardanoWasm.Vkeywitnesses.new()
    vks.add(vw)
    ws.set_vkeys(vks)
    return ws.to_hex()
  } catch {
    // 继续尝试其它形状
  }
  try {
    return witnessSetHexOfTx(hex)
  } catch {
    throw new Error('无法解析：既不是 witness set / 单条见证，也不是完整交易 CBOR')
  }
}

// textarea 文本 → 多个输入块。按空行或 `---` 切；若某块的每一行都是合法 hex，则按行切
// （用户常一行一个签名）。
export function splitWitnessInputs(rawText) {
  const blocks = String(rawText || '')
    .split(/\n\s*\n|\n-{3,}\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const out = []
  for (const b of blocks) {
    const lines = b
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length > 1 && lines.every((l) => isHex(normalizeHex(l)))) out.push(...lines)
    else out.push(b)
  }
  return out
}

// 解析整段签名结果输入 → { sources, errors }
export function prepareWitnessSources(rawText) {
  const sources = []
  const errors = []
  const blocks = splitWitnessInputs(rawText)
  blocks.forEach((b, i) => {
    const label = `第 ${i + 1} 段`
    try {
      sources.push({ hex: parseWitnessInput(b), source: label })
    } catch (e) {
      errors.push({ source: label, message: String(e.message || e) })
    }
  })
  return { sources, errors }
}

const isZeroSig = (hex) => /^0+$/.test(hex)

// 把 witnessSetHexList 里的见证合并进 txHex。
// - 交易自带的见证原样保留（重建不得丢签名）
// - 按公钥哈希去重（重复 key 会被账本拒绝，去重是必须的，不是优化）
// - 每个新见证都做密码学校验：签名必须对本交易 body hash 有效（挡「别的交易的签名」）
export function mergeWitnesses(txHex, witnessSetHexList = []) {
  const draft = CardanoWasm.Transaction.from_hex(normalizeHex(txHex))
  const bodyHash = CardanoWasm.hash_transaction(draft.body())
  const bodyHashBytes = bodyHash.to_bytes()

  const ws0 = draft.witness_set()
  const ws = ws0
    ? CardanoWasm.TransactionWitnessSet.from_bytes(ws0.to_bytes())
    : CardanoWasm.TransactionWitnessSet.new()

  const out = CardanoWasm.Vkeywitnesses.new()
  const seen = new Map()
  const preexisting = []
  const duplicates = []
  const invalid = []
  const zeroSig = []

  // 交易自带：原样保留，只登记 pkh（不做校验，避免重建时丢掉已有签名）
  for (const w of extractWitnesses(ws.to_hex())) {
    if (seen.has(w.pkh)) continue
    seen.set(w.pkh, { ...w, source: '交易自带' })
    preexisting.push(w.pkh)
    out.add(CardanoWasm.Vkeywitness.from_hex(w.witnessHex))
  }

  const take = (w, source) => {
    if (isZeroSig(w.sigHex)) {
      zeroSig.push({ ...w, source })
      return
    }
    if (seen.has(w.pkh)) {
      duplicates.push({ ...w, source, firstSource: seen.get(w.pkh).source })
      return
    }
    let ok = false
    try {
      ok = CardanoWasm.PublicKey.from_hex(w.vkeyHex).verify(
        bodyHashBytes,
        CardanoWasm.Ed25519Signature.from_hex(w.sigHex)
      )
    } catch {
      ok = false
    }
    if (!ok) {
      invalid.push({ ...w, source })
      return
    }
    seen.set(w.pkh, { ...w, source })
    out.add(CardanoWasm.Vkeywitness.from_hex(w.witnessHex))
  }

  // 兼容两种入参：witness set hex 字符串数组，或 {hex, source} 数组（prepareWitnessSources 的返回）
  const items = (witnessSetHexList || []).map((it, i) =>
    typeof it === 'string'
      ? { hex: it, source: `输入 ${i + 1}` }
      : { hex: it?.hex, source: it?.source || `输入 ${i + 1}` }
  )
  for (const { hex, source } of items) {
    // 逐项容错归一化：入参可能是 witness set / 单条见证 / 完整交易 CBOR
    let wsetHex = hex
    try {
      wsetHex = parseWitnessInput(hex)
    } catch {
      // 归一化失败则按原样尝试（extractWitnesses 内部还会兜一层）
    }
    for (const w of extractWitnesses(wsetHex)) take(w, source)
  }

  ws.set_vkeys(out)
  const tx = CardanoWasm.Transaction.new(draft.body(), ws, draft.auxiliary_data())
  // Transaction.new 默认 is_valid=true，草稿为 false 时需回填
  try {
    if (!draft.is_valid()) tx.set_is_valid(false)
  } catch {
    // 忽略：个别 CSL 版本无此方法
  }

  return {
    txHex: tx.to_hex(),
    witnesses: [...seen.values()],
    preexisting,
    duplicates,
    invalid,
    zeroSig,
    txId: bodyHash.to_hex(),
  }
}

// mustSignBy 一一对应校验
// 严格度（已与用户确认）：mustSignBy 必须全覆盖，缺失/签名无效 ⇒ 阻断（ok=false）；
// 多余见证（如 changeAddr 的 key）只警告。
export function validateWitnesses(txHex, witnessSetHexList, mustSignByAddrs = []) {
  const must = []
  const badAddrs = []
  const seenAddr = new Map()

  for (const raw of mustSignByAddrs) {
    const addr = String(raw || '').trim()
    if (!addr) continue
    try {
      const pkh = pkhOfAddress(addr)
      must.push({ addr, pkh })
      seenAddr.set(pkh, (seenAddr.get(pkh) || 0) + 1)
    } catch (e) {
      badAddrs.push({ addr, reason: String(e.message || e) })
    }
  }

  const merged = mergeWitnesses(txHex, witnessSetHexList)
  const have = new Set(merged.witnesses.map((w) => w.pkh))
  const mustPkh = new Set(must.map((m) => m.pkh))

  const required = must.map((m) => ({ ...m, ok: have.has(m.pkh) }))
  const missing = required.filter((m) => !m.ok)
  const extra = merged.witnesses.filter((w) => !mustPkh.has(w.pkh))
  const mustDup = [...seenAddr.entries()].filter(([, n]) => n > 1).map(([pkh, n]) => ({ pkh, n }))

  const warnings = []
  if (extra.length)
    warnings.push(
      `有 ${extra.length} 个额外签名不在 mustSignBy 中（通常是 changeAddr 的 key），不阻塞：` +
        extra.map((w) => w.pkh.slice(0, 12) + '…').join(', ')
    )
  if (merged.duplicates.length)
    warnings.push(`重复签名 ${merged.duplicates.length} 个，已自动去重`)
  if (merged.zeroSig.length)
    warnings.push(`忽略 ${merged.zeroSig.length} 个全零占位签名（该签名者仍视为未签）`)
  if (mustDup.length)
    warnings.push(`mustSignBy 中有重复公钥（同一 key 的不同地址），只需一个签名`)

  const errors = []
  for (const b of badAddrs) errors.push(`mustSignBy 地址不可用：${b.reason}`)
  for (const w of merged.invalid)
    errors.push(
      `签名校验失败（可能是其它交易的签名，或交易 CBOR 不一致）：${w.pkh.slice(0, 12)}…（来自${w.source}）`
    )
  for (const m of missing) errors.push(`缺少签名：${m.addr}`)

  const ok = missing.length === 0 && merged.invalid.length === 0 && badAddrs.length === 0

  return {
    ok,
    txHex: merged.txHex,
    txId: merged.txId,
    witnesses: merged.witnesses,
    required,
    missing,
    extra,
    duplicates: merged.duplicates,
    invalid: merged.invalid,
    zeroSig: merged.zeroSig,
    badAddrs,
    mustDup,
    warnings,
    errors,
  }
}
