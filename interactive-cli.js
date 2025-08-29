#!/usr/bin/env node

/*
 * @Author: liulin blue-sky-dl5@163.com
 * @Date: 2025-08-29 17:20:00
 * @Description: 交互式跨链合约调用CLI工具
 */

const readline = require('readline');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const ogmiosUtils = require("crosschain-sdk-1-2/ogmios-utils2");
const sdk12 = require("crosschain-sdk-1-2");
const contractsMgr = sdk12.contracts_mgr;
const contracts = sdk12.contracts;
const nftContracts = require("crosschain-sdk-1-2/nft-contract");

// 进度提示工具函数
function showProgress(message) {
  console.log(`⏳ ${message}...`);
}

function showSuccess(message) {
  console.log(`✅ ${message}`);
}

function showError(message) {
  console.error(`❌ ${message}`);
}

function showWarning(message) {
  console.log(`⚠️ ${message}`);
}

// 配置信息（硬编码，类似tools.js）
const config = {
  isMainnet: true,
  payPrvKeyNext: '9b160ba482e38697c5631df832cbc2f5a9c41d9a588b2fa11dc7c370cf02058a',
  payPrvKey: 'cbc623254ca1eb30d8cb21b2ef04381372ff24529a74e4b5117d1e3bbb0f0188',
  scriptRefOwnerAddr: 'addr1qys3nr0s5wqz3gw2n9satl279ntzha2z92v4ewrknr234hzx8ugllqwa07adyqwz23j797tha446p0exqa8jjypyqzasq73gym',
  admin: 'addr1q8jqrqz0t2vzy5yvl88wtyjgurvhwauw0sqpe698mq04p0ham3clyk6mg6gctwsfuc8hsgqdt0s9laxl585uwu3xvx2s2pglww',
  signatories: [
    'addr1q8jqrqz0t2vzy5yvl88wtyjgurvhwauw0sqpe698mq04p0ham3clyk6mg6gctwsfuc8hsgqdt0s9laxl585uwu3xvx2s2pglww',
    'addr1q874rzy65qmpcrnqy7t202jhzc5l02tjkt78j3w5ynnwcgwzf22nn7mhf3gs3vfs6uy4pvu3e4j3r0gvuljpe8g6anfsx4lrwf',
    'addr1qywyax7rjsrfj0x2nzt3p552xefw4x9yjjy9cf9z4vhemty2tpvzm5r6rz4f2xqemk7xtq9z4l44ag6hhwan8rx9tu6qsyjuxk',
    'addr1q8lmw6r5u2jteggnps6065qae2puy7k2zympxrrkuggnv2cshkm9yf7clw3jxwsxksuhk7kxndt5uj7uj5dxdvu8837s0emer6',
    'addr1qx74f8gt7nffpswyrgsawc3rxjrckr38l7vadpvgl65pum53nhvjg3ct4dm2t94xd43ndqy5wvt5u90pvwq94xh95ejq8p35ya'
  ],
  mustSignBy: [
    'addr1q8jqrqz0t2vzy5yvl88wtyjgurvhwauw0sqpe698mq04p0ham3clyk6mg6gctwsfuc8hsgqdt0s9laxl585uwu3xvx2s2pglww',
    'addr1q874rzy65qmpcrnqy7t202jhzc5l02tjkt78j3w5ynnwcgwzf22nn7mhf3gs3vfs6uy4pvu3e4j3r0gvuljpe8g6anfsx4lrwf',
    'addr1q8lmw6r5u2jteggnps6065qae2puy7k2zympxrrkuggnv2cshkm9yf7clw3jxwsxksuhk7kxndt5uj7uj5dxdvu8837s0emer6'
  ],
  collateralAmount: 5000000,
  parameterizedAmount: 2222221,
  parameterizedAmount2: 2222222
};

let sdkNew;
let protocolParamsGlobal;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 签名函数
const signFn = undefined;
// const signFn = async hash => {
//   return ogmiosUtils.signFn(config.payPrvKey, hash);
// };

const signFnNext = async hash => {
  return ogmiosUtils.signFn(config.payPrvKeyNext, hash);
};

// 工具函数
async function getUtxoForFee() {
  showProgress('正在获取UTXO信息');
  let utxos = await ogmiosUtils.getUtxo(config.admin);
  utxos = utxos.filter(o => {
    return (o.value.coins * 1 != config.collateralAmount && 
            o.value.coins * 1 != config.parameterizedAmount && 
            o.value.coins * 1 != config.parameterizedAmount2);
  });
  showSuccess('UTXO信息获取完成');
  return utxos;
}

