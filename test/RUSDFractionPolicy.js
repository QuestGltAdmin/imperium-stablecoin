const { expect } = require("chai");
const { ethers, upgrades, waffle } = require("hardhat");
const {Contract, Signer}= require('ethers')
const {BigNumber,BigNumberish} = require('bignumber.js')
const { imul, increaseTime } = require('./utils/utils')
require('dotenv').config()


let rusdFractionPolicy= Contract,
  mockRUSDFraction= Contract
let deployer= Signer, user= Signer, handler= Signer
let prevEpoch= BigNumber, prevTime= BigNumber

async function mockedUpgradablePolicy() {
  // get signers
  const [deployer, user, handler] = await ethers.getSigners()
  // deploy mocks
  const mockRUSDFraction = await (
    await ethers.getContractFactory('RUSDFraction')
  )
    .connect(deployer)
    .deploy()

  const mockBUSD = await (
    await ethers.getContractFactory('Gold')
  )
    .connect(deployer)
    .deploy()
  // deploy upgradable contract
  const rusdFractionPolicy = await upgrades.deployProxy(
    (await ethers.getContractFactory('RUSDFractionPolicy')).connect(deployer),
    [await deployer.getAddress(), mockRUSDFraction.address,mockBUSD.address],
    {
      initializer: 'initialize(address,address,address)',
    },
  )

  await rusdFractionPolicy
    .connect(deployer)
    .setHandler(await handler.getAddress())
  // return entities
  return {
    deployer,
    user,
    handler,
    mockRUSDFraction,
    rusdFractionPolicy,
  }
}

async function mockedUpgradablePolicyWithOpenRebaseWindow() {
  const {
    deployer,
    user,
    handler,
    mockRUSDFraction,
    rusdFractionPolicy,
  } = await mockedUpgradablePolicy()
  await rusdFractionPolicy.connect(deployer).setRebaseTimingParameters(60, 0, 60)
  return {
    deployer,
    user,
    handler,
    mockRUSDFraction,
    rusdFractionPolicy,
  }
}

async function mockExternalData(
  rusdFractionSupply= BigNumber,
) {
  await mockRUSDFraction.connect(deployer).totalSupply()
}

async function parseRebaseLog(response) {
  const receipt = (await (await response).wait())
  const logs = receipt.events.filter(
    (event) => event.event === 'LogRebase',
  )
  return logs[0].args
}

describe('RUSDFractionPolicy', function () {
  before('setup RUSDFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should reject any ether sent to it', async function () {
    await expect(
      user.sendTransaction({ to: rusdFractionPolicy.address, value: 1 }),
    ).to.be.reverted
  })
})

describe('RUSDFractionPolicy:initialize', async function () {
  describe('initial values set correctly', function () {
    before('setup rusdFractionPolicy contract', async () => {
      ;({
        deployer,
        user,
        handler,
        mockRUSDFraction,
        rusdFractionPolicy,
      } = await waffle.loadFixture(mockedUpgradablePolicy))
    })

    it('deviationThreshold', async function () {
      expect(await rusdFractionPolicy.deviationThreshold()).to.eq(
        ethers.utils.parseUnits('5', 7),
      )
    })
    it('epoch', async function () {
      expect(await rusdFractionPolicy.epoch()).to.eq(0)
    })
    it('globalReflectoEpochAndRUSDSupply', async function () {
      const r = await rusdFractionPolicy.globalReflectoEpochAndRUSDSupply()
      expect(r[0]).to.eq(0)
      expect(r[1]).to.eq(0)
    })
    it('should set owner', async function () {
      expect(await rusdFractionPolicy.owner()).to.eq(await deployer.getAddress())
    })
    it('should set reference to RUSDFractions', async function () {
      expect(await rusdFractionPolicy.rusdFracs()).to.eq(mockRUSDFraction.address)
    })
  })
})

describe('RUSDFractionPolicy:setHandler', async function () {
  before('setup rusdFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set handler', async function () {
    await rusdFractionPolicy
      .connect(deployer)
      .setHandler(await user.getAddress())
    expect(await rusdFractionPolicy.handler()).to.eq(await user.getAddress())
  })
})

describe('RUSDFractionPolicy:setProviderAddress', async function () {
  before('setup RUSDFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set provider', async function () {
    
  const mockProvider = await (await ethers.getContractFactory('mockProvider')).connect(deployer).deploy()

  const mockProvider1 = await (await ethers.getContractFactory('mockProvider')).connect(deployer).deploy()
  
  await mockProvider
    .connect(deployer)
    .setReserves(1000000000,1000000000,1656457)

  await mockProvider1
    .connect(deployer)
    .setReserves(10000000,4000000000,1656457)
    
  await rusdFractionPolicy
      .connect(deployer)
      .addProviderPair(await mockProvider.address,await mockProvider1.address)
    expect(await rusdFractionPolicy.ratePair()).to.eq(
      await mockProvider.address,
    )
  })
})

describe('RUSDFractions:setRUSDStableProvider:accessControl', function () {
  before('setup rusdFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      rusdFractionPolicy
        .connect(deployer)
        .setRUSDStableProvider(await deployer.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      rusdFractionPolicy.connect(user).setRUSDStableProvider(await deployer.getAddress()),
    ).to.be.reverted
  })
})

describe('rusdFractionPolicy:setHandler', async function () {
  before('setup rusdFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set handler', async function () {
    await rusdFractionPolicy
      .connect(deployer)
      .setHandler(await user.getAddress())
    expect(await rusdFractionPolicy.handler()).to.eq(await user.getAddress())
  })
})

describe('RUSDFractions:setHandler:accessControl', function () {
  before('setup rusdFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      rusdFractionPolicy
        .connect(deployer)
        .setHandler(await handler.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      rusdFractionPolicy
        .connect(user)
        .setHandler(await handler.getAddress()),
    ).to.be.reverted
  })
})

describe('RUSDFractionPolicy:setDeviationThreshold', async function () {
  let prevThreshold= BigNumber, threshold= BigNumber
  before('setup rusdFractionPolicy contract', async function () {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    prevThreshold = await rusdFractionPolicy.deviationThreshold()
    threshold = prevThreshold.add(ethers.utils.parseUnits('1', 16))
    await rusdFractionPolicy.connect(deployer).setDeviationThreshold(threshold)
  })

  it('should set deviationThreshold', async function () {
    expect(await rusdFractionPolicy.deviationThreshold()).to.eq(threshold)
  })
})

describe('rusdFraction:setDeviationThreshold:accessControl', function () {
  before('setup rusdFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(rusdFractionPolicy.connect(deployer).setDeviationThreshold(0)).to
      .not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(rusdFractionPolicy.connect(user).setDeviationThreshold(0)).to.be
      .reverted
  })
})

describe('rusdFractionPolicy:Rebase:accessControl', async function () {
  beforeEach('setup rusdFractionPolicy contract', async function () {
    ;({
      deployer,
      user,
      handler,
      mockRUSDFraction,
      rusdFractionPolicy,
    })
  })

  describe('when rebase called by non-handler', function () {
    it('should fail', async function () {
      await expect(rusdFractionPolicy.connect(user).rebase()).to.be.reverted
    })
  })

  describe('when stabilize called by non-handler', function () {
    it('should fail', async function () {
      await expect(rusdFractionPolicy.connect(user).stabilize()).to.be.reverted
    })
  })

  describe('when stabilize called by handler', function () {
    it('should not fail', async function () {
      await rusdFractionPolicy
        .connect(deployer)
        .setHandler(await user.getAddress())
      await expect(rusdFractionPolicy.connect(user).stabilize()).to.not.be.reverted
    })
  })
})
