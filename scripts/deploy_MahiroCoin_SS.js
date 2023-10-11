require('dotenv').config({ path: '.env'});
const hre = require("hardhat");

async function main() {

    const TrustedForwarderAddr = process.env.FORWARDER_CA
    console.log("trusted forwarder to:",TrustedForwarderAddr);

    const factory = await hre.ethers.getContractFactory("MahiroCoinSingleShot");
    const contract = await factory.deploy(TrustedForwarderAddr);
  
    await contract.waitForDeployment();
  
    console.log("contract deployed to:", contract.target);
  }


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
