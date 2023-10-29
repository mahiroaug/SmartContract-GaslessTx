const hre = require("hardhat");

async function main() {
    const Forwarder = await hre.ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment(); 
    console.log("Forwarder deployed to:", forwarder.target);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
