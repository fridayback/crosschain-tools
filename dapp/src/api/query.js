// query.js: 只读查询聚合（功能 5/6/7）
import { getSdk, getPkg, getOg, getGroupInfo, getAdminInfo, getScriptRefUtxo } from '../sdk-bridge'
import { buildContractRegistry, UTXO_CONTRACTS } from '../contract-registry'
import nftModuleNew from 'crosschain-sdk-new/nft-contract'
import nftModuleOld from 'crosschain-sdk-old/nft-contract'

const NFT_MODULES = { new: nftModuleNew, old: nftModuleOld }

// script ref UTXO 的默认 owner（SDK 实例上的 scriptRefOwnerAddr，
// 由 sdk-bridge.init 用 NETWORKS[].scriptRefOwner 构造）
export function getScriptRefOwner(kind) {
  try {
    return getSdk(kind).scriptRefOwnerAddr || ''
  } catch {
    return '' // 未 init 时静默返回空，由界面提示
  }
}

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

// ── CheckToken 管理：代币所在脚本地址与持有其代币的 UTXO ──

// 五类 check token 对应的「花费验证器」类（地址用它推；policy 是另一个脚本）
// 注意 InboundCheck 在 contracts_msg 下，不在 contracts / nft-contract
const tokenScriptOf = (pkg, nft, tokenType) => {
  switch (tokenType) {
    case 'TreasuryCheck':
      return pkg.contracts.TreasuryCheckScript
    case 'MintCheck':
      return pkg.contracts.MintCheckScript
    case 'NFTTreasuryCheck':
      return nft.NFTTreasuryCheckScript
    case 'NFTMintCheck':
      return nft.NFTMintCheckScript
    case 'InboundCheck':
      return pkg.contracts_msg.InboundCheckScript
    default:
      return null
  }
}

export const CHECK_TOKEN_TYPES = [
  'TreasuryCheck',
  'MintCheck',
  'NFTTreasuryCheck',
  'NFTMintCheck',
  'InboundCheck',
]

// 代币所在的脚本地址。
//
// 注意：stake credential 必须取**链上实时 groupInfo 的 StkVh**，不能用 contract-registry
// 里那份本地常量 —— StkVh 本身是 13 个可设置参数之一，链上改过之后本地常量就是过期的，
// 会推到一个没有 UTXO 的地址（表现为 burn 时报「max ... is 0」）。
export async function checkTokenAddress(kind, tokenType) {
  const pkg = getPkg(kind)
  const sdk = getSdk(kind)
  const nft = NFT_MODULES[kind] || nftModuleNew
  const cls = tokenScriptOf(pkg, nft, tokenType)
  if (!cls) throw new Error(`未知代币类型: ${tokenType}`)

  const { params } = await getGroupInfo(kind)
  const stakeHash = params[pkg.contracts_mgr.GroupNFT.StkVh]
  if (!stakeHash) throw new Error('groupInfo 中没有 StkVh，无法推导代币地址')
  return cls.address(stakeHash).to_bech32(sdk.ADDR_PREFIX)
}

// 该代币在链上的 UTXO（等价于 tools.js 的 getCheckTokenUtxo）
// burn 的「笔数」上限就是这个数组的长度
export async function getCheckTokenUtxos(kind, tokenType) {
  const address = await checkTokenAddress(kind, tokenType)
  const registry = await getContracts(kind)
  const c = registry.find((x) => x.name === tokenType)
  if (!c?.tokenId) throw new Error(`合约清单中没有该代币的 tokenId: ${tokenType}`)

  const utxos = await getOg().getUtxo(address)
  const mine = utxos.filter((o) => o.value.assets && o.value.assets[c.tokenId] * 1 > 0)
  return { address, tokenId: c.tokenId, utxos: mine }
}
