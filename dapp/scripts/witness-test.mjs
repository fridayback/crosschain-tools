// scripts/witness-test.mjs — src/witness.js 的纯 node 单测（无需网络 / 浏览器）
//
// 依赖仓库根的 node_modules/@emurgo/cardano-serialization-lib-nodejs
// （node 从 dapp/scripts 向上查找会命中它）。src/witness.js 刻意不依赖
// crosschain-sdk-new/utils，因此可以直接 import。
//
// 运行：node scripts/witness-test.mjs

import assert from 'node:assert/strict'
import * as C from '@emurgo/cardano-serialization-lib-nodejs'
import {
  normalizeHex,
  pkhOfAddress,
  witnessSetHexOfTx,
  extractWitnesses,
  parseWitnessInput,
  splitWitnessInputs,
  prepareWitnessSources,
  mergeWitnesses,
  validateWitnesses,
  privateKeyWitnessHex,
  txToJsonObject,
  witnessesToJsonObject,
  stripWitnessesHex,
} from '../src/witness.js'

let fail = 0
function t(name, fn) {
  try {
    fn()
    console.log('✓', name)
  } catch (e) {
    console.error('✗', name, '\n    ', e.message || e)
    fail++
  }
}

// ── 测试夹具 ─────────────────────────────────────
const skOf = (n) => C.PrivateKey.from_normal_bytes(new Uint8Array(32).fill(n))
const addrOf = (sk) =>
  C.EnterpriseAddress.new(0, C.Credential.from_keyhash(sk.to_public().hash()))
    .to_address()
    .to_bech32()

const skA = skOf(1)
const skB = skOf(2)
const skC = skOf(3)
const addrA = addrOf(skA)
const addrB = addrOf(skB)
const addrC = addrOf(skC)

// 合成一笔未签名交易（1 in / 1 out / fee）
function makeTx() {
  const inputs = C.TransactionInputs.new()
  inputs.add(C.TransactionInput.new(C.TransactionHash.from_hex('ab'.repeat(32)), 0))
  const outputs = C.TransactionOutputs.new()
  outputs.add(
    C.TransactionOutput.new(
      C.Address.from_bech32(addrA),
      C.Value.new(C.BigNum.from_str('1000000'))
    )
  )
  const body = C.TransactionBody.new(inputs, outputs, C.BigNum.from_str('170000'))
  return C.Transaction.new(body, C.TransactionWitnessSet.new())
}

// 用某把私钥对该交易 body 生成一个 witness set（模拟钱包 signTx 的返回）
function wsetOf(tx, sk) {
  const vks = C.Vkeywitnesses.new()
  vks.add(C.make_vkey_witness(C.hash_transaction(tx.body()), sk))
  const ws = C.TransactionWitnessSet.new()
  ws.set_vkeys(vks)
  return ws.to_hex()
}

// 对另一笔交易的 body 签名（用于「粘错签名」的负例）
function wsetForOtherTx(sk) {
  const inputs = C.TransactionInputs.new()
  inputs.add(C.TransactionInput.new(C.TransactionHash.from_hex('cd'.repeat(32)), 1))
  const outputs = C.TransactionOutputs.new()
  outputs.add(
    C.TransactionOutput.new(
      C.Address.from_bech32(addrA),
      C.Value.new(C.BigNum.from_str('2000000'))
    )
  )
  const body = C.TransactionBody.new(inputs, outputs, C.BigNum.from_str('180000'))
  const t2 = C.Transaction.new(body, C.TransactionWitnessSet.new())
  return wsetOf(t2, sk)
}

const tx = makeTx()
const txHex = tx.to_hex()
const txId = C.hash_transaction(tx.body()).to_hex()

// ── normalizeHex ────────────────────────────────
t('normalizeHex 去掉 0x 前缀与空白', () => {
  assert.equal(normalizeHex('  0xAABB \n cc '), 'AABBcc')
})

// ── pkhOfAddress ────────────────────────────────
t('pkhOfAddress 与私钥公钥哈希一致', () => {
  assert.equal(pkhOfAddress(addrA), skA.to_public().hash().to_hex())
})

t('pkhOfAddress 对脚本凭据地址抛错', () => {
  const scriptAddr = C.EnterpriseAddress.new(
    0,
    C.Credential.from_scripthash(C.ScriptHash.from_hex('11'.repeat(28)))
  )
    .to_address()
    .to_bech32()
  assert.throws(() => pkhOfAddress(scriptAddr), /脚本凭据地址/)
})

// ── extractWitnesses 守卫未签名草稿 ─────────────
t('未签名交易的 witness set 提取为空数组（vkeys() 为 undefined 不炸）', () => {
  assert.deepEqual(extractWitnesses(witnessSetHexOfTx(txHex)), [])
})

// ── mergeWitnesses ─────────────────────────────
t('合并单个见证：txId 不变、见证数为 1', () => {
  const r = mergeWitnesses(txHex, [wsetOf(tx, skA)])
  assert.equal(r.txId, txId)
  assert.equal(r.witnesses.length, 1)
  assert.equal(r.invalid.length, 0)
  assert.equal(C.hash_transaction(C.Transaction.from_hex(r.txHex).body()).to_hex(), txId)
})

