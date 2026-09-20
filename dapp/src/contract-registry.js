// contract-registry: 全部合约清单（地址/policy/tokenId）+ 功能1设置方法映射 + 功能7 UTXO 合约映射
// 支持 old/new 两套 SDK（结构相同，实例化时传入对应 pkg）

// 地址计算辅助：需要 stake credential 的合约用 StoremanStackScript 的 script hash
function computeStakeHash(mgr) {
  return mgr.StoremanStackScript.script().hash().to_hex()
}

/**
 * 构建合约注册表
 * @param {object} pkg SDK 包（crosschain-sdk-old / crosschain-sdk-new）
 * @param {object} nftModule nft-contract 模块
 * @param {string} prefix 地址前缀（addr / addr_test）
 * @returns {Array<{name, group, address, policy, tokenId, script}>}
 */
export function buildContractRegistry(pkg, nftModule, prefix) {
  const mgr = pkg.contracts_mgr
  const ctr = pkg.contracts
  const msg = pkg.contracts_msg
  const stakeHash = computeStakeHash(mgr)
  const addrOf = (cls, useStake = true) =>
    cls.address(useStake ? stakeHash : undefined).to_bech32(prefix)

  const reg = [
    // ── 管理类（contracts_mgr）──
    {
      name: 'AdminNFTHolder',
      label: 'AdminNFT Holder',
      group: '管理',
      address: addrOf(mgr.AdminNFTHolderScript, false),
      policy: mgr.AdminNFT.policy_id(),
      tokenId: mgr.AdminNFT.tokenId(),
      script: mgr.AdminNFTHolderScript.script(),
    },
    {
      name: 'GroupInfoNFTHolder',
      label: 'GroupInfo NFT Holder',
      group: '管理',
      address: addrOf(mgr.GroupInfoNFTHolderScript, false),
      policy: mgr.GroupNFT.policy_id(),
      tokenId: mgr.GroupNFT.tokenId(),
      script: mgr.GroupInfoNFTHolderScript.script(),
    },
    {
      name: 'StoremanStack',
      label: 'Storeman Stack',
      group: '管理',
      address: addrOf(mgr.StoremanStackScript, false),
      script: mgr.StoremanStackScript.script(),
    },
    {
      name: 'StakeCheck',
      label: 'StakeCheck',
      group: '管理',
      address: addrOf(mgr.StakeCheckScript),
      script: mgr.StakeCheckScript.script(),
    },
    // ── 核心合约（contracts）──
    {
      name: 'Treasury',
      label: 'Treasury 金库',
      group: '核心',
      address: addrOf(ctr.TreasuryScript),
      script: ctr.TreasuryScript.script(),
    },
    {
      name: 'TreasuryCheck',
      label: 'TreasuryCheck',
      group: '核心',
      address: addrOf(ctr.TreasuryCheckScript),
      policy: ctr.TreasuryCheckTokenScript.policy_id(),
      tokenId: ctr.TreasuryCheckTokenScript.tokenId(),
      script: ctr.TreasuryCheckScript.script(),
    },
    {
      name: 'MintCheck',
      label: 'MintCheck',
      group: '核心',
      address: addrOf(ctr.MintCheckScript),
      policy: ctr.MintCheckTokenScript.policy_id(),
      tokenId: ctr.MintCheckTokenScript.tokenId(),
      script: ctr.MintCheckScript.script(),
    },
    {
      name: 'MappingToken',
      label: 'Mapping Token',
      group: '核心',
      policy: ctr.MappingTokenScript.policy_id(),
      script: ctr.MappingTokenScript.script(),
    },
    // ── NFT 合约（nft-contract）──
    {
      name: 'NFTRefHolder',
      label: 'NFT Ref Holder',
      group: 'NFT',
      address: addrOf(nftModule.NFTRefHolderScript, false),
      script: nftModule.NFTRefHolderScript.script(),
    },
    {
      name: 'NFTTreasury',
      label: 'NFT Treasury',
      group: 'NFT',
      address: addrOf(nftModule.NFTTreasuryScript),
      script: nftModule.NFTTreasuryScript.script(),
    },
    {
      name: 'NFTTreasuryCheck',
      label: 'NFT TreasuryCheck',
      group: 'NFT',
      address: addrOf(nftModule.NFTTreasuryCheckScript),
      policy: nftModule.NFTTreasuryCheckTokenScript.policy_id(),
      tokenId: nftModule.NFTTreasuryCheckTokenScript.tokenId(),
      script: nftModule.NFTTreasuryCheckScript.script(),
    },
    {
      name: 'NFTMintCheck',
      label: 'NFT MintCheck',
      group: 'NFT',
      address: addrOf(nftModule.NFTMintCheckScript),
      policy: nftModule.NFTMintCheckTokenScript.policy_id(),
      tokenId: nftModule.NFTMintCheckTokenScript.tokenId(),
      script: nftModule.NFTMintCheckScript.script(),
    },
    {
      name: 'NFTMappingToken',
      label: 'NFT Mapping Token',
      group: 'NFT',
      policy: nftModule.NFTMappingTokenScript.policy_id(),
      script: nftModule.NFTMappingTokenScript.script(),
    },
    // ── 跨链消息（contracts_msg）──
    {
      name: 'OutboundHolder',
      label: 'Outbound Holder',
      group: '消息',
      address: addrOf(msg.OutboundHolderScript),
      script: msg.OutboundHolderScript.script(),
    },
    {
      name: 'OutboundToken',
      label: 'Outbound Token',
      group: '消息',
      policy: msg.OutboundTokenScript.policy_id(),
      tokenId: msg.OutboundTokenScript.tokenId(),
      script: msg.OutboundTokenScript.script(),
    },
    {
      name: 'InboundCheck',
      label: 'Inbound Check',
      group: '消息',
      address: addrOf(msg.InboundCheckScript),
      policy: msg.InboundCheckTokenScript.policy_id(),
      tokenId: msg.InboundCheckTokenScript.tokenId(),
      script: msg.InboundCheckScript.script(),
    },
    {
      name: 'InboundToken',
      label: 'Inbound Token',
      group: '消息',
      policy: msg.InboundTokenScript.policy_id(),
      // tokenId(tokeNameHex) 需传参（static tokenName 被注释，实际名 'InboundTokenCoin'）
      tokenId: msg.InboundTokenScript.tokenId(
        Buffer.from('InboundTokenCoin', 'ascii').toString('hex')
      ),
      script: msg.InboundTokenScript.script(),
    },
  ]
  return reg
}

