require('dotenv').config({ path: '.env'});

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const { inspect } = require('util');
const { FireblocksSDK, PeerType, TransactionOperation, TransactionStatus } = require("fireblocks-sdk");
const { FireblocksWeb3Provider, ChainId } = require("@fireblocks/fireblocks-web3-provider");

// -------------------COMMON----------------------- //
//// common environment
const TOKEN_CA = process.env.ERC20PERMIT_CA;
const TOKEN_ABI = require('../artifacts/contracts/MahiroCoin_ERC20Permit.sol/MahiroCoinPermit.json').abi;
const FORWARDER_CA = process.env.FORWARDER_CA;
const FORWARDER_ABI = require('../artifacts/contracts/MahiroCoin_ERC2771Forwarder.sol/MahiroTrustedForwarder.json').abi;
const NETWORK = process.env.NETWORK;

// -------------------FIREBLOCKS------------------- //
//// fireblocks - SDK
const fb_apiSecret = fs.readFileSync(path.resolve("fireblocks_secret_SIGNER.key"), "utf8");
const fb_apiKey = process.env.FIREBLOCKS_API_KEY_SIGNER;
const fb_base_url = process.env.FIREBLOCKS_URL;
const fireblocks = new FireblocksSDK(fb_apiSecret, fb_apiKey, fb_base_url);

//// fireblocks - web3 provider - signer account
const fb_vaultId = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID;
const eip1193Provider = new FireblocksWeb3Provider({
    privateKey: fb_apiSecret,
    apiKey: fb_apiKey,
    vaultAccountIds: fb_vaultId,
    chainId: ChainId.GOERLI,
});
const web3 = new Web3(eip1193Provider);
const token = new web3.eth.Contract(TOKEN_ABI, TOKEN_CA);
const forwarder = new web3.eth.Contract(FORWARDER_ABI,FORWARDER_CA);

//// fireblocks - web3 provider - relayer account
const fb_vaultId_relayer = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_RELAYER;
const eip1193Provider_withRelayer = new FireblocksWeb3Provider({
    privateKey: fb_apiSecret,
    apiKey: fb_apiKey,
    vaultAccountIds: fb_vaultId_relayer,
    chainId: ChainId.GOERLI,
});
const web3_withRelayer = new Web3(eip1193Provider_withRelayer);
const token_withRelayer = new web3_withRelayer.eth.Contract(TOKEN_ABI, TOKEN_CA);
const forwarder_withRelayer = new web3_withRelayer.eth.Contract(FORWARDER_ABI,FORWARDER_CA);

//// fireblocks - other setting
const fb_vaultId_target = process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_TARGET;


/////////////////////////////////////////
////// sign functions ///////////////////
/////////////////////////////////////////

async function signEIP712Message(vaultAccountId, signRequest) {     
    const { status, id } = await fireblocks.createTransaction({
        operation: TransactionOperation.TYPED_MESSAGE,
        assetId: "ETH_TEST3",
        source: { 
            type: PeerType.VAULT_ACCOUNT,
            id: vaultAccountId
        },
        amount: "0",
        note: "TYPED(EIP-712) Message",
        extraParameters: {
            rawMessageData: {
                messages: [signRequest],
            },
        },
    });

    let currentStatus = status;
    let txInfo = await fireblocks.getTransactionById(id);

    while (currentStatus != TransactionStatus.COMPLETED && currentStatus != TransactionStatus.FAILED) { 
        console.log("keep polling for tx " + id + "; status: " + currentStatus);
        txInfo = await fireblocks.getTransactionById(id);
        currentStatus = txInfo.status; 
        await new Promise(r => setTimeout(r, 1000));
    };
    if(currentStatus == TransactionStatus.FAILED) {
        throw "Transaction failed. Substatus: " + txInfo.subStatus;
    }

    console.log(">>> txinfo");
    console.log("txid:", id);
    console.log("txinfo: ", txInfo);

    console.log(">>> result");
    const walletAddresses = await fireblocks.getDepositAddresses(vaultAccountId, "ETH_TEST3");
    console.log("walletAddresses: ", walletAddresses);
    console.log("Address: ", walletAddresses[0].address);
    console.log("signRequest: ", signRequest);

    const signature = txInfo.signedMessages[0].signature;
    const v = 27 + signature.v;
    console.log("Signature(original): ",signature);
    console.log("Signature.v(+27):", v.toString(16));


    const vHex = web3.utils.toHex(v).slice(2);
    const sigHex = '0x' + signature.fullSig + vHex
    console.log("sigHex: ",sigHex);
    const sigByte = web3.utils.hexToBytes(sigHex);
    console.log("sigByte: ",sigByte);

    return {
        v: v,
        r: '0x' + signature.r,
        s: '0x' + signature.s,
        sigHex: sigHex,
        sigByte: sigByte
    };

}

