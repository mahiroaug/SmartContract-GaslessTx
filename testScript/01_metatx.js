require('dotenv').config({ path: '.env'});

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const { inspect } = require('util');
const { FireblocksSDK, PeerType, TransactionOperation, TransactionStatus } = require("fireblocks-sdk");
const { FireblocksWeb3Provider, ChainId } = require("@fireblocks/fireblocks-web3-provider");

//// common environment
const TOKEN_CA = process.env.ERC20PERMIT_CA;
const TOKEN_ABI = require('../artifacts/contracts/MahiroCoin_ERC20Permit.sol/MahiroCoinPermit.json').abi;
const FORWARDER_CA = process.env.FORWARDER_CA;
const FORWARDER_ABI = require('../artifacts/contracts/MahiroCoin_ERC2771Forwarder.sol/MahiroTrustedForwarder.json').abi;
const NETWORK = process.env.NETWORK;

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





/////////////////////////////////////////

////// sign functions /////////

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
    console.log("Signature: ", "0x" + signature.r + signature.s + v.toString(16));
    console.log("Signature.r:", signature.r);
    console.log("Signature.s:", signature.s);
    console.log("Signature.v(+27):", v.toString(16));
    console.log("Signature.v:", signature.v);

    return {
        v: v,
        r: '0x' + signature.r,
        s: '0x' + signature.s
    };

}

async function createRequestForPermit(req){

    return SignRequest = {
        type: "EIP712",
        index: 0,
        content: {
            types: {
            EIP712Domain: [
                {
                name: "name",
                type: "string"
                },
                {
                name: "version",
                type: "string"
                },
                {
                name: "chainId",
                type: "uint256"
                },
                {
                name: "verifyingContract",
                type: "address"
                }
            ],
            Permit: [
                {
                name: "owner",
                type: "address"
                },
                {
                name: "spender",
                type: "address"
                },
                {
                name: "value",
                type: "uint256"
                },
                {
                name: "nonce",
                type: "uint256"
                },
                {
                name: "deadline",
                type: "uint256"
                }
            ]
            },
            primaryType: "Permit",
            domain: {
                name: req.name,
                version: req.version,
                chainId: req.chainId,
                verifyingContract: req.verifyingContract
            },
            message: {
                owner: req.owner,
                spender: req.spender,
                value: req.value,
                nonce: req.nonce,
                deadline: req.deadline
            }
        }
    };
}




////// call functions /////////

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




////// send functions /////////

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
    const estimateMaxTxFeeETH = await web3_withRelayer.utils.fromWei(estimateMaxTxFee.toString(), 'ether');
    console.log(' estimate MAX Tx Fee:', estimateMaxTxFee, '(', estimateMaxTxFeeETH, 'ETH)');

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

async function sendPermit(req,signature,payerAddr){
    try{
        const tx = await token_withRelayer.methods.permit(
            req.owner,
            req.spender,
            req.value,
            req.deadline,
            signature.v,
            signature.r,
            signature.s
        );
        const receipt = await sendTx(TOKEN_CA,tx,payerAddr,150000);
        console.log("send permit");
        
    } catch(error){
        console.error('Error:', error);
    }
}




////// main functions /////////

(async() => {

    console.log("-------- IMPLEMENT ---------");
    console.log(`forwarder address: ${FORWARDER_CA}, verifying: ${web3.utils.isAddress(FORWARDER_CA)}`);
    console.log(`token address: ${TOKEN_CA}, verifying: ${web3.utils.isAddress(TOKEN_CA)}`);


    ///////////////////////////////////////////////////////////////////////////////////
    // STEP1 signer create signature
    ///////////////////////////////////////////////////////////////////////////////////

    // get Fireblocks vault accounts
    const vaultAddr = await web3.eth.getAccounts();
    const signerAddr = vaultAddr[0];
    console.log('signer address: ',signerAddr);
    const tc = await web3.eth.getTransactionCount(signerAddr);
    console.log('transactionCount: ',tc);

    // get balance
    console.log("-------- GET VALUE ---------");
    await getAccountBalance(signerAddr);

    // get SIGNATURE
    console.log("-------- GET SIGNATURE -------");
    const coinName = await token.methods.name().call();
    const now = new Date();
    now.setDate(now.getDate() + 3);
    const deadline = Math.floor(now.getTime() / 1000);

    const req = {
        name: await token.methods.name().call(),
        version: "1",
        chainId: ChainId.GOERLI,
        verifyingContract: TOKEN_CA,
        owner: signerAddr,
        spender: FORWARDER_CA,
        value: 2,
        deadline: deadline,
        nonce: await token.methods.nonces(signerAddr).call(),
        symbol: await token.methods.symbol().call(),
    }

    const signRequest = await createRequestForPermit(req);
    console.log("signRequest: ",signRequest);

    // ******* initiate FIREBLOCKS create transaction *********
    /////signature = await signEIP712Message(fb_vaultId, signRequest);
    // ******* close FIREBLOCKS *******************************

    /////console.log("signature: ",signature);


    ///////////////////////////////////////////////////////////////////////////////////
    // STEP2 relayer send transaction (PERMIT function)
    ///////////////////////////////////////////////////////////////////////////////////

    console.log("-------- RELAYER parameter-------");
    const vaultAddr2 = await web3_withRelayer.eth.getAccounts();
    const relayerAddr = vaultAddr2[0];
    console.log(`relayer address is ${relayerAddr}`);

    const tc2 = await web3_withRelayer.eth.getTransactionCount(relayerAddr);
    console.log('transactionCount: ',tc2);

    await getAccountBalance(relayerAddr);


    // send meta transaction by relayer
    console.log("-------- SEND PERMIT from RELAYER -------");
    
    // ******* initiate FIREBLOCKS send transaction *********
    /////await sendPermit(req,signature,relayerAddr);
    // ******* close FIREBLOCKS *****************************

    allowance = await token_withRelayer.methods.allowance(req.owner,req.spender).call();
    console.log(`allowance from owner to forwarder is ${allowance} ${req.symbol}`);



})().catch(error => {
    console.log(error)
});
