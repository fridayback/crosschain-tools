// query.js: 只读查询聚合（功能 5/6/7）
import { getSdk, getPkg, getOg, getGroupInfo, getAdminInfo, getScriptRefUtxo } from '../sdk-bridge'
import { buildContractRegistry, UTXO_CONTRACTS } from '../contract-registry'
import nftModuleNew from 'crosschain-sdk-new/nft-contract'
import nftModuleOld from 'crosschain-sdk-old/nft-contract'

const NFT_MODULES = { new: nftModuleNew, old: nftModuleOld }

// 功能 6：所有合约地址 + token policy
export async function getContracts(kind) {
  const pkg = getPkg(kind)
  const sdk = getSdk(kind)
  const prefix = sdk.ADDR_PREFIX
  const nft = NFT_MODULES[kind] || nftModuleNew
  return buildContractRegistry(pkg, nft, prefix)
}

// 功能 5：groupInfo + adminInfo（old/new 可对比）
export async function getOverview(kind) {
  const [group, admin] = await Promise.all([
    getGroupInfo(kind).catch((e) => ({ error: String(e.message || e) })),
    getAdminInfo(kind).catch((e) => ({ error: String(e.message || e) })),
  ])
  return { group, admin }
}

// 功能 5：所有合约 script ref utxo
export async function getScriptRefs(kind) {
  const registry = await getContracts(kind)
  const sdk = getSdk(kind)
  // 先取一次 scriptRefOwner 的 UTXO（SDK 缓存于 allScriptRefUtxo）
  await sdk.getScriptRefUtxo(registry[0]?.script)
  const results = []
  for (const c of registry) {
    try {
      const ref = await sdk.getScriptRefUtxo(c.script)
      results.push({ name: c.name, label: c.label, ref })
    } catch (e) {
      results.push({ name: c.name, label: c.label, error: String(e.message || e) })
    }
  }
  return results
}

// 功能 7：指定合约的 UTXO 详情（TreasuryCheck/MintCheck/NFTTreasuryCheck/NFTMintCheck/InboundCheck/OutboundHolder）
export async function getContractUtxos(kind, contractName) {
  if (!UTXO_CONTRACTS.includes(contractName))
    throw new Error(`不支持的 UTXO 合约: ${contractName}`)
  const registry = await getContracts(kind)
  const c = registry.find((x) => x.name === contractName)
  if (!c || !c.address) throw new Error(`合约无地址: ${contractName}`)
  const utxos = await getOg().getUtxo(c.address)
  return { contract: c, utxos }
}