async function tryGetCollateralUtxo() {
  showProgress('正在查找抵押UTXO');
  let utxos = await ogmiosUtils.getUtxo(config.admin);
  utxos = utxos.filter(o => {
    return (Object.keys(o.value.assets).length <= 0) && (o.value.coins * 1 == config.collateralAmount);
  });
  if (utxos.length <= 0) {
    showError('未找到抵押UTXO');
    throw new Error('No collateral UTXO found');
  }
  showSuccess('抵押UTXO查找完成');
  return utxos[0];
}

async function getGroupInfo() {
  showProgress('正在获取组信息');
  const groupInfoTokenUtxo = await sdkNew.getGroupInfoNft();
  const groupInfo = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoTokenUtxo.datum);
  showSuccess('组信息获取完成');
  return groupInfo;
}

async function getAdminInfo() {
  showProgress('正在获取管理员信息');
  const adminNftUtxo = await sdkNew.getAdminNft();
  const adminInfo = contractsMgr.AdminNFTHolderScript.getSignatoriesInfoFromDatum(adminNftUtxo.datum);
  showSuccess('管理员信息获取完成');
  return adminInfo;
}

async function submitAndWaitConfirmed(signedTx) {
  // showProgress('正在添加签名');
  // signedTx = await sdkNew.addSignature(signedTx, signFn);
  // console.log('Transaction:', signedTx.to_json());
  
  // showProgress('正在评估交易');
  // const ret = await ogmiosUtils.evaluateTx(signedTx);
  // console.log('Evaluation result:', ret);
  
  // showProgress('正在提交交易到区块链');
  // const txHash = await ogmiosUtils.submitTx(signedTx);
  // showSuccess(`交易已提交，哈希: ${txHash}`);
  
  // showProgress('等待交易确认（这可能需要几分钟）');
  // const o = await ogmiosUtils.waitTxConfirmed(config.admin, txHash);
  // showSuccess('交易已确认！');
  console.log(`Transaction: ${signedTx.to_json()}`)
  console.log(`Transaction: ${signedTx.to_hex()}`);
  // return o;
}

// 显示菜单
function showMenu() {
  console.log('\n=== 跨链合约交互工具 ===');
  console.log('1. 显示当前配置信息');
  console.log('2. 显示管理员信息');
  console.log('3. 显示组信息');
  console.log('4. 设置管理员');
  console.log('5. 设置Oracle Worker');
  console.log('6. 设置Treasury Check VH');
  console.log('7. 设置Mint Check VH');
  console.log('8. 设置NFT Treasury Check VH');
  console.log('9. 设置NFT Mint Check VH');
  console.log('10. 铸造Treasury Check代币');
  console.log('11. 铸造Mint Check代币');
  console.log('12. 铸造NFT Treasury Check代币');
  console.log('13. 铸造NFT Mint Check代币');
  console.log('14. 销毁Treasury Check代币');
  console.log('15. 销毁Mint Check代币');
  console.log('16. 升级Group NFT Holder');
  console.log('0. 退出');
  rl.question('请选择操作 (0-16): ', handleMenuInput);
}

// 处理菜单输入
function handleMenuInput(input) {
  const choice = parseInt(input);
  switch (choice) {
    case 1:
      showConfig();
      break;
    case 2:
      showAdminInfo();
      break;
    case 3:
      showGroupInfo();
      break;
    case 4:
      setAdmin();
      break;
    case 5:
      setOracleWorker();
      break;
    case 6:
      setTreasuryCheckVH();
      break;
    case 7:
      setMintCheckVH();
      break;
    case 8:
      setNFTTreasuryCheckVH();
      break;
    case 9:
      setNFTMintCheckVH();
      break;
    case 10:
      mintTreasuryCheckToken();
      break;
    case 11:
      mintMintCheckToken();
      break;
    case 12:
      mintNFTTreasuryCheckToken();
      break;
    case 13:
      mintNFTMintCheckToken();
      break;
    case 14:
      burnTreasuryCheckToken();
      break;
    case 15:
      burnMintCheckToken();
      break;
    case 16:
      upgradeGroupNFTHolder();
      break;
    case 0:
      console.log('再见！');
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('无效选择，请重新输入。');
      showMenu();
      break;
  }
}

// 具体功能实现
async function showConfig() {
  console.log('\n当前配置:');
  console.log('网络:', config.isMainnet ? '主网' : '测试网');
  console.log('管理员地址:', config.admin);
  console.log('签名者列表:', config.signatories);
  console.log('必须签名地址:', config.mustSignBy);
  showMenu();
}