async function createRequestForForward(req){

    return SignRequest = {
        type: "EIP712",
        index: 0,
        content: {
            types: {
                EIP712Domain: [
                    {name: "name", type: "string"},
                    {name: "version", type: "string"},
                    {name: "chainId", type: "uint256"},
                    {name: "verifyingContract", type: "address"}
                ],
                ForwardRequest:  [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint48' },
                    { name: 'data', type: 'bytes' },
                ]
            },
            primaryType: "ForwardRequest",
            domain: {
                name: req.name,
                version: req.version,
                chainId: req.chainId,
                verifyingContract: req.verifyingContract
            },
            message: {
                from: req.from,
                to: req.to,
                value: req.value,
                gas: req.gas,
                nonce: req.nonce,
                deadline: req.deadline,
                data: req.data
            }
        }
    };
}


/////////////////////////////////////////
////// call functions ///////////////////
/////////////////////////////////////////

async function getAccountBalance(address) {
    console.log(`Account: ${address}`);

    // ETH Balance
    const balance = await web3.eth.getBalance(address);
    console.log(`ETH Balance : ${web3.utils.fromWei(balance, 'ether')} ETH`);

    // MHRCT Balance
    const coinBalance = await token.methods.balanceOf(address).call();
    const coinName = await token.methods.name().call();
    const coinSymbol = await token.methods.symbol().call();

    console.log(`${coinName} Balance: ${web3.utils.fromWei(coinBalance, 'ether')} ${coinSymbol}`);
}




/////////////////////////////////////////
////// send functions ///////////////////
/////////////////////////////////////////

const sendTx = async (_to ,_tx ,_signer,_gasLimit) => {

    // check toAddress
    toAddress = web3_withRelayer.utils.toChecksumAddress(_to);
    console.log(' toAddress:',toAddress);

    // gasLimit
    const setGasLimit = _gasLimit;
    console.log(' setGasLimit:', setGasLimit);

    // gasPrice
    const gasPrice = await web3_withRelayer.eth.getGasPrice();
    const gasPriceInGwei = await web3_withRelayer.utils.fromWei(gasPrice, 'gwei');
    console.log(' gasPrice:', gasPrice,'(', gasPriceInGwei,'Gwei)');

    // estimate max Transaction Fee
    const estimateMaxTxFee = setGasLimit * gasPrice;
    const estimateMaxTxFeegwei = await web3_withRelayer.utils.fromWei(estimateMaxTxFee.toString(), 'gwei');
    const estimateMaxTxFeeETH = await web3_withRelayer.utils.fromWei(estimateMaxTxFee.toString(), 'ether');
    console.log(` estimate MAX Tx Fee:${estimateMaxTxFee}(${estimateMaxTxFeegwei}Gwei) (${estimateMaxTxFeeETH}ETH)`);

    const createReceipt = await web3_withRelayer.eth.sendTransaction({
        to: toAddress,
        from: _signer,
        data: _tx.encodeABI(),
        gas: await web3_withRelayer.utils.toHex(setGasLimit)
    }).once("transactionHash", (txhash) => {
        console.log(` Send transaction ...`);
        console.log(` https://${NETWORK}.etherscan.io/tx/${txhash}`);
    })
    console.log(` Tx successful with hash: ${createReceipt.transactionHash} in block ${createReceipt.blockNumber}`);

    return(createReceipt);
}

async function sendExecute(req,signature,payerAddr){

    const forwardRequestData = {
        from: req.from,
        to: req.to,
        value: req.value,
        gas: req.gas,
        deadline: req.deadline,
        data: req.data,
        signature: signature.sigByte
    };

    console.log("forwardRequestData: ",forwardRequestData);

    try{
        const tx = await forwarder_withRelayer.methods.execute(forwardRequestData);
        const receipt = await sendTx(FORWARDER_CA,tx,payerAddr,300000);
        console.log("send execute");
        
    } catch(error){
        console.error('Error:', error);
    }
}



