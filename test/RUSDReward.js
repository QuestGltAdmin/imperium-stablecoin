
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { Contract, Signer, BigNumber } = require('ethers');
require('dotenv').config()


const toRUSDFracDenomination = (reflecto) =>
  ethers.utils.parseUnits(reflecto, DECIMALS)

const DECIMALS = 9
const INITIAL_SUPPLY = ethers.utils.parseUnits('50', 6 + DECIMALS)
const MAX_UINT256 = ethers.BigNumber.from(2).pow(256).sub(1)
const TOTAL_FRACS = MAX_UINT256.sub(MAX_UINT256.mod(INITIAL_SUPPLY))

let accounts = Signer[9],
  deployer = Signer,
  rusdFraction = Contract,
  rusdReward = Contract

async function setupContracts() {
  // prepare signers
  accounts = await ethers.getSigners()
  deployer = accounts[0]

  const RUSDFraction = await (await ethers.getContractFactory('RUSDFraction')).connect(deployer).deploy()
  rusdReward = await (await ethers.getContractFactory('RUSDRewards'))
  .connect(deployer)
  .deploy(RUSDFraction.address)
  const factory = await ethers.getContractFactory('RUSDFraction')
  rusdFraction = await upgrades.deployProxy(
    factory,
    [await deployer.getAddress(),rusdReward.address],
    {
      initializer: 'initialize(address,address)',
    },
  )
  await rusdReward.updateRUSD(rusdFraction.address)
}

describe('RUSDRewards', () => {
    before('setup RUSDReward contract', setupContracts)
  
    it('should reject any ether sent to it', async function () {
      const user = accounts[1]
      await expect(user.sendTransaction({ to: await rusdReward.address, value: 1 })).to
        .be.reverted
    })
  })