async function showAdminInfo() {
  try {
    const adminInfo = await getAdminInfo();
    console.log('\n管理员信息:', JSON.stringify(adminInfo, null, 2));
  } catch (error) {
    console.error('获取管理员信息失败:', error);
  }
  showMenu();
}

async function showGroupInfo() {
  try {
    const groupInfo = await getGroupInfo();
    console.log('\n组信息:', JSON.stringify(groupInfo, null, 2));
  } catch (error) {
    console.error('获取组信息失败:', error);
  }
  showMenu();
}

async function setAdmin() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入最小签名数量 (默认 2): ', async (minNum) => {
      const minNumSignatures = minNum ? parseInt(minNum) : 2;
      
      showProgress('正在构建设置管理员交易');
      const signedTx = await sdkNew.setAdmin(
        config.signatories, 
        minNumSignatures, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.setAdmin(
        config.signatories, 
        minNumSignatures, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('设置管理员成功！');
      showMenu();
    });
  } catch (error) {
    showError(`设置管理员失败: ${error.message}`);
    showMenu();
  }
}

async function setOracleWorker() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入新的Oracle Worker地址: ', async (newOracleWorker) => {
      showProgress('正在构建设置Oracle Worker交易');
      const signedTx = await sdkNew.setOracleWorker(
        newOracleWorker, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.setOracleWorker(
        newOracleWorker, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('设置Oracle Worker成功！');
      showMenu();
    });
  } catch (error) {
    showError(`设置Oracle Worker失败: ${error.message}`);
    showMenu();
  }
}

async function setTreasuryCheckVH() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入新的Treasury Check VH地址: ', async (newVH) => {
      showProgress('正在构建设置Treasury Check VH交易');
      const signedTx = await sdkNew.setTreasuryCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.setTreasuryCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('设置Treasury Check VH成功！');
      showMenu();
    });
  } catch (error) {
    showError(`设置Treasury Check VH失败: ${error.message}`);
    showMenu();
  }
}

async function setMintCheckVH() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入新的Mint Check VH地址: ', async (newVH) => {
      showProgress('正在构建设置Mint Check VH交易');
      const signedTx = await sdkNew.setMintCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.setMintCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('设置Mint Check VH成功！');
      showMenu();
    });
  } catch (error) {
    showError(`设置Mint Check VH失败: ${error.message}`);
    showMenu();
  }
}

async function setNFTTreasuryCheckVH() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入新的NFTTreasury Check VH地址: ', async (newVH) => {
      showProgress('正在构建设置NFTTreasury Check VH交易');
      const signedTx = await sdkNew.setNFTTreasuryCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.setNFTTreasuryCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('设置NFTTreasury Check VH成功！');
      showMenu();
    });
  } catch (error) {
    showError(`设置NFTTreasury Check VH失败: ${error.message}`);
    showMenu();
  }
}

async function setNFTMintCheckVH() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入新的NFTMint Check VH地址: ', async (newVH) => {
      showProgress('正在构建设置NFTMint Check VH交易');
      const signedTx = await sdkNew.setNFTMintCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.setNFTMintCheckVH(
        newVH, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('设置NFTMint Check VH成功！');
      showMenu();
    });
  } catch (error) {
    showError(`设置NFTMint Check VH失败: ${error.message}`);
    showMenu();
  }
}

async function mintTreasuryCheckToken() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入铸造数量: ', async (amount) => {
      const count = parseInt(amount);
      
      showProgress('正在构建铸造Treasury Check代币交易');
      const signedTx = await sdkNew.mintTreasuryCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.mintTreasuryCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('铸造Treasury Check代币成功！');
      showMenu();
    });
  } catch (error) {
    showError(`铸造Treasury Check代币失败: ${error.message}`);
    showMenu();
  }
}

async function mintMintCheckToken() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入铸造数量: ', async (amount) => {
      const count = parseInt(amount);
      
      showProgress('正在构建铸造Mint Check代币交易');
      const signedTx = await sdkNew.mintMintCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.mintMintCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('铸造Mint Check代币成功！');
      showMenu();
    });
  } catch (error) {
    showError(`铸造Mint Check代币失败: ${error.message}`);
    showMenu();
  }
}

async function mintNFTTreasuryCheckToken() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入铸造数量: ', async (amount) => {
      const count = parseInt(amount);
      
      showProgress('正在构建铸造NFT Treasury Check代币交易');
      const signedTx = await sdkNew.mintNFTTreasuryCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.mintNFTTreasuryCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('铸造NFT Treasury Check代币成功！');
      showMenu();
    });
  } catch (error) {
    showError(`铸造NFT Treasury Check代币失败: ${error.message}`);
    showMenu();
  }
}

