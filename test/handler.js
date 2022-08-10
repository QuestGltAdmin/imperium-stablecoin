const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { Contract, Signer } = require('ethers')
const { increaseTime } = require('./utils/utils')

require('dotenv').config()

let handler = Contract
let deployer = Signer, user = Signer
let r = Promise

async function mockedHandler() {
  await increaseTime(86400)

  // get signers
  const [deployer, user] = await ethers.getSigners()
  // deploy mocks
  const mock$ICOFraction = await (
    await ethers.getContractFactory('$ICOFraction')
  )
    .connect(deployer)
    .deploy()
  const mockBUSD = await (
      await ethers.getContractFactory('Gold')
    )
      .connect(deployer)
      .deploy()
  // deploy upgradable contract
  const mockPolicy = await upgrades.deployProxy(
    (await ethers.getContractFactory('$ICOFractionPolicy')).connect(deployer),
    [await deployer.getAddress(), mock$ICOFraction.address,mockBUSD.address],
    {
      initializer: 'initialize(address,address,address)',
    },
  )
  
  const mockProvider = await (await ethers.getContractFactory('mockProvider')).connect(deployer).deploy()

  const mockProvider1 = await (await ethers.getContractFactory('mockProvider')).connect(deployer).deploy()

  const mockRouter = await (await ethers.getContractFactory('mockRouter')).connect(deployer).deploy()

  const wbnb = await (await ethers.getContractFactory('Gold')).connect(deployer).deploy()

  await mockProvider
    .connect(deployer)
    .setReserves(1000000000,1000000000,1656457)
  
  await mockProvider1
    .connect(deployer)
    .setReserves(10000000,4000000000,1656457)

  const handler = await (await ethers.getContractFactory('Handler'))
    .connect(deployer)
    .deploy(mockPolicy.address,mockRouter.address,mock$ICOFraction.address,wbnb.address)

  const mockDownstream = await (await ethers.getContractFactory('MockDownstream')).connect(deployer).deploy()
  await mockPolicy.connect(deployer).addProviderPair(await mockProvider.address,await mockProvider1.address)
  await mockPolicy
    .connect(deployer)
    .setHandler(handler.address)

  return {
    deployer,
    user,
    handler,
    mockDownstream,
    mockProvider,
  }
}

describe('Handler', function () {
  before('setup Handler contract', async () => {
    ; ({ deployer, user, handler, mockDownstream } =
      await waffle.loadFixture(mockedHandler))
  })

  describe('when rebase called by a contract', function () {
    it('should fail', async function () {
      const rebaseCallerContract = await (
        await ethers.getContractFactory('RebaseCallerContract')
      )
        .connect(deployer)
        .deploy()
      await expect(rebaseCallerContract.callRebase(handler.address)).to.be
        .reverted
    })
  })

  describe('when rebase called by a contract which is being constructed', function () {
    it('should fail', async function () {
      await expect(
        (await ethers.getContractFactory('ConstructorRebaseCallerContract'))
          .connect(deployer)
          .deploy(handler.address),
      ).to.be.reverted
    })
  })

  describe('Access Control', function () {

    describe('transferOwnership', async function () {
      it('should transfer ownership', async function () {
        expect(await handler.owner()).to.eq(await deployer.getAddress())
        await handler
          .connect(deployer)
          .transferOwnership(user.getAddress())
        expect(await handler.owner()).to.eq(await user.getAddress())
      })
    })
  })
})