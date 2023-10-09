const { FireblocksSDK, PeerType, TransactionOperation, TransactionStatus } = require("fireblocks-sdk");
const fs = require('fs');
const path = require('path');
const apiSecret = fs.readFileSync(path.resolve(__dirname, "fireblocks_secret.key"), "utf8");
const apiKey = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"; // Your API Key
const fireblocks = new FireblocksSDK(apiSecret, apiKey);

async function signEIP712Message(vaultAccountId, exampleSignRequest) {     
    const { status, id } = await fireblocks.createTransaction({
        operation: TransactionOperation.TYPED_MESSAGE,
        assetId: "ETH",
        source: { 
            type: PeerType.VAULT_ACCOUNT,
            id: vaultAccountId
        },
        amount: "0",
        note: "Test EIP-712 Message",
        extraParameters: {
            rawMessageData: {
                messages: [exampleSignRequest],
            },
        },
    });
    let currentStatus = status;
    let txInfo;

    while (currentStatus != TransactionStatus.COMPLETED && currentStatus != TransactionStatus.FAILED) { 
        console.log("keep polling for tx " + id + "; status: " + currentStatus);
        txInfo = await fireblocks.getTransactionById(id);
        currentStatus = txInfo.status; 
        await new Promise(r => setTimeout(r, 1000));
    };
}


const exampleSignRequest = {
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
          name: "USDC",
          version: "1",
          chainId: 9,
          verifyingContract: "0x6e11530D05DF9BcA475Ba23eA26AcCCab9122d4c"
        },
        message: {
          owner: "0x74ehEb032057CF42bDA226F132AF771ADc415D32",
          spender: "0x7a6E1C5cBe4F7B1f863b2251Cb801b4dEE905c2c",
          value: 2,
          nonce: 0,
          deadline: 1923318233
        }
      }
};

signEIP712Message("0", exampleSignRequest);