async function mintNFTMintCheckToken() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入铸造数量: ', async (amount) => {
      const count = parseInt(amount);
      
      showProgress('正在构建铸造NFT Mint Check代币交易');
      const signedTx = await sdkNew.mintNFTMintCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      showProgress('正在评估交易执行成本');
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      
      showProgress('正在构建最终交易');
      const finalTx = await sdkNew.mintNFTMintCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      showSuccess('铸造NFT Mint Check代币成功！');
      showMenu();
    });
  } catch (error) {
    showError(`铸造NFT Mint Check代币失败: ${error.message}`);
    showMenu();
  }
}

async function burnTreasuryCheckToken() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入销毁数量: ', async (amount) => {
      const count = parseInt(amount);
      const signedTx = await sdkNew.burnTreasuryCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      const finalTx = await sdkNew.burnTreasuryCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      console.log('销毁Treasury Check代币成功！');
      showMenu();
    });
  } catch (error) {
    console.error('销毁Treasury Check代币失败:', error);
    showMenu();
  }
}

async function burnMintCheckToken() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    rl.question('输入销毁数量: ', async (amount) => {
      const count = parseInt(amount);
      const signedTx = await sdkNew.burnMintCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin
      );
      
      const exUnit = await ogmiosUtils.evaluateTx(signedTx);
      const finalTx = await sdkNew.burnMintCheckToken(
        count, 
        config.mustSignBy, 
        utxosForFee, 
        [collateralUtxo], 
        config.admin, 
        signFn, 
        exUnit
      );
      
      await submitAndWaitConfirmed(finalTx);
      console.log('销毁Mint Check代币成功！');
      showMenu();
    });
  } catch (error) {
    console.error('销毁Mint Check代币失败:', error);
    showMenu();
  }
}

async function upgradeGroupNFTHolder() {
  try {
    const utxosForFee = await getUtxoForFee();
    const collateralUtxo = await tryGetCollateralUtxo();
    
    const newGroupNFTHolder = contractsMgr.GroupInfoNFTHolderScript.address().to_bech32();
    let newDatum = await getGroupInfo();
    newDatum[contractsMgr.GroupNFT.Version] = contractsMgr.GroupInfoNFTHolderScript.script().hash().to_hex();
    newDatum[contractsMgr.GroupNFT.NFTRefHolderVH] = nftContracts.NFTRefHolderScript.script().hash().to_hex();
    newDatum[contractsMgr.GroupNFT.NFTTreasuryCheckVH] = nftContracts.NFTTreasuryCheckScript.script().hash().to_hex();
    newDatum[contractsMgr.GroupNFT.NFTMintCheckVH] = nftContracts.NFTMintCheckScript.script().hash().to_hex();
    newDatum = contractsMgr.GroupNFT.genGroupInfoDatum(newDatum).to_hex();
    
    const signedTx = await sdkNew.upgradeGroupNFTHolder(
      newGroupNFTHolder, 
      newDatum, 
      config.mustSignBy, 
      utxosForFee, 
      [collateralUtxo], 
      config.admin
    );
    
    const exUnit = await ogmiosUtils.evaluateTx(signedTx);
    const finalTx = await sdkNew.upgradeGroupNFTHolder(
      newGroupNFTHolder, 
      newDatum, 
      config.mustSignBy, 
      utxosForFee, 
      [collateralUtxo], 
      config.admin, 
      signFn, 
      exUnit
    );
    
    await submitAndWaitConfirmed(finalTx);
    console.log('升级Group NFT Holder成功！');
    showMenu();
  } catch (error) {
    console.error('升级Group NFT Holder失败:', error);
    showMenu();
  }
}

// 初始化函数
async function init() {
  try {
    showProgress('正在初始化SDK');
    const mainnetUrl = "https://nodes.wandevs.org/cardano";
    const testnetUrl = "https://nodes-testnet.wandevs.org/cardano";
    const url = config.isMainnet ? mainnetUrl : testnetUrl;

    sdkNew = new sdk12.ContractSdk(config.isMainnet);
    await sdkNew.init(url);
    
    showProgress('正在获取协议参数');
    protocolParamsGlobal = await ogmiosUtils.getParamProtocol();
    
    showSuccess('SDK初始化成功！');
    showMenu();
  } catch (error) {
    showError(`初始化失败: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

// 启动应用
init();
