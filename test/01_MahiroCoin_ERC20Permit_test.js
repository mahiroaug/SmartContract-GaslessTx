const { expect } = require("chai");

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Token contract", function () {

  async function deployTokenFixture() {

    // Get the Signers here.
    const [owner, addr1, addr2] = await ethers.getSigners();
    console.log("owner.address = ".owner.address);
    console.log("addr1.address = ",addr1.address);
    console.log("addr2.address = ",addr2.address);


    const MahiroCoinPermit = await ethers.deployContract("MahiroCoinPermit");
    await MahiroCoinPermit.waitForDeployment(addr2.address);
    return { MahiroCoinPermit, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { MahiroCoinPermit, owner } = await loadFixture(deployTokenFixture);
      expect(await MahiroCoinPermit.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const { MahiroCoinPermit, owner } = await loadFixture(deployTokenFixture);
      const ownerBalance = await MahiroCoinPermit.balanceOf(owner.address);
      expect(await MahiroCoinPermit.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const { MahiroCoinPermit, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      // Transfer 50 tokens from owner to addr1
      await expect(
        MahiroCoinPermit.transfer(addr1.address, 50)
      ).to.changeTokenBalances(MahiroCoinPermit, [owner, addr1], [-50, 50]);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await expect(
        MahiroCoinPermit.connect(addr1).transfer(addr2.address, 50)
      ).to.changeTokenBalances(MahiroCoinPermit, [addr1, addr2], [-50, 50]);
    });

    it("Should emit Transfer events", async function () {
      const { MahiroCoinPermit, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );

      // Transfer 50 tokens from owner to addr1
      await expect(MahiroCoinPermit.transfer(addr1.address, 50))
        .to.emit(MahiroCoinPermit, "Transfer")
        .withArgs(owner.address, addr1.address, 50);

      // Transfer 50 tokens from addr1 to addr2
      // We use .connect(signer) to send a transaction from another account
      await expect(MahiroCoinPermit.connect(addr1).transfer(addr2.address, 50))
        .to.emit(MahiroCoinPermit, "Transfer")
        .withArgs(addr1.address, addr2.address, 50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { MahiroCoinPermit, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const initialOwnerBalance = await MahiroCoinPermit.balanceOf(owner.address);

      // Try to send 1 token from addr1 (0 tokens) to owner.
      // `require` will evaluate false and revert the transaction.
      await expect(
        MahiroCoinPermit.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("Not enough tokens");

      // Owner balance shouldn't have changed.
      expect(await MahiroCoinPermit.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });
  });
});