// ── 功能 1：13 个地址参数 → 设置方法映射 ──────────────
// method: ContractSdk 高层方法；direct: 需直调 GroupInfoNFTHolderScript 静态方法（无高层封装）
export const SETTER_MAP = {
  GPK: { method: 'switchGroup', direct: true, label: 'GPK' },
  BalanceWorker: { method: 'setBalanceWorker', label: 'BalanceWorker' },
  TreasuryCheckVH: { method: 'setTreasuryCheckVH', label: 'TreasuryCheck' },
  OracleWorker: { method: 'setOracleWorker', label: 'OracleWorker' },
  MintCheckVH: { method: 'setMintCheckVH', label: 'MintCheck' },
  StkVh: { method: 'setStakeVH', direct: true, label: 'Stake' },
  StkCheckVh: { method: 'setStakeCheckVH', label: 'StkCheck' },
  NFTRefHolderVH: { method: 'setNftRefHolder', label: 'NFTRefHolder' },
  NFTTreasuryCheckVH: { method: 'setNFTTreasuryCheckVH', label: 'NFTTreasuryCheck' },
  NFTMintCheckVH: { method: 'setNFTMintCheckVH', label: 'NFTMintCheck' },
  InboundCheckVH: { method: 'setInboundCheckVH', label: 'InboundCheck' },
  OutboundHolderVH: { method: 'setOutboundTokenHolder', label: 'OutboundHolder' },
  // Admin：SDK 无独立 setter（updateAdmin 注释掉），通过 group holder 升级/validator 处理
  Admin: { method: null, direct: true, label: 'Admin', note: 'SDK 无独立 setAdmin；需通过 GroupInfoNFTHolderScript.validator(action=1) 或升级流程' },
}

// ── 功能 7：UTXO 可查询合约（6 个）──
export const UTXO_CONTRACTS = [
  'TreasuryCheck',
  'MintCheck',
  'NFTTreasuryCheck',
  'NFTMintCheck',
  'InboundCheck',
  'OutboundHolder',
]
