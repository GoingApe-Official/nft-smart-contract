const { expect } = require("chai");
const { ethers } = require("hardhat");
const { nftWhiteListSign } = require('../scripts/sign')

describe("GoingApeSigVerifyTest", function () {
  let owner, addr1, addr2, addr3;
  let WHITELISTSALETYPE = 1
  let PRIVATESALETYPE = 0

  let signPrivateKey = "0x881243283e3130e2e044a999e5bcc3fd7d01b3b10fe8e51d296bd880b5f3bac6"
  let signAddr = "0x4fc5e52796feba3b130695e9f7475e6cbbe79903"
  async function advanceBlockTo(blockNumber) {
    for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
      await advanceBlock();
    }
  }

  async function advanceBlock() {
    return ethers.provider.send("evm_mine", [])
  }
  before(async function () {
    GoingApeSigVerifyNft = await ethers.getContractFactory("GoingApeSigVerifyNft");

    [owner, addr1, addr2, addr3] = await ethers.getSigners();
  });


  beforeEach(async function () {
    goingApeSigVerifyNft = await GoingApeSigVerifyNft.deploy("GoingApe", "GA", signAddr);
    await goingApeSigVerifyNft.deployed();
  });

  describe("private sale Test", async function () {
    it("private mint", async function () {
      let signature = nftWhiteListSign(signPrivateKey, addr1.address, PRIVATESALETYPE)
      await expect(
        goingApeSigVerifyNft.connect(addr1).privateSaleMint(1, signature)
      ).to.be.revertedWith("private sale not open");

      await goingApeSigVerifyNft.connect(owner).setPrivateSaleState(true)

      await expect(
        goingApeSigVerifyNft.connect(addr1).privateSaleMint(0, signature)
      ).to.be.revertedWith("mint num must > 0");
      await expect(
        goingApeSigVerifyNft.connect(addr1).privateSaleMint(10001, signature)
      ).to.be.revertedWith("cap reached");
      let unitPrice = await goingApeSigVerifyNft.privateSaleCost()
      await expect(
        goingApeSigVerifyNft.connect(addr1).privateSaleMint(6, signature, { value: unitPrice.mul(6).toString(10) })
      ).to.be.revertedWith("private sale mint amount per wallet exceeded");

      await goingApeSigVerifyNft.connect(addr1).privateSaleMint(5, signature, { value: unitPrice.mul(5).toString(10) })
      let balanceOf = await goingApeSigVerifyNft.connect(addr1).balanceOf(addr1.address)
      expect(balanceOf).to.equal(5);
    })

    it("private mint various amount", async function () {
      let randomWallets = await ethers.getSigners();
      for (let i = 1; i <= 5; i++) {
        let index = i + 10
        let randomWallet = randomWallets[index]
        await goingApeSigVerifyNft.connect(owner).setPrivateSaleState(true)
        let signature = nftWhiteListSign(signPrivateKey, randomWallet.address, PRIVATESALETYPE)
        let unitPrice = await goingApeSigVerifyNft.privateSaleCost()
        await goingApeSigVerifyNft.connect(randomWallet).privateSaleMint(i, signature, { value: unitPrice.mul(i).toString(10) })
        let balanceOf = await goingApeSigVerifyNft.connect(randomWallet).balanceOf(randomWallet.address)
        expect(balanceOf).to.equal(i);
      }
    })
  });


  describe("whitelist sale Test", async function () {
    it("whitelist mint", async function () {
      let signature = nftWhiteListSign(signPrivateKey, addr1.address, WHITELISTSALETYPE)
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature)
      ).to.be.revertedWith("whitelist sale not open");
      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(true)
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(0, signature)
      ).to.be.revertedWith("mint num must > 0");
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(10001, signature)
      ).to.be.revertedWith("cap reached");
      let unitPrice = await goingApeSigVerifyNft.whitelistSaleCost()
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(2, signature, { value: unitPrice.mul(2).toString(10) })
      ).to.be.revertedWith("whitelist mint amount per wallet exceeded");

      await goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature, { value: unitPrice.mul(1).toString(10) })
      let balanceOf = await goingApeSigVerifyNft.connect(addr1).balanceOf(addr1.address)
      expect(balanceOf).to.equal(1);
    })
  });


  describe("whitelist sale abnormal Test", async function () {
    it("wrong signaure", async function () {

      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(true)
      let signature = nftWhiteListSign(signPrivateKey.replace('8', '1'), addr1.address, WHITELISTSALETYPE)

      let unitPrice = await goingApeSigVerifyNft.whitelistSaleCost()
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature, { value: unitPrice.mul(1).toString(10) })
      ).to.be.revertedWith("Not authorized to mint")
    })

    it("wrong signaure type", async function () {
      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(true)
      let signature = nftWhiteListSign(signPrivateKey, addr1.address, PRIVATESALETYPE)
      let unitPrice = await goingApeSigVerifyNft.whitelistSaleCost()
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature, { value: unitPrice.mul(1).toString(10) })
      ).to.be.revertedWith("Not authorized to mint")
    })

    it("Replay Attack signaure", async function () {
      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(true)
      let signature = nftWhiteListSign(signPrivateKey, addr2.address, WHITELISTSALETYPE)
      let unitPrice = await goingApeSigVerifyNft.whitelistSaleCost()
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature, { value: unitPrice.mul(1).toString(10) })
      ).to.be.revertedWith("Not authorized to mint")
    })

    it("whietlist mint exceed NFT", async function () {

      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(true)
      let signature = nftWhiteListSign(signPrivateKey, addr1.address, WHITELISTSALETYPE)

      let unitPrice = await goingApeSigVerifyNft.whitelistSaleCost()
      await goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature, { value: unitPrice.mul(1).toString(10) })
      await expect(
        goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature, { value: unitPrice.mul(1).toString(10) })
      ).to.be.revertedWith("whitelist mint amount per wallet exceeded")
    })
  });

  describe("public sale test", async function () {
    it("mint", async function () {
      await expect(
        goingApeSigVerifyNft.connect(addr2).publicMint(1)
      ).to.be.revertedWith("public sale not open");
      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
      let unitPrice = await goingApeSigVerifyNft.publicSaleCost()
      await goingApeSigVerifyNft.connect(addr2).publicMint(2, { value: unitPrice.mul(2).toString(10) })
      let balanceOf = await goingApeSigVerifyNft.connect(addr2).balanceOf(addr2.address)
      expect(balanceOf).to.equal(2);
    })

    it("batch mint nft", async function () {
      await expect(
        goingApeSigVerifyNft.connect(addr2).publicMint(1)
      ).to.be.revertedWith("public sale not open");
      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
      let unitPrice = await goingApeSigVerifyNft.publicSaleCost()
      let mintAmount = await goingApeSigVerifyNft.MAX_PUBLIC_MINT()
      await goingApeSigVerifyNft.connect(addr2).publicMint(mintAmount, { value: unitPrice.mul(mintAmount).toString(10) })
      let balanceOf = await goingApeSigVerifyNft.connect(addr2).balanceOf(addr2.address)
      expect(balanceOf).to.equal(mintAmount);
    })

    it("public mint various nft", async function () {
      let randomWallets = await ethers.getSigners();
      for (let i = 1; i <= 3; i++) {
        let index = i + 10
        let randomWallet = randomWallets[index]
        await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
        let unitPrice = await goingApeSigVerifyNft.publicSaleCost()
        await goingApeSigVerifyNft.connect(randomWallet).publicMint(i, { value: unitPrice.mul(i).toString(10) })
        let balanceOf = await goingApeSigVerifyNft.connect(randomWallet).balanceOf(randomWallet.address)
        expect(balanceOf).to.equal(i);
      }
    })
  });

  describe("public sale abnormal test", async function () {
    it("mint more batch", async function () {
      await expect(
        goingApeSigVerifyNft.connect(addr2).publicMint(1)
      ).to.be.revertedWith("public sale not open");
      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
      let unitPrice = await goingApeSigVerifyNft.publicSaleCost()
      await expect(
        goingApeSigVerifyNft.connect(addr2).publicMint(4, { value: unitPrice.mul(4).toString(10) })
      ).to.be.revertedWith("public mint amount per wallet exceeded")

    })
    it("mint with incorrect ether", async function () {
      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
      let unitPrice = await goingApeSigVerifyNft.publicSaleCost()
      await expect(
        goingApeSigVerifyNft.connect(addr2).publicMint(2, { value: unitPrice.toString(10) })
      ).to.be.revertedWith("incorrect purchase amount")

    })
  });
  describe("Admin Test", async function () {
    it("access control test", async function () {
      await expect(
        goingApeSigVerifyNft.connect(addr1).setWhitelistSaleState(true)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      await expect(
        goingApeSigVerifyNft.connect(addr1).setPublicSaleState(true)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      await expect(
        goingApeSigVerifyNft.connect(addr1).setPrivateSaleState(true)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      await expect(
        goingApeSigVerifyNft.connect(addr1).setPublicCost(hre.ethers.utils.parseEther('1').toString(10))
      ).to.be.revertedWith("Ownable: caller is not the owner")


      await expect(
        goingApeSigVerifyNft.connect(addr1).setBaseURI("https://baseuri.io/")
      ).to.be.revertedWith("Ownable: caller is not the owner")

      // pre sale state change
      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(true)
      let preSaleIsActiveState = await goingApeSigVerifyNft.whitelistSaleisActive()
      expect(preSaleIsActiveState).to.equal(true);

      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(false)
      preSaleIsActiveState = await goingApeSigVerifyNft.whitelistSaleisActive()
      expect(preSaleIsActiveState).to.equal(false);

      // public sale state change
      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
      let publicSaleIsActiveState = await goingApeSigVerifyNft.publicSaleIsActive()
      expect(publicSaleIsActiveState).to.equal(true);

      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(false)
      publicSaleIsActiveState = await goingApeSigVerifyNft.publicSaleIsActive()
      expect(publicSaleIsActiveState).to.equal(false);

      //baseu URI
      let newBaseUri = "https://baseuri.io/"
      await goingApeSigVerifyNft.connect(owner).setBaseURI(newBaseUri)
      let baseURI = await goingApeSigVerifyNft.baseURI()
      expect(baseURI).to.equal(newBaseUri);

      //set Cost
      let newCost = hre.ethers.utils.parseEther('1').toString(10)
      await goingApeSigVerifyNft.connect(owner).setPublicCost(newCost)
      let cost = await goingApeSigVerifyNft.publicSaleCost()
      expect(cost).to.equal(newCost);

    })
    it("token uri test", async function () {
      //baseu URI
      let newBaseUri = "https://baseuri.io/"
      await goingApeSigVerifyNft.connect(owner).setBaseURI(newBaseUri)
      let baseURI = await goingApeSigVerifyNft.baseURI()
      expect(baseURI).to.equal(newBaseUri);
      await goingApeSigVerifyNft.connect(owner).reserve(1, addr2.address)
      let uri = await goingApeSigVerifyNft.tokenURI(0)
      expect(uri).to.equal("https://baseuri.io/0");

      await goingApeSigVerifyNft.connect(owner).reserve(1, addr2.address)
      let uri2 = await goingApeSigVerifyNft.tokenURI(1)
      expect(uri2).to.equal("https://baseuri.io/1");
    })
    it("withdraw test", async function () {
      let signature = nftWhiteListSign(signPrivateKey, addr1.address, WHITELISTSALETYPE)
      await goingApeSigVerifyNft.connect(owner).setWhitelistSaleState(true)
      let unitPrice = await goingApeSigVerifyNft.whitelistSaleCost()
      await goingApeSigVerifyNft.connect(addr1).whitelistSaleMint(1, signature, { value: unitPrice.mul(1).toString(10) })
      let contractBalance = await ethers.provider.getBalance(goingApeSigVerifyNft.address)
      await expect(
        goingApeSigVerifyNft.connect(addr1).withdrawBalance(contractBalance)
      ).to.be.revertedWith("Ownable: caller is not the owner")
      const ownerBalance = await ethers.provider.getBalance(owner.address)
      await goingApeSigVerifyNft.connect(owner).withdrawBalance(contractBalance)

      const OwnerNewBalance = await ethers.provider.getBalance(owner.address)
      expect(OwnerNewBalance).to.gt(ownerBalance);
      let contractNewBalance = await ethers.provider.getBalance(goingApeSigVerifyNft.address)
      expect(contractNewBalance).to.equal(0);
    })
    it("test reserve mint", async function () {
      let reserveNum = 10
      const beforeReserveBalance = await goingApeSigVerifyNft.connect(owner.address).balanceOf(owner.address)
      await goingApeSigVerifyNft.connect(owner).reserve(reserveNum, owner.address)
      const afterReserveBalance = await goingApeSigVerifyNft.connect(owner.address).balanceOf(owner.address)
      expect(beforeReserveBalance + reserveNum).to.equal(afterReserveBalance);

    })
  });
  describe("long duration test", async function () {
    it("test excees private mint amount", async function () {
      let randomWallets = await ethers.getSigners();
      await goingApeSigVerifyNft.connect(owner).setPrivateSaleState(true)
      let unitCost = await goingApeSigVerifyNft.privateSaleCost()
      for (let i = 1; i <= 200; i++) {
        let index = i + 10
        let randomWallet = randomWallets[index]
        let signature = nftWhiteListSign(signPrivateKey, randomWallet.address, PRIVATESALETYPE)
        let batchAmount = await goingApeSigVerifyNft.MAX_PRIVATE_MINT()
        await goingApeSigVerifyNft.connect(randomWallet).privateSaleMint(batchAmount, signature, { value: unitCost.mul(batchAmount).toString(10) })
      }
      let signature = nftWhiteListSign(signPrivateKey, addr1.address, PRIVATESALETYPE)
      await expect(
        goingApeSigVerifyNft.connect(addr1).privateSaleMint(5, signature, { value: unitCost.mul(5).toString(10) })
      ).to.be.revertedWith("private sale cap reached");

    })
    it("mint max public nft", async function () {
      await expect(
        goingApeSigVerifyNft.connect(addr2).publicMint(1)
      ).to.be.revertedWith("public sale not open");
      let batchAmount = await goingApeSigVerifyNft.MAX_PUBLIC_MINT()
      let maxSupply = await goingApeSigVerifyNft.maxSupply()
      let reserveSupply = await goingApeSigVerifyNft.reserveSupply()
      let loopCount = (maxSupply - reserveSupply) / batchAmount

      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
      let unitPrice = await goingApeSigVerifyNft.publicSaleCost()
      let randomWallets = await ethers.getSigners();
      for (let i = 1; i <= loopCount; i++) {
        if (i % 100 == 0) {
          console.log(`mint ${i * batchAmount} nfts`)
        }
        let index = i + 10
        let randomWallet = randomWallets[index]
        await goingApeSigVerifyNft.connect(randomWallet).publicMint(batchAmount, { value: unitPrice.mul(batchAmount).toString(10) })
        let balanceOf = await goingApeSigVerifyNft.connect(randomWallet).balanceOf(randomWallet.address)
        expect(balanceOf).to.equal(batchAmount);
      }
      await expect(
        goingApeSigVerifyNft.connect(addr1).publicMint(1, { value: unitPrice.mul(1).toString(10) })
      ).to.be.revertedWith("cap reached");

      // mint reserve
      let reserveAmount = 500
      for (let i = 1; i <= reserveSupply / reserveAmount; i++) {
        await goingApeSigVerifyNft.connect(owner).reserve(reserveAmount, addr2.address)
      }
      await expect(
        goingApeSigVerifyNft.connect(owner).reserve(reserveAmount, addr2.address)
      ).to.be.revertedWith("cap reached");

      let totalSupply = await goingApeSigVerifyNft.totalSupply()
      expect(totalSupply).to.equal(maxSupply);
    })
    it("reserve exceed amount", async function () {
      let batchAmount = 10
      let reserveSupply = await goingApeSigVerifyNft.reserveSupply()
      for (let i = 1; i <= reserveSupply / batchAmount; i++) {
        await goingApeSigVerifyNft.connect(owner).reserve(batchAmount, addr2.address)
      }
      await expect(
        goingApeSigVerifyNft.connect(owner).reserve(batchAmount, addr2.address)
      ).to.be.revertedWith("max reserve amount exceeded");

    })

    it("reserve nft/public mints mix", async function () {
      let batchAmount = await goingApeSigVerifyNft.MAX_PUBLIC_MINT()
      await goingApeSigVerifyNft.connect(owner).reserve(500, addr2.address)
      await goingApeSigVerifyNft.connect(owner).setPublicSaleState(true)
      let unitPrice = await goingApeSigVerifyNft.publicSaleCost()
      let randomWallets = await ethers.getSigners();
      for (let i = 1; i <= 3000; i++) {
        let index = i + 10
        let randomWallet = randomWallets[index]
        await goingApeSigVerifyNft.connect(randomWallet).publicMint(batchAmount, { value: unitPrice.mul(batchAmount).toString(10) })
      }
      await goingApeSigVerifyNft.connect(owner).reserve(500, addr2.address)
      let maxSupply = await goingApeSigVerifyNft.maxSupply()
      let totalSupply = await goingApeSigVerifyNft.totalSupply()
      expect(totalSupply).to.equal(maxSupply);
    })
  })
});
