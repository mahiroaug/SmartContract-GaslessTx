# environment

`.env`

```
# INFURA
INFURA_URL=https://goerli.infura.io/v3/<YOUR_API_KEY>

# Metamask 
GOERLI_PRIVATE_KEY=
GOERLI_ADDR_METAMASK=0x

# fireblocks
NETWORK=goerli
FIREBLOCKS_API_KEY_SIGNER=

FIREBLOCKS_URL=https://api.fireblocks.io
FIREBLOCKS_VAULT_ACCOUNT_ID=
FIREBLOCKS_VAULT_ACCOUNT_ID_RELAYER=

# SMART CONTRACT
ERC20PERMIT_CA=0x # ★★★★
FORWARDER_CA=0x   # ★★★★
```

# 1. compile

```bash
npx hardhat compile
npx hardhat run --network goerli scripts/deploy_MahiroCoin_F.js
```

get contract address and put in the follow(★★★★)

`scripts/deploy_MahiroCoin_P.js`

```js
const hre = require("hardhat");

async function main() {

    const TrustedForwarderAddr = (forwarder_contract_address); // ★★★★

    const factory = await hre.ethers.getContractFactory("MahiroCoinPermit");
    const contract = await factory.deploy(TrustedForwarderAddr);
  
    await contract.waitForDeployment();
  
    console.log("contract deployed to:", contract.target);
  }

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```


```bash
npx hardhat run --network goerli scripts/deploy_MahiroCoin_P.js
```

get contract address and put in the .env(★★★★)



# 2. test script

```bash
node testScript/01_metatx.js
```
