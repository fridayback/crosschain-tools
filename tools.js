/*
 * @Author: liulin blue-sky-dl5@163.com
 * @Date: 2025-08-14 16:13:35
 * @LastEditors: liulin blue-sky-dl5@163.com
 * @LastEditTime: 2025-08-28 15:38:47
 * @FilePath: /crosschain-tools/tools.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// const sdk11 = require("crosschain-sdk-1-1");
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const ogmiosUtils = require("crosschain-sdk-1-2/ogmios-utils2");
const utils = require('crosschain-sdk-1-1/utils');
// const contractsMgrOld = sdk11.contracts_mgr;
// const contractsOld = sdk11.contracts

const sdk12 = require("crosschain-sdk-1-2");
const contractsMgr = sdk12.contracts_mgr;
const contracts = sdk12.contracts
const nftContracts = require("crosschain-sdk-1-2/nft-contract");

const isMainnet = true;
// const sdkOld = new sdk11.ContractSdk(isMainnet);
const sdkNew = new sdk12.ContractSdk(isMainnet);

const collateralAmount = 5000000;
const parameterizedAmount = 2222221;
const parameterizedAmount2 = 2222222

// const kkkk = '61b4743240b26bc7bf495aada16e3e1abb8d3147e2ad97e35cf01b36be1afe0b';//CardanoWasm.PrivateKey.generate_ed25519().to_hex();
// const newKey = CardanoWasm.PrivateKey.from_hex(kkkk);
// const newPkh = newKey.to_public().hash();
// const adminaddr = CardanoWasm.BaseAddress.new(
//     CardanoWasm.NetworkIdKind.Mainnet
//     , CardanoWasm.Credential.from_keyhash(newPkh)
//     , CardanoWasm.Credential.from_keyhash(newPkh))


// const payPrvKeyNext = '9b160ba482e38697c5631df832cbc2f5a9c41d9a588b2fa11dc7c370cf02058a';
// const payPrvKey = kkkk;
// const scriptRefOwnerAddr = 'addr1qys3nr0s5wqz3gw2n9satl279ntzha2z92v4ewrknr234hzx8ugllqwa07adyqwz23j797tha446p0exqa8jjypyqzasq73gym';
// const admin = adminaddr.to_address().to_bech32('addr');



// const signatories = [
//     admin, 'addr1q9zwpxsfyz9lp3h6ammx4w05tmznf8fc9jnhphve6yum6xjyuzdqjgyt7rr04mhkd2ulghk9xjwnst98wrwen5feh5dqlz0n7t'
// ]

// const mustSignBy = [
//     "e401804f5a9822508cf9cee59248e0d977778e7c001ce8a7d81f50be"
//     , "fd51889aa0361c0e602796a7aa571629f7a972b2fc7945d424e6ec21"
//     , "1c4e9bc39406993cca989710d28a3652ea98a494885c24a2ab2f9dac"].map(a => {
//         const payment = CardanoWasm.Credential.from_keyhash(CardanoWasm.Ed25519KeyHash.from_hex(a));
//         return CardanoWasm.EnterpriseAddress.new(CardanoWasm.NetworkIdKind.Mainnet, payment).to_address().to_bech32();
//     })
////////////////////////////////////////////  Just for test ///////////////////////////////////////////
// const payPrvKeyNext = '9b160ba482e38697c5631df832cbc2f5a9c41d9a588b2fa11dc7c370cf02058a';
// const payPrvKey = 'cbc623254ca1eb30d8cb21b2ef04381372ff24529a74e4b5117d1e3bbb0f0188';
// const scriptRefOwnerAddr = 'addr_test1vq73yuplt9c5zmgw4ve7qhu49yxllw7q97h4smwvfgst32qrkwupd';
// const admin = 'addr_test1qz6twkzgss75sk379u0e27phvwhmtqqfuhl5gnx7rh7nux2xg4uwrhx9t58far8hp3a06hfdfzlsxgfrzqv5ryc78e4s4dwh26';
// const adminNext = 'addr_test1qpewhjzf3nsh8ytwtkqewf0n8kkynxsva867stedemugsa5a5fxd4tcsgemc7gc4sqfww6f6s0rc45kcsjkd2wzxt2dqnhh2wl';
// const mustSignBy = [
//     admin
// ];
///////////////////////////////////=====----- mainnet config -----=====//////////////////////////////////////////////////
const payPrvKeyNext = '9b160ba482e38697c5631df832cbc2f5a9c41d9a588b2fa11dc7c370cf02058a';
const payPrvKey = 'cbc623254ca1eb30d8cb21b2ef04381372ff24529a74e4b5117d1e3bbb0f0188';
const scriptRefOwnerAddr = 'addr1qys3nr0s5wqz3gw2n9satl279ntzha2z92v4ewrknr234hzx8ugllqwa07adyqwz23j797tha446p0exqa8jjypyqzasq73gym';
const admin = 'addr1q8jqrqz0t2vzy5yvl88wtyjgurvhwauw0sqpe698mq04p0ham3clyk6mg6gctwsfuc8hsgqdt0s9laxl585uwu3xvx2s2pglww'


const signatories = [
    'addr1q8jqrqz0t2vzy5yvl88wtyjgurvhwauw0sqpe698mq04p0ham3clyk6mg6gctwsfuc8hsgqdt0s9laxl585uwu3xvx2s2pglww',
    'addr1q874rzy65qmpcrnqy7t202jhzc5l02tjkt78j3w5ynnwcgwzf22nn7mhf3gs3vfs6uy4pvu3e4j3r0gvuljpe8g6anfsx4lrwf',
    'addr1qywyax7rjsrfj0x2nzt3p552xefw4x9yjjy9cf9z4vhemty2tpvzm5r6rz4f2xqemk7xtq9z4l44ag6hhwan8rx9tu6qsyjuxk',
    'addr1q8lmw6r5u2jteggnps6065qae2puy7k2zympxrrkuggnv2cshkm9yf7clw3jxwsxksuhk7kxndt5uj7uj5dxdvu8837s0emer6',
    'addr1qx74f8gt7nffpswyrgsawc3rxjrckr38l7vadpvgl65pum53nhvjg3ct4dm2t94xd43ndqy5wvt5u90pvwq94xh95ejq8p35ya'
]


const mustSignBy = [
    'addr1q8jqrqz0t2vzy5yvl88wtyjgurvhwauw0sqpe698mq04p0ham3clyk6mg6gctwsfuc8hsgqdt0s9laxl585uwu3xvx2s2pglww',
    'addr1qywyax7rjsrfj0x2nzt3p552xefw4x9yjjy9cf9z4vhemty2tpvzm5r6rz4f2xqemk7xtq9z4l44ag6hhwan8rx9tu6qsyjuxk',
    'addr1q8lmw6r5u2jteggnps6065qae2puy7k2zympxrrkuggnv2cshkm9yf7clw3jxwsxksuhk7kxndt5uj7uj5dxdvu8837s0emer6'
];
///////////////////////////////////=====----- mainnet config -----=====//////////////////////////////////////////////////
let protocolParamsGlobal;
const signFn = async hash => {
    return ogmiosUtils.signFn(payPrvKey, hash);
}

const signFnNext = async hash => {
    return ogmiosUtils.signFn(payPrvKeyNext, hash);
}

const evaluate = async function (rawTx) {
    // console.log('\n\n\n',rawTx,'\n\n\n');
    return await ogmiosUtils.evaluateTx(CardanoWasm.Transaction.from_hex(rawTx));
}

async function getUtxoOfAmount(amount) {
    let utxos = await ogmiosUtils.getUtxo(admin);
    utxos = utxos.filter(o => {
        return (Object.keys(o.value.assets).length <= 0) && (o.value.coins * 1 == amount * 1)
    });
    return utxos;
}

async function makeUtxoOfAmount(amount) {
    let utxosForFee = await getUtxoForFee();

    const signedTx = await utils.transfer(protocolParamsGlobal, utxosForFee, admin, { coins: amount }, admin, undefined, undefined, signFn);
    // console.log(signedTx.to_json());
    const txHash = await ogmiosUtils.submitTx(signedTx);
    const o = await ogmiosUtils.waitTxConfirmed(admin, txHash);

    return o;//await getUtxoOfAmount(amount);
}

async function getUtxoForFee() {
    let utxos = await ogmiosUtils.getUtxo(admin);
    utxos = utxos.filter(o => {
        return (o.value.coins * 1 != collateralAmount && o.value.coins * 1 != parameterizedAmount && o.value.coins * 1 != parameterizedAmount2)
    });
    return utxos;
}

async function tryGetCollateralUtxo() {
    let utxo = await getUtxoOfAmount(collateralAmount);
    if (utxo.length <= 0) {
        utxo = await makeUtxoOfAmount(collateralAmount);
    } else {
        utxo = utxo[0];
    }
    return utxo;
}

async function getGroupInfo(old = true) {
    const groupInfoTokenUtxo = await sdkNew.getGroupInfoNft();
    return contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoTokenUtxo.datum);
}

async function getAdminInfo(old = true) {
    const adminNftUtxo = await sdkNew.getAdminNft();
    return contractsMgr.AdminNFTHolderScript.getSignatoriesInfoFromDatum(adminNftUtxo.datum);
}

async function getCheckTokenUtxo(type) {
    let owner;
    let tokenId;
    const groupInfo = await getGroupInfo();
    const stkvh = groupInfo[contractsMgr.GroupNFT.StkVh]
    switch (type) {
        case 0:
            owner = contracts.TreasuryCheckScript.address(stkvh).to_bech32(sdkNew.ADDR_PREFIX);
            tokenId = contracts.TreasuryCheckTokenScript.tokenId();
            break;

        case 1:
            owner = contracts.MintCheckScript.address(stkvh).to_bech32(sdkNew.ADDR_PREFIX);
            tokenId = contracts.MintCheckTokenScript.tokenId();
            break;
        case 2:
            owner = nftContracts.NFTTreasuryCheckScript.address(stkvh).to_bech32(sdkNew.ADDR_PREFIX);
            tokenId = nftContracts.NFTTreasuryCheckTokenScript.tokenId();
            break;
        case 3:
            owner = nftContracts.NFTMintCheckScript.address(stkvh).to_bech32(sdkNew.ADDR_PREFIX);
            tokenId = nftContracts.NFTMintCheckTokenScript.tokenId();
            break;
        default:
            break;
    }
    let treasuryUtxos = await ogmiosUtils.getUtxo(owner);

    treasuryUtxos = treasuryUtxos.filter(o =>
        (o.value.assets && o.value.assets[tokenId] * 1 > 0))


    return treasuryUtxos;
}

async function finalTxEvaluate(signedTx) {
    signedTx = await sdkNew.addSignature(signedTx, signFnNext);
    signedTx = await sdkNew.addSignature(signedTx, signFn);
    console.log('Tx:', signedTx.to_json());
    return await ogmiosUtils.evaluateTx(signedTx);
}

async function submitAndWaitConfirmed(signedTx) {

    // signedTx = await sdk.addSignature(signedTx, signFnNext);
    signedTx = await sdkNew.addSignature(signedTx, signFn);
    console.log('Tx:', signedTx.to_json());
    const ret = await ogmiosUtils.evaluateTx(signedTx);
    console.log(ret);
    const txHash = await ogmiosUtils.submitTx(signedTx);
    const o = await ogmiosUtils.waitTxConfirmed(admin, txHash);
    return o;
}

function showGroupInfo(groupInfo) {
    let ret = {};
    for (const i in groupInfo) {
        // for (let i = 0; i < groupInfo.length; i++) {
        switch (i * 1) {
            case contractsMgr.GroupNFT.Version:
                ret.Version = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.Admin:
                ret.Admin = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.OracleWorker:
                ret.OracleWorker = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.GPK:
                ret.GPK = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.MintCheckVH:
                ret.MintCheckVH = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.TreasuryCheckVH:
                ret.TreasuryCheckVH = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.StkCheckVh:
                ret.StkCheckVh = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.StkVh:
                ret.StkVh = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.NFTRefHolderVH:
                ret.NFTRefHolderVH = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.NFTMintCheckVH:
                ret.MintCheckVH = groupInfo[i];
                break;
            case contractsMgr.GroupNFT.NFTTreasuryCheckVH:
                ret.NFTTreasuryCheckVH = groupInfo[i];
            default:
                break;
        }

    }

    // console.log(JSON.stringify(ret));
    return ret;
}


async function sendTx() {
    // const vkey = CardanoWasm
    const rawTx = '84a900838258200f2f9814c79f786a06622d4a0d70eaa6a9d0feedc543c79a103b94407d26fe1900825820952f272a6fe0423c6b2afccfddad47fd157333f36f4bac76a364781f525a70bd00825820c1f3e093b0fb4e3aa2ea93b863b8b49fccd33473c2886f21bd3bd9e3f66bae1f010183a300581d70bd61924e0b87d297749f6fb125b4221b592b6b6df34486925e4bffdd01821a0023943ea1581c76c4659b1b328354e6bded80f25b8ea17521584fc9919ef54a3fe86ca15247726f7570496e666f546f6b656e436f696e01028201d818590119d8799f9f581cbd61924e0b87d297749f6fb125b4221b592b6b6df34486925e4bffdd581c56eed02841b7835d050d1801ccc61939ce8281026932576db36ef66a582102bb1a9d739f12068f8886671c30c4aa08dbff9085eaf7255df0f7f4925e921d3e581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c083f459eeb1e23972c6fe190543dcbbcbc5d6db9c4892403ea288382581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581cb007bdeb1853cf42a36eb07737185e608b778ce8a6b94a6ed8f6c7b2581c4e83a9652d76167d9289b190def35276bec262fb0cd18caa4a0835d5581c9c2abd15db9e9b27fca7f4b367cc08e28483d4ca05fcc63a3f58413cffffa300581d70f5fd1d6971f9e8f51a1e501178a7f77d19619e6abd503a700f82a80901821a001ee8e4a1581c32b20627e2309c04a2cf462458ee63cb61712c3b7c952da8cc37b6a5a14c41646d696e4e4654436f696e01028201d81858d9d8799f9f581cb4b75848843d485a3e2f1f95783763afb58009e5ff444cde1dfd3e19581c72ebc8498ce173916e5d819725f33dac499a0ce9f5e82f2dcef88876581c818ba523bf6979604b719e1a9dcb63c91d5dcf29c6d7475a483e2e13581cd573c314651c8ae50fcce794198100d6d34ee6fb51d243b666ef459a581cfda8ba360f889fc4cd12996abe92c799e193baf111d8883e60ac3afb581c6c05225f0dd067b4fc07943857dbb5b841c3e20318cb7ecaf441598f581c4e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d64131ff01ff825839004e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d64131930abab3350800ad3c5ff6d9a73e3dc821438af104e9a3c7b20ca2781a3b3f6b0a021a000c82390b5820b9640f7098fb34a8dd9f8c2d453e77dce7d559cd4b563a866df01312dc48eea90d81825820c1f3e093b0fb4e3aa2ea93b863b8b49fccd33473c2886f21bd3bd9e3f66bae1f000e81581c4e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d6413110825839004e7aa7abc810a8ad6702a5e34996d581c8bb024b716a1f2881d64131930abab3350800ad3c5ff6d9a73e3dc821438af104e9a3c7b20ca278821a00337696a0111a0018d4aa1284825820952f272a6fe0423c6b2afccfddad47fd157333f36f4bac76a364781f525a70bd008258200f2f9814c79f786a06622d4a0d70eaa6a9d0feedc543c79a103b94407d26fe19008258203c124ab49b4188b9744e874b2367e6545f197d05325b774de02c0ba1a76a303a0082582072745b379e00db1be0350779a247b08833b38630e182c676468e9e62fd698b8a00a200818258200277adf989e3b57620980cb68e77f7af21ec13498fc40aaa95f043ef941360dd584066d9faba494ee9b9793601480ba14b204c5fbbcc6e969703406a507c0bff97f259aea4d22e44ced96b869ef5745e2d14ca2dc4e73f5c26aef74c2f89c4023908058284000005821a004c988e1a5479a224840001d87980821a00295a5e1a2f0e3b97f5f6'
    const tx = CardanoWasm.Transaction.from_hex(rawTx);
    console.log(tx.witness_set().vkeys().get(0).vkey().to_hex());
    const hash = await ogmiosUtils.evaluate(rawTx);
    const vk = CardanoWasm.Vkeywitness.new(
        CardanoWasm.Vkey.from_hex('58200277adf989e3b57620980cb68e77f7af21ec13498fc40aaa95f043ef941360dd'),
        CardanoWasm.Ed25519Signature.from_hex('66d9faba494ee9b9793601480ba14b204c5fbbcc6e969703406a507c0bff97f259aea4d22e44ced96b869ef5745e2d14ca2dc4e73f5c26aef74c2f89c4023908')
    );
    // CardanoWasm
    console.log(vk.signature().to_hex(), vk.vkey().to_hex(), vk.to_json());
}

// const aa = CardanoWasm.ScriptDataHash.from_bech32('script_data1jr20xc3tehxc3x9xzuagq5mwrvhdav4q0arxjmv9tqscghshn06s0lm7st');
// // console.log(aa.to_hex());
// //90d4f3622bcdcd8898a6173a80536e1b2edeb2a07f46696d855821845e179bf5
// const stakeAddr = 'stake_test17p8g82t994mpvlvj3xcephhn2fmtasnzlvxdrr92fgyrt4gw25zwy';

async function show() {
    // const contracts = old ? contractsOld : contracts;
    // const contractsMgr = old ? contractsMgrOld : contractsMgr;

    const stakeHash = contractsMgr.StoremanStackScript.script().hash().to_hex();
    console.log('StoremanStackScript Addr:', contractsMgr.StoremanStackScript.script().hash().to_hex(), contractsMgr.StoremanStackScript.address(stakeHash).to_bech32(sdkNew.ADDR_PREFIX));
    console.log('AdminNFTHolderScript Addr:', contractsMgr.AdminNFTHolderScript.script().hash().to_hex(), contractsMgr.AdminNFTHolderScript.address().to_bech32(sdkNew.ADDR_PREFIX));
    const adminInfoUtxo = await sdkNew.getAdminNft();
    const adminInfo = contractsMgr.AdminNFTHolderScript.getSignatoriesInfoFromDatum(adminInfoUtxo.datum);
    console.log('AdminInfo:', JSON.stringify(adminInfo));
    console.log('GroupInfoNFTHolderScript Addr:', contractsMgr.GroupInfoNFTHolderScript.script().hash().to_hex(), contractsMgr.GroupInfoNFTHolderScript.address().to_bech32(sdkNew.ADDR_PREFIX));
    // const groupInfoUtxo = await sdkNew.getGroupInfoNft();
    // const groupInfo = contractsMgr.GroupNFT.groupInfoFromDatum(groupInfoUtxo.datum);
    // console.log('GroupInfo:', JSON.stringify(groupInfo));
    console.log('Treasury Addr:', contracts.TreasuryScript.script().hash().to_hex(), contracts.TreasuryScript.address(stakeHash).to_bech32(sdkNew.ADDR_PREFIX));
    console.log('TreausyCheck Addr:', contracts.TreasuryCheckScript.script().hash().to_hex(), contracts.TreasuryCheckScript.address(stakeHash).to_bech32(sdkNew.ADDR_PREFIX));
    console.log('MappingToken policy:', contracts.MappingTokenScript.policy_id());
    console.log('MintCheck Addr:', contracts.MintCheckScript.script().hash().to_hex(), contracts.MintCheckScript.address(stakeHash).to_bech32(sdkNew.ADDR_PREFIX));

    console.log('NFTTreasury addr:', nftContracts.NFTTreasuryScript.script().hash().to_hex(), nftContracts.NFTTreasuryScript.address(stakeHash).to_bech32(sdkNew.ADDR_PREFIX));
    console.log('NFTTreasuryCheck Addr:', nftContracts.NFTTreasuryCheckScript.script().hash().to_hex(), nftContracts.NFTTreasuryCheckScript.address(stakeHash).to_bech32(sdkNew.ADDR_PREFIX));
    console.log('NFTMintCheck Addr:', nftContracts.NFTMintCheckScript.script().hash().to_hex(), nftContracts.NFTMintCheckScript.address(stakeHash).to_bech32(sdkNew.ADDR_PREFIX));
    console.log('NFTTreasurCheckToken policy:', nftContracts.NFTTreasuryCheckTokenScript.policy_id());
    console.log('NFTMintCheckToken policy:', nftContracts.NFTMintCheckTokenScript.policy_id());
    console.log('NFTRefScirptt Addr:', nftContracts.NFTRefHolderScript.script().hash().to_hex(), nftContracts.NFTRefHolderScript.address().to_bech32(sdkNew.ADDR_PREFIX));
    console.log('NFTMappingToken policy:', nftContracts.NFTMappingTokenScript.policy_id());

}

async function tryScriptRefUtxo(script) {

    // const protocolParamsGlobal = await ogmiosUtils.getParamProtocol();

    let refUtxo = await ogmiosUtils.getUtxo(scriptRefOwnerAddr);
    // const arr = refUtxo.filter(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
    const ref = refUtxo.find(o => script.to_hex().indexOf(o.script['plutus:v2']) >= 0);
    if (ref) return ref;

    let utxtos = await getUtxoForFee();

    let signedTx = await utils.createScriptRef(protocolParamsGlobal, utxtos, admin, scriptRefOwnerAddr, script, signFn);
    // console.log(signedTx.to_json());
    const ret = await ogmiosUtils.submitTx(signedTx);
    console.log('create script ref:', ret)
    return await ogmiosUtils.waitTxConfirmed(scriptRefOwnerAddr, ret);
}

// const newTreasyCheckVH = 'addr_test1xqufvx602k4ad7wevz2w8qh2l28mecxa49683xa8kpq3r26wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sdtyha6';
// const newMintCheckVH = 'addr_test1xpmqvkf78d98ngyzv578gw4de9wjquuhh97087l87sna0f6wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sajfyg6';

// const newTreasyCheckVH = 'addr_test1xqs45y5mw56t032lv8qgt9sp9xhwvfw49m6sus4xrhnrpwjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sh4zls7';
// const newMintCheckVH = 'addr_test1xq3mlgvywct2zzyhv5ttmsf6c7quymvnxnx0nk3wz629wp2wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swesly4';
const cbor = require('cbor-sync');
async function main() {

    const mainnetUrl = "https://nodes.wandevs.org/cardano";
    const testnetUrl = "https://nodes-testnet.wandevs.org/cardano";
    const url = isMainnet ? mainnetUrl : testnetUrl;

    // await sdkOld.init(url);
    // await show();
    console.log('-----------------------');
    await sdkNew.init(url);
    
    // await show();
    protocolParamsGlobal = await ogmiosUtils.getParamProtocol();
    const collateralUtxo = await tryGetCollateralUtxo();

    // const collateralUtxo = await tryGetCollateralUtxo();

    let signFn;
    

    // const treasuryCheckRef = await tryScriptRefUtxo(contracts.TreasuryCheckScript.script());
    // const mintCheckRef = await tryScriptRefUtxo(contracts.MintCheckScript.script());
    const stakeCred = contractsMgr.StoremanStackScript.script().hash().to_hex();
    const newTreasyCheckVH = contracts.TreasuryCheckScript.address(stakeCred).to_bech32(sdkNew.ADDR_PREFIX);
    const newMintCheckVH = contracts.MintCheckScript.address(stakeCred).to_bech32(sdkNew.ADDR_PREFIX);
    {
        // const utxosForFee = await getUtxoForFee();
        // // let adminInfo = await getAdminInfo();
        // // console.log('before setAdmin:', JSON.stringify(adminInfo));
        // let signedTx = await sdkNew.setTreasuryCheckVH(newTreasyCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin);
        // console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        // const exUnit = await ogmiosUtils.evaluateTx(signedTx);
        // signedTx = await sdkNew.setTreasuryCheckVH(newTreasyCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // console.log('--setTreasuryCheckVH-------\n', signedTx.to_hex());
        // const exUnit2 = await finalTxEvaluate(signedTx);
        // console.log(exUnit2);
        // // let o = await submitAndWaitConfirmed(signedTx);
        // // adminInfo = await getAdminInfo();
        // // console.log('after setAdmin:', JSON.stringify(adminInfo));
    }

    {
        // const utxosForFee = await getUtxoForFee();
        // // let adminInfo = await getAdminInfo();
        // // console.log('before setAdmin:', JSON.stringify(adminInfo));
        // let signedTx = await sdkNew.setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin);
        // console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
        // const exUnit = await ogmiosUtils.evaluateTx(signedTx);
        // signedTx = await sdkNew.setMintCheckVH(newMintCheckVH, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // console.log('--setMintCheckVH-------\n', signedTx.to_hex());
        // // let o = await submitAndWaitConfirmed(signedTx);
        // // adminInfo = await getAdminInfo();
        // // console.log('after setAdmin:', JSON.stringify(adminInfo));
    }


    // {
    //     // const utxosForFee = await getUtxoForFee();
    //     // let adminInfo = await getAdminInfo();
    //     // console.log('before setAdmin:', JSON.stringify(adminInfo));
    //     // let signedTx = await sdkOld.setAdmin(signatories, 1, mustSignBy, utxosForFee, [collateralUtxo], admin);
    //     // console.log('--%%%%%%%%%%%%%1-------\n', signedTx.to_json());
    //     // const exUnit = await finalTxEvaluate(signedTx);
    //     // signedTx = await sdkOld.setAdmin(signatories, 2, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
    //     // console.log('--%%%%%%%%%%%%%2-------\n', signedTx.to_json());
    //     // const exUnit2 = await finalTxEvaluate(signedTx);
    //     // let o = await submitAndWaitConfirmed(signedTx);
    //     // adminInfo = await getAdminInfo();
    //     // console.log('after setAdmin:', JSON.stringify(adminInfo));
    // }

    // {
    //     // const utxosForFee = await getUtxoForFee();
    //     // let groupInfo = await getGroupInfo();
    //     // console.log('before setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
    //     // let signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin);
    //     // const exUnit = await finalTxEvaluate(signedTx);
    //     // signedTx = await sdk.setOracleWorker(admin, mustSignBy, utxosForFee, [collateralUtxo], admin,signFn,exUnit);
    //     // let o = await submitAndWaitConfirmed(signedTx);
    //     // groupInfo = await getGroupInfo();
    //     // console.log('after setOracleWorker:', JSON.stringify(showGroupInfo(groupInfo)));
    // }

    // {
    //     // let os = await getCheckTokenUtxo(0);
    //     // console.log('amount before burn:', os.length);
    //     // const utxpSpend = os.slice(0, 1);
    //     // const utxosForFee = await getUtxoForFee();
    //     // let signedTx = await sdk.burnTreasuryCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin);
    //     // const exUnit = await finalTxEvaluate(signedTx);
    //     // signedTx = await sdk.burnTreasuryCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin, signFn, exUnit);
    //     // const o = await submitAndWaitConfirmed(signedTx);
    //     // console.log('after before burn:', (await getCheckTokenUtxo(0)).length);
    // }

    // {
    //     // let os = await getCheckTokenUtxo(1);
    //     // console.log('amount before burn:', os.length);
    //     // const utxpSpend = os.slice(3, 4);
    //     // const utxosForFee = await getUtxoForFee();
    //     // let signedTx = await sdk.burnMintCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin);
    //     // const exUnit = await finalTxEvaluate(signedTx);
    //     // signedTx = await sdk.burnMintCheckToken(mustSignBy, utxosForFee, [collateralUtxo], utxpSpend, admin, signFn, exUnit);
    //     // const o = await submitAndWaitConfirmed(signedTx);
    //     // console.log('after before burn:', (await getCheckTokenUtxo(1)).length);
    // }

    // // {
    // //     const utxosForFee = await getUtxoForFee();
    // //     const receiptor = 'addr_test1qp884fateqg23tt8q2j7xjvk6kqu3wczfdck58egs8tyzvvnp2atxdggqzknchlkmxnnu0wgy9pc4ugyax3u0vsv5fuq5v6kp8';
    // //     let signedTx = await sdk.claim(5405304, receiptor, mustSignBy,utxosForFee,collateralUtxo,admin);
    // //     const exUnit = await finalTxEvaluate(signedTx);
    // //     signedTx = await sdk.claim(85405304, receiptor, mustSignBy,utxosForFee,collateralUtxo,admin,signFn,exUnit);
    // //     const o = await submitAndWaitConfirmed(signedTx);
    // // }
    // {
    //     // const utxosForFee = await getUtxoForFee();
    //     // const newTreasuryCheck = 'addr_test1xqs45y5mw56t032lv8qgt9sp9xhwvfw49m6sus4xrhnrpwjwsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2sh4zls7';
    //     // let signedTx = await sdk.setTreasuryCheckVH(newTreasuryCheck, mustSignBy, utxosForFee, [collateralUtxo], admin);
    //     // const exUnit = await finalTxEvaluate(signedTx);
    //     // signedTx = await await sdk.setTreasuryCheckVH(newTreasuryCheck, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
    //     // const o = await submitAndWaitConfirmed(signedTx);
    // }

    // {
    //     // const utxosForFee = await getUtxoForFee();
    //     // const newMintCheck = 'addr_test1xq3mlgvywct2zzyhv5ttmsf6c7quymvnxnx0nk3wz629wp2wsw5k2ttkze7e9zd3jr00x5nkhmpx97cv6xx25jsgxh2swesly4';
    //     // let signedTx = await sdk.setMintCheckVH(newMintCheck, mustSignBy, utxosForFee, [collateralUtxo], admin);
    //     // const exUnit = await finalTxEvaluate(signedTx);
    //     // signedTx = await await sdk.setMintCheckVH(newMintCheck, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
    //     // const o = await submitAndWaitConfirmed(signedTx);
    // }

    {
        // const count = 7;
        // console.log('amount before mint:', (await getCheckTokenUtxo(0)).length);
        // const utxosForFee = await getUtxoForFee();
        // let signedTx = await sdkNew.mintTreasuryCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin);
        // const exUnit = await ogmiosUtils.evaluateTx(signedTx);
        // console.log('--exUnit---\n', JSON.stringify(exUnit));
        // signedTx = await sdkNew.mintTreasuryCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        // console.log('--mintTreasuryCheckToken-------\n', signedTx.to_hex());
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('amount after mint:', (await getCheckTokenUtxo(0)).length);
    }

    {
        const count = 10;
        console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdkNew.mintMintCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await ogmiosUtils.evaluateTx(signedTx);
        signedTx = await sdkNew.mintMintCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--mintMintCheckToken-------\n', signedTx.to_hex());
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('amount before mint:', (await getCheckTokenUtxo(1)).length);
    }

    {
        const count = 7;
        console.log('amount before mint:', (await getCheckTokenUtxo(2)).length);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdkNew.mintNFTTreasuryCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await ogmiosUtils.evaluateTx(signedTx);
        console.log('--exUnit---\n', JSON.stringify(exUnit));
        signedTx = await sdkNew.mintNFTTreasuryCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--mintNFTTreasuryCheckToken-------\n', signedTx.to_hex());
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('amount after mint:', (await getCheckTokenUtxo(2)).length);
    }

    {
        const count = 10;
        console.log('amount before mint:', (await getCheckTokenUtxo(3)).length);
        const utxosForFee = await getUtxoForFee();
        let signedTx = await sdkNew.mintNFTMintCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin);
        const exUnit = await ogmiosUtils.evaluateTx(signedTx);
        signedTx = await sdkNew.mintNFTMintCheckToken(count, mustSignBy, utxosForFee, [collateralUtxo], admin, signFn, exUnit);
        console.log('--mintNFTMintCheckToken-------\n', signedTx.to_hex());
        // const o = await submitAndWaitConfirmed(signedTx);
        // console.log('amount before mint:', (await getCheckTokenUtxo(3)).length);
    }

}


main().then(() => {
    console.log('successful !');
}).catch(e => {
    console.error(e);
    // console.log(e[0].message);
}).finally(() => {
    // ogmiosUtils.unInit();
})