t('合并两个见证：见证数为 2', () => {
  const r = mergeWitnesses(txHex, [wsetOf(tx, skA), wsetOf(tx, skB)])
  assert.equal(r.witnesses.length, 2)
  assert.deepEqual(
    r.witnesses.map((w) => w.pkh).sort(),
    [skA, skB].map((s) => s.to_public().hash().to_hex()).sort()
  )
})

t('重复见证被去重（同一把 key 贴两遍）', () => {
  const r = mergeWitnesses(txHex, [wsetOf(tx, skA), wsetOf(tx, skA)])
  assert.equal(r.witnesses.length, 1)
  assert.equal(r.duplicates.length, 1)
})

t('别的交易的签名被判为 invalid 且不进入结果', () => {
  const r = mergeWitnesses(txHex, [wsetForOtherTx(skA)])
  assert.equal(r.witnesses.length, 0)
  assert.equal(r.invalid.length, 1)
})

t('完整交易 CBOR 作为输入时自动提取其见证', () => {
  const signed = mergeWitnesses(txHex, [wsetOf(tx, skA)]).txHex
  const r = mergeWitnesses(txHex, [signed])
  assert.equal(r.witnesses.length, 1)
})

t('重建保留交易自带见证与 is_valid=false', () => {
  const ws = C.TransactionWitnessSet.from_hex(wsetOf(tx, skA))
  const t2 = C.Transaction.new(tx.body(), ws)
  t2.set_is_valid(false)
  const r = mergeWitnesses(t2.to_hex(), [wsetOf(tx, skB)])
  const back = C.Transaction.from_hex(r.txHex)
  assert.equal(back.is_valid(), false, 'is_valid 应被回填')
  assert.equal(extractWitnesses(witnessSetHexOfTx(r.txHex)).length, 2)
})

// ── validateWitnesses ──────────────────────────
t('校验：缺一个 mustSignBy ⇒ ok=false 且 missing 命中', () => {
  const v = validateWitnesses(txHex, [wsetOf(tx, skA)], [addrA, addrB])
  assert.equal(v.ok, false)
  assert.equal(v.missing.length, 1)
  assert.equal(v.missing[0].addr, addrB)
  assert.equal(v.required.filter((x) => x.ok).length, 1)
})

t('校验：全覆盖 ⇒ ok=true', () => {
  const v = validateWitnesses(txHex, [wsetOf(tx, skA), wsetOf(tx, skB)], [addrA, addrB])
  assert.equal(v.ok, true)
  assert.equal(v.missing.length, 0)
  assert.equal(v.errors.length, 0)
})

t('校验：多余见证（不在 mustSignBy）只警告不阻断', () => {
  const v = validateWitnesses(txHex, [wsetOf(tx, skA), wsetOf(tx, skC)], [addrA])
  assert.equal(v.ok, true)
  assert.equal(v.extra.length, 1)
  assert.equal(v.extra[0].pkh, skC.to_public().hash().to_hex())
  assert.ok(v.warnings.some((w) => w.includes('额外签名')))
})

t('校验：粘错交易的签名 ⇒ ok=false 且 invalid 命中', () => {
  const v = validateWitnesses(txHex, [wsetForOtherTx(skA)], [addrA])
  assert.equal(v.ok, false)
  assert.equal(v.invalid.length, 1)
  assert.ok(v.errors.some((e) => e.includes('签名校验失败')))
})

// ── privateKeyWitnessHex（重组面板的私钥补签）────
t('privateKeyWitnessHex 产出的见证能通过校验', () => {
  const sk = skOf(4)
  const addr = addrOf(sk)
  const wset = privateKeyWitnessHex(txHex, Buffer.from(new Uint8Array(32).fill(4)).toString('hex'))
  const v = validateWitnesses(txHex, [wset], [addr])
  assert.equal(v.ok, true)
  assert.equal(v.witnesses.length, 1)
  assert.equal(v.witnesses[0].pkh, sk.to_public().hash().to_hex())
})

t('privateKeyWitnessHex 与插件钱包签名可混合汇总', () => {
  const sk = skOf(4)
  const wset = privateKeyWitnessHex(txHex, Buffer.from(new Uint8Array(32).fill(4)).toString('hex'))
  const v = validateWitnesses(txHex, [wsetOf(tx, skA), wset], [addrA, addrOf(sk)])
  assert.equal(v.ok, true)
  assert.equal(v.witnesses.length, 2)
})

// ── parseWitnessInput 多格式 ────────────────────
t('parseWitnessInput 接受 witness set CBOR', () => {
  const hex = wsetOf(tx, skA)
  assert.equal(extractWitnesses(parseWitnessInput(hex)).length, 1)
})

t('parseWitnessInput 接受单条 vkeywitness CBOR', () => {
  const vw = C.make_vkey_witness(C.hash_transaction(tx.body()), skA)
  assert.equal(extractWitnesses(parseWitnessInput(vw.to_hex())).length, 1)
})

