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

// groupInfo 参数的展示名不再在这里维护：改为从 GroupNFT 静态常量派生
// （见 contract-registry.js 的 groupInfoParamNames），避免与 SDK 漂移。