describe("RUSDReward:AddReward", function () {
    let rewardToken = Contract;
    let developer = Signer;
    let reflectoAdd = Signer;
    let liquidityPool = Signer;
    let tokenUser = Signer;
  
    before('setup rusdReward contract', async function () {
    rewardToken = await (await ethers.getContractFactory('Gold')).connect(deployer).deploy()
      developer = accounts[4];
      reflectoAdd = accounts[5];
      liquidityPool = accounts[6];
      tokenUser = accounts[7];
      
      await rusdFraction.connect(deployer).setDeveloperAddress(await developer.getAddress())
      await rusdFraction.connect(deployer).setLiquidityPool(await liquidityPool.getAddress())
      await rusdFraction.connect(deployer).setReflectoContractAddress(await reflectoAdd.getAddress())

      await rusdReward.connect(deployer).setDeveloperAddress(await developer.getAddress())
      await rusdReward.connect(deployer).setReflectoContractAddress(await reflectoAdd.getAddress())
    })
  
    it('Let unapproved tokens add', async function () {
      await rewardToken.connect(tokenUser).approve(await rusdReward.address, 100000000000)
      await rusdReward.connect(tokenUser).addReward(await rewardToken.address, 10, 1000, 100000, {
        value: ethers.utils.parseEther("1")
      });
      expect(await rusdReward.rewardStatus(await rewardToken.address)).to.eq(1);
    })
  
    it("sends 50-50 ether to reflecto contract and developer address", async function () {
      expect(await developer.getBalance()).to.eq(await reflectoAdd.getBalance())
    })
  
    it("revert approvedReward tokens default reward token not set", async function () {
      await expect(rusdReward.connect(deployer).approveReward(await rewardToken.address))
        .to.be.reverted;
    })
  })
  
  describe("RUSDRewards:Claim", () => {
    let developer = Signer;
    let rewardTokens = [];
    let rewardtoken;
    let rewardToken = Contract;
    let defaultToken = Contract;
    let tokenUser = Signer;
    let reflectoAdd = Signer;
    before('setup rusdFraction contract', async  () => {
      await setupContracts()
      defaultToken = await (await ethers.getContractFactory('Gold'))
        .connect(deployer)
        .deploy()
      rewardToken = await (await ethers.getContractFactory('Gold'))
      .connect(deployer)
      .deploy()
      developer = accounts[4];
      tokenUser = accounts[7];
      reflectoAdd = accounts[9]
    
      await defaultToken.connect(deployer).approve(await rusdReward.address, 100000000000000)
      await rusdReward.connect(deployer).setDefaultToken(await defaultToken.address)
      await defaultToken.connect(deployer).transfer(await rusdReward.address,100000000000)
      await rusdReward.connect(deployer).setDefaultReward(10, 1000, 100000)

      await rusdReward.connect(deployer).setDeveloperAddress(await developer.getAddress())
      await rusdReward.connect(deployer).setReflectoContractAddress(await reflectoAdd.getAddress())

      rewardtoken = await rewardToken.address;
      prevDeployerBalance= await rewardToken.balanceOf(await deployer.getAddress());
    })
  
    it("Revert claiming unapproved tokens", async  () => {
      await expect(rusdReward.connect(deployer).claim(await deployer.getAddress(), [rewardtoken]))
        .to.be.reverted;
    })
    it("Claim amount cannot be less than 0 due to instant claim", async function(){
      await rewardToken.connect(deployer).approve(await rusdReward.address, 10000000000000)
      await rusdReward.connect(deployer).addReward(await rewardToken.address, 1, 86400, 100000000, {
        value: ethers.utils.parseEther("1")
      })
      const balanceOfContractBefore = ethers.utils.formatEther(await reflectoAdd.getBalance());
      const balanceOfDevBefore = ethers.utils.formatEther(await developer.getBalance());

      await rusdReward.connect(deployer).approveReward(await rewardToken.address);

      const balanceOfContractAfter = ethers.utils.formatEther(await reflectoAdd.getBalance());
      const balanceOfDevAfter = ethers.utils.formatEther(await developer.getBalance());

      expect(0.5+parseFloat(balanceOfContractBefore)).to.be.eq(parseFloat(balanceOfContractAfter))
      expect(0.5+parseFloat(balanceOfDevBefore)).to.be.eq(parseFloat(balanceOfDevAfter))

      await expect(rusdReward.connect(deployer).claim(await deployer.getAddress(), [rewardtoken]))
      .to.be.reverted;
    })
    it("should claim", async function(){
      // Transfer tokens
      // console.log((await rusdFraction.balanceOf(await deployer.getAddress())).toString())
      await rusdFraction.connect(deployer).transfer(await tokenUser.getAddress(), toRUSDFracDenomination('750'))
      // cannot add waiting time which is need to be added
      await ethers.provider.send('evm_increaseTime', [3000]);
      await ethers.provider.send('evm_mine');
      const tokensBeforeClaim = (await rewardToken.balanceOf(await tokenUser.getAddress())).toNumber()
      await rusdReward.connect(deployer).claim(await tokenUser.getAddress(), [rewardtoken])
      const tokensAfterClaim = (await rewardToken.balanceOf(await tokenUser.getAddress())).toNumber()
      expect(tokensBeforeClaim).to.be.lessThan(tokensAfterClaim)
    })

    it("estiate rewards per day", async function(){
      expect((await rusdReward.rewardsPerDay(await tokenUser.getAddress(), rewardtoken)).toNumber()).to.exist
    })
  })
  
  describe("RUSDRewards:ApproveReward", function () {
    before('setup rusdRewards contract', async function () {
      defaultToken = await (await ethers.getContractFactory('Gold'))
        .connect(deployer)
        .deploy()
      rewardToken = await (await ethers.getContractFactory('Gold'))
      .connect(deployer)
      .deploy()
    await rusdReward.connect(deployer).setDefaultToken(await defaultToken.address)
    await defaultToken.connect(deployer).transfer(rusdReward.address,1000000000)
    await rusdReward.connect(deployer).setDefaultReward(10, 1000, 100000)
    })
    it("reject approved tokens", async function () {
      await expect(rusdReward.connect(deployer).approveReward(await rewardToken.address))
        .to.be.reverted;
    })
    it("approve pending tokens", async function () {
      await rewardToken.connect(deployer).approve(await rusdReward.address, 1000000000)
      await rusdReward.connect(deployer).addReward(await rewardToken.address, 10, 1000, 100000, {
        value: ethers.utils.parseEther("1.0")
      })
      await expect(rusdReward.connect(deployer).approveReward(await rewardToken.address))
        .to.not.be.reverted;
    })
  })

  describe("RUSDRewards:RejectReward", function () {
    before('setup rusdRewards contract', async function () {
      defaultToken = await (await ethers.getContractFactory('Gold'))
        .connect(deployer)
        .deploy()
      rewardToken = await (await ethers.getContractFactory('Gold'))
      .connect(deployer)
      .deploy()
    await rusdReward.connect(deployer).setDefaultToken(await defaultToken.address)
    await defaultToken.connect(deployer).transfer(rusdReward.address,1000000000)
    await rusdReward.connect(deployer).setDefaultReward(10, 1000, 100000)
    })

    it("reject pending tokens", async function () {
      await rewardToken.connect(deployer).approve(await rusdReward.address, 1000000000)
      await rusdReward.connect(deployer).addReward(await rewardToken.address, 10, 1000, 100000, {
        value: ethers.utils.parseEther("1.0")
      })
      const balanceAfterAdd = ethers.utils.formatEther(await deployer.getBalance());
      await expect(rusdReward.connect(deployer).rejectPool(await rewardToken.address))
        .to.not.be.reverted;
      const balanceAfterReject = ethers.utils.formatEther(await deployer.getBalance());
      expect((parseFloat(balanceAfterAdd)+1).toFixed(2)).to.eq(parseFloat(balanceAfterReject).toFixed(2))
    })
  })
  
  
  
  describe("RUSDRewards:setReward", function(){
    before('setup rusdRewards contract', async function(){
      rewardToken= await (await ethers.getContractFactory('Gold'))
      .connect(deployer)
      .deploy()
      await rusdReward.connect(deployer).setDefaultToken(await rewardToken.address)
    })
    it("set default reward function", async function(){
      await expect(rusdReward.connect(deployer).setDefaultReward(10,86400,10000))
      .to.not.be.reverted;
  
    })
  
  })