t('parseWitnessInput 接受 {"vkey","signature"} JSON', () => {
  const vw = C.make_vkey_witness(C.hash_transaction(tx.body()), skA)
  const json = JSON.stringify({ vkey: vw.vkey().to_hex(), signature: vw.signature().to_hex() })
  assert.equal(extractWitnesses(parseWitnessInput(json)).length, 1)
})

t('parseWitnessInput 接受完整交易 CBOR', () => {
  const signed = mergeWitnesses(txHex, [wsetOf(tx, skA)]).txHex
  assert.equal(extractWitnesses(parseWitnessInput(signed)).length, 1)
})

t('parseWitnessInput 对垃圾输入抛中文错误', () => {
  assert.throws(() => parseWitnessInput('zzzz'), /不是合法的 hex/)
  assert.throws(() => parseWitnessInput('aabbccdd'), /无法解析/)
})

// ── splitWitnessInputs / prepareWitnessSources ──
t('splitWitnessInputs 支持空行 / 一行一个 / --- 分隔', () => {
  const a = wsetOf(tx, skA)
  const b = wsetOf(tx, skB)
  assert.equal(splitWitnessInputs(`${a}\n\n${b}`).length, 2)
  assert.equal(splitWitnessInputs(`${a}\n${b}`).length, 2)
  assert.equal(splitWitnessInputs(`${a}\n---\n${b}`).length, 2)
})

t('prepareWitnessSources 汇总解析错误而不中断', () => {
  const { sources, errors } = prepareWitnessSources(`${wsetOf(tx, skA)}\n\nzzz`)
  assert.equal(sources.length, 1)
  assert.equal(errors.length, 1)
})

// ── stripWitnessesHex（钱包补签的兼容开关）────
t('stripWitnessesHex 剥掉见证但 txid 不变', () => {
  const signed = mergeWitnesses(txHex, [wsetOf(tx, skA)]).txHex
  const stripped = stripWitnessesHex(signed)
  assert.equal(extractWitnesses(witnessSetHexOfTx(stripped)).length, 0, '应无见证')
  assert.equal(
    C.hash_transaction(C.Transaction.from_hex(stripped).body()).to_hex(),
    txId,
    'body 不变 ⇒ txid 不变，钱包签名才对原交易有效'
  )
})

t('stripped 交易的签名合并回原交易后校验通过', () => {
  // 模拟：钱包对剥离版签名（body 相同），结果合并回带见证的原交易
  const signed = mergeWitnesses(txHex, [wsetOf(tx, skA)]).txHex
  const stripped = stripWitnessesHex(signed)
  const walletWset = wsetOf(C.Transaction.from_hex(stripped), skB)
  const v = validateWitnesses(signed, [walletWset], [addrA, addrB])
  assert.equal(v.ok, true)
  assert.equal(v.witnesses.length, 2, '原有见证 + 新签名都应保留')
})

// ── txToJsonObject / witnessesToJsonObject（UI 的 CBOR/JSON 切换）────
t('txToJsonObject 返回可序列化的对象', () => {
  const o = txToJsonObject(txHex)
  assert.equal(typeof o, 'object')
  assert.ok(o.body, 'CSL 的 to_json 应含 body')
  assert.doesNotThrow(() => JSON.stringify(o), '必须能 JSON.stringify（否则 UI 渲染会炸）')
})

t('txToJsonObject 对垃圾输入抛中文错误', () => {
  assert.throws(() => txToJsonObject(''), /请先填写交易 CBOR/)
  assert.throws(() => txToJsonObject('zz'), /不是合法 hex/)
  assert.throws(() => txToJsonObject('aabbccdd'), /无法解析为一笔交易/)
})

t('witnessesToJsonObject 展开逐条见证并标出来源', () => {
  const raw = `${wsetOf(tx, skA)}\n\n${wsetOf(tx, skB)}`
  const o = witnessesToJsonObject(raw)
  assert.equal(o.sourceCount, 2)
  assert.equal(o.witnessCount, 2)
  assert.deepEqual(
    o.witnesses.map((w) => w.publicKeyHash).sort(),
    [skA, skB].map((s) => s.to_public().hash().to_hex()).sort()
  )
  assert.deepEqual(
    o.witnesses.map((w) => w.source).sort(),
    ['第 1 段', '第 2 段']
  )
  assert.equal(o.parseErrors.length, 0)
  for (const w of o.witnesses) {
    assert.ok(w.vkey && w.signature, '每条见证都应带 vkey 与 signature')
  }
})

t('witnessesToJsonObject 汇总解析错误而不抛异常', () => {
  const o = witnessesToJsonObject(`${wsetOf(tx, skA)}\n\nzzz`)
  assert.equal(o.witnessCount, 1)
  assert.equal(o.parseErrors.length, 1)
})

t('witnessesToJsonObject 对空输入返回空结构', () => {
  const o = witnessesToJsonObject('')
  assert.equal(o.witnessCount, 0)
  assert.deepEqual(o.witnesses, [])
})

if (fail) {
  console.error(`\nFAIL: ${fail} 项异常`)
  process.exit(1)
}
console.log('\n✓ witness 单测全部通过')
