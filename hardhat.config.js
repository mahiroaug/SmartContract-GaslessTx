require('dotenv').config({ path: '.env'});

require("@nomicfoundation/hardhat-toolbox");
require("@fireblocks/hardhat-fireblocks");

const fs = require('fs');
const path = require('path');
const fb_apiSecret = fs.readFileSync(path.resolve("fireblocks_secret_SIGNER.key"), "utf8");

module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "holesky",
  networks: {
    goerli: {
      url: `${process.env.INFURA_URL}`,
      accounts: [`0x${process.env.GOERLI_PRIVATE_KEY}`],
    },
    holesky: {
      url: "https://rpc.ankr.com/eth_holesky",
      fireblocks: {
        //apiBaseUrl: process.env.FIREBLOCKS_URL,
        privateKey: fb_apiSecret,
        apiKey: process.env.FIREBLOCKS_API_KEY_SIGNER,
        vaultAccountIds: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID_DEPLOYER,
      }
    },
  }
};