require('dotenv').config({ path: '.env'});
require("@nomicfoundation/hardhat-toolbox");

const INFURA_URL = process.env.INFURA_URL;
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "goerli",
  networks: {
    goerli: {
      url: `${INFURA_URL}`,
      accounts: [`0x${GOERLI_PRIVATE_KEY}`],
    },
  }
};