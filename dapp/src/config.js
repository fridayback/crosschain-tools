// 网络与公共参数配置
// dev 模式走 vite proxy（/cardano-* → wandevs），避免浏览器直连境外受限；
// 生产 build（import.meta.env.DEV=false）使用绝对 URL，浏览器需能访问 wandevs.org

export const NETWORKS = {
  mainnet: {
    label: 'Mainnet',
    isMainnet: true,
    ogmiosUrl: import.meta.env.DEV
      ? '/cardano-mainnet'
      : 'https://nodes.wandevs.org/cardano/',
    scriptRefOwner:
      'addr1qys3nr0s5wqz3gw2n9satl279ntzha2z92v4ewrknr234hzx8ugllqwa07adyqwz23j797tha446p0exqa8jjypyqzasq73gym',
  },
  testnet: {
    label: 'Testnet',
    isMainnet: false,
    ogmiosUrl: import.meta.env.DEV
      ? '/cardano-testnet'
      : 'https://nodes-testnet.wandevs.org/cardano/',
    scriptRefOwner:
      'addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd',
  },
}

// 链上固定金额（与 crosschain-tools 脚本一致）
export const TX_PARAMS = {
  collateralAmount: 5000000, // 5 ADA collateral
  parameterizedAmount: 2222221,
  parameterizedAmount2: 2222222,
}

// groupInfo datum 13 个参数的展示名（索引 = GroupNFT 常量值）
export const GROUP_INFO_PARAMS = [
  { index: 0, key: 'Version', label: '版本' },
  { index: 1, key: 'Admin', label: 'Admin 地址' },
  { index: 2, key: 'GPK', label: 'GPK 地址' },
  { index: 3, key: 'BalanceWorker', label: 'BalanceWorker 地址' },
  { index: 4, key: 'TreasuryCheckVH', label: 'TreasuryCheck 地址' },
  { index: 5, key: 'OracleWorker', label: 'OracleWorker 地址' },
  { index: 6, key: 'MintCheckVH', label: 'MintCheck 地址' },
  { index: 7, key: 'StkVh', label: 'Stake 地址' },
  { index: 8, key: 'StkCheckVh', label: 'StkCheck 地址' },
  { index: 9, key: 'NFTRefHolderVH', label: 'NFTRefHolder 地址' },
  { index: 10, key: 'NFTTreasuryCheckVH', label: 'NFTTreasuryCheck 地址' },
  { index: 11, key: 'NFTMintCheckVH', label: 'NFTMintCheck 地址' },
  { index: 12, key: 'OutboundHolderVH', label: 'OutboundHolder 地址' },
  { index: 13, key: 'InboundCheckVH', label: 'InboundCheck 地址' },
]
