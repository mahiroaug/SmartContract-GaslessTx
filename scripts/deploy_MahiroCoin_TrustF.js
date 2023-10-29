const hre = require("hardhat");

async function main() {

    const TrustedForwarder = await hre.ethers.getContractFactory("MahiroTrustedForwarder");
    const trustedForwarder = await TrustedForwarder.deploy();

    //await trustedForwarder.deployed();
    await trustedForwarder.waitForDeployment(); 

    //console.log("TrustedForwarder deployed to:", trustedForwarder.address);
    console.log("TrustedForwarder deployed to:", trustedForwarder.target);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
