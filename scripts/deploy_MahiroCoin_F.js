const hre = require("hardhat");

async function main() {
  const Forwarder = await hre.ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy();
  await forwarder.waitForDeployment(); 
  console.log("Forwarder deployed to:", forwarder.target);

  // regist DomainSeparator
  const domainName = "MyForwarderDomain";
  const domainVersion = "1.0";
  const tx = await forwarder.registerDomainSeparator(domainName, domainVersion);
  await tx.wait();
  console.log("DomainSeparator registered");
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
