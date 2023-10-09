require('dotenv').config({ path: '.env'});
const hre = require("hardhat");

async function main() {

    const TrustedForwarderAddr = process.env.TRUSTED_FORWARDAR_CA
    console.log("trusted forwarder to:",TrustedForwarderAddr);

    const factory = await hre.ethers.getContractFactory("MahiroCoinPermit");
    const contract = await factory.deploy(TrustedForwarderAddr);
  
    await contract.waitForDeployment();
  
    console.log("contract deployed to:", contract.target);
  }


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