async function sleepForSeconds(amount) {
    console.log(`Sleeping for ${amount} seconds...`);
    await new Promise(r => setTimeout(r, amount * 1000)); // milliseconds
    console.log(`${amount} seconds have passed!`);
}



/////////////////////////////////////////
////// main functions ///////////////////
/////////////////////////////////////////

(async() => {

    console.log("-------- IMPLEMENT ---------");
    console.log(`forwarder address: ${FORWARDER_CA}, verifying: ${web3.utils.isAddress(FORWARDER_CA)}`);
    console.log(`token address: ${TOKEN_CA}, verifying: ${web3.utils.isAddress(TOKEN_CA)}`);


    ///////////////////////////////////////////////////////////////////////////////////
    // STEP1 signer create signature
    ///////////////////////////////////////////////////////////////////////////////////

    // -------------------FIREBLOCKS VAULT ACCOUNT------------------- //
    // get signer
    console.log("////////////////////////////");
    console.log("/////////// STEP1 //////////");
    console.log("////////////////////////////");
    console.log("========== SGINER ==========");
    const vaultAddr = await web3.eth.getAccounts();
    const signerAddr = vaultAddr[0];
    console.log('signer address: ',signerAddr);
    const tc = await web3.eth.getTransactionCount(signerAddr);
    console.log('transactionCount: ',tc);
    // get balance
    console.log("-------- GET VALUE ---------");
    await getAccountBalance(signerAddr);


    // get target
    console.log("========== TARGET ==========");
    const walletAddresses = await fireblocks.getDepositAddresses(fb_vaultId_target, "ETH_TEST3");
    const targetAddr = walletAddresses[0].address;
    console.log("target address: ", targetAddr);


    // -------------------SIGNATURE------------------- //
    // get SIGNATURE
    console.log("========== GET SIGNATURE ==========");

    const now = new Date();
    now.setDate(now.getDate() + 3);
    const deadline = Math.floor(now.getTime() / 1000);
    const amount = 2; // 2 tokens
    const weiAmount = await web3.utils.toWei(amount.toString(),"ether");

    let fnSignatureTransfer = web3.utils.keccak256('transferFrom(address,address,uint256)').substr(0, 10);
    let fnParamsTransfer = web3.eth.abi.encodeParameters(
        ['address', 'address', 'uint256'],
        [signerAddr, targetAddr, weiAmount]
    );
    const data = fnSignatureTransfer + fnParamsTransfer.substr(2);

    const req = {
        name: "MahiroCoin_F",
        version: "1",
        chainId: ChainId.GOERLI,
        verifyingContract: FORWARDER_CA,

        from: signerAddr,
        to: TOKEN_CA,
        value: 0,
        gas: 300000,
        nonce: await forwarder.methods.nonces(signerAddr).call(),
        deadline: deadline,
        data: web3.utils.hexToBytes(data),

        symbol: await token.methods.symbol().call(),
    }

    const signRequest = await createRequestForForward(req);
    console.log("signRequest: ",signRequest);

    // ******* initiate FIREBLOCKS create transaction *********
    signature = await signEIP712Message(fb_vaultId, signRequest);
    // ******* close FIREBLOCKS *******************************

    console.log("signature: ",signature);


    ///////////////////////////////////////////////////////////////////////////////////
    // STEP2 relayer send transaction (PERMIT function)
    ///////////////////////////////////////////////////////////////////////////////////

    console.log("////////////////////////////");
    console.log("/////////// STEP2 //////////");
    console.log("////////////////////////////");
    console.log("-------- RELAYER parameter-------");
    const vaultAddr2 = await web3_withRelayer.eth.getAccounts();
    const relayerAddr = vaultAddr2[0];
    console.log(`relayer address is ${relayerAddr}`);
    const tc2 = await web3_withRelayer.eth.getTransactionCount(relayerAddr);
    console.log('transactionCount: ',tc2);
    await getAccountBalance(relayerAddr);


    // send meta transaction by relayer
    console.log("-------- SEND FORWARD REQUEST(transferFrom) from RELAYER -------");
    
    // ******* initiate FIREBLOCKS send transaction *********
    await sendExecute(req,signature,relayerAddr);
    // ******* close FIREBLOCKS *****************************

    await sleepForSeconds(60);

    allowance = await token_withRelayer.methods.allowance(req.from,FORWARDER_CA).call();
    console.log(`allowance from owner to forwarder is ${allowance} ${req.symbol}`);



})().catch(error => {
    console.log(error)
});
