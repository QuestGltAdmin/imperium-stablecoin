const { expect } = require("chai");
const { ethers, upgrades, waffle } = require("hardhat");
const {Contract, Signer}= require('ethers')
const {BigNumber,BigNumberish} = require('bignumber.js')
const { imul, increaseTime } = require('./utils/utils')
require('dotenv').config()


let Ico$FractionPolicy= Contract,
  mockICO$Fraction= Contract
let deployer= Signer, user= Signer, handler= Signer
let prevEpoch= BigNumber, prevTime= BigNumber

async function mockedUpgradablePolicy() {
  // get signers
  const [deployer, user, handler] = await ethers.getSigners()
  // deploy mocks
  const mockICO$Fraction = await (
    await ethers.getContractFactory('ICO$Fraction')
  )
    .connect(deployer)
    .deploy()

  const mockBUSD = await (
    await ethers.getContractFactory('BUSD')
  )
    .connect(deployer)
    .deploy()
  // deploy upgradable contract
  const Ico$FractionPolicy = await upgrades.deployProxy(
    (await ethers.getContractFactory('ICO$FractionPolicy')).connect(deployer),
    [await deployer.getAddress(), mockICO$Fraction.address,mockBUSD.address],
    {
      initializer: 'initialize(address,address,address)',
    },
  )

  await Ico$FractionPolicy
    .connect(deployer)
    .setHandler(await handler.getAddress())
  // return entities
  return {
    deployer,
    user,
    handler,
    mockICO$Fraction,
    Ico$FractionPolicy,
  }
}

async function mockedUpgradablePolicyWithOpenRebaseWindow() {
  const {
    deployer,
    user,
    handler,
    mockICO$Fraction,
    Ico$FractionPolicy,
  } = await mockedUpgradablePolicy()
  await Ico$FractionPolicy.connect(deployer).setRebaseTimingParameters(60, 0, 60)
  return {
    deployer,
    user,
    handler,
    mockICO$Fraction,
    Ico$FractionPolicy,
  }
}

async function mockExternalData(
  Ico$FractionSupply= BigNumber,
) {
  await mockICO$Fraction.connect(deployer).totalSupply()
}

async function parseRebaseLog(response) {
  const receipt = (await (await response).wait())
  const logs = receipt.events.filter(
    (event) => event.event === 'LogRebase',
  )
  return logs[0].args
}

describe('ICO$FractionPolicy', function () {
  before('setup ICO$FractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should reject any ether sent to it', async function () {
    await expect(
      user.sendTransaction({ to: Ico$FractionPolicy.address, value: 1 }),
    ).to.be.reverted
  })
})

describe('ICO$FractionPolicy:initialize', async function () {
  describe('initial values set correctly', function () {
    before('setup Ico$FractionPolicy contract', async () => {
      ;({
        deployer,
        user,
        handler,
        mockICO$Fraction,
        Ico$FractionPolicy,
      } = await waffle.loadFixture(mockedUpgradablePolicy))
    })

    it('deviationThreshold', async function () {
      expect(await Ico$FractionPolicy.deviationThreshold()).to.eq(
        ethers.utils.parseUnits('5', 7),
      )
    })
    it('epoch', async function () {
      expect(await Ico$FractionPolicy.epoch()).to.eq(0)
    })
    it('globalImperiumEpochAndICO$Supply', async function () {
      const r = await Ico$FractionPolicy.globalImperiumEpochAndICO$Supply()
      expect(r[0]).to.eq(0)
      expect(r[1]).to.eq(0)
    })
    it('should set owner', async function () {
      expect(await Ico$FractionPolicy.owner()).to.eq(await deployer.getAddress())
    })
    it('should set reference to ICO$Fractions', async function () {
      expect(await Ico$FractionPolicy.Ico$Fracs()).to.eq(mockICO$Fraction.address)
    })
  })
})

describe('ICO$FractionPolicy:setHandler', async function () {
  before('setup Ico$FractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set handler', async function () {
    await Ico$FractionPolicy
      .connect(deployer)
      .setHandler(await user.getAddress())
    expect(await Ico$FractionPolicy.handler()).to.eq(await user.getAddress())
  })
})

describe('ICO$FractionPolicy:setProviderAddress', async function () {
  before('setup ICO$FractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
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
    
  await Ico$FractionPolicy
      .connect(deployer)
      .addProviderPair(await mockProvider.address,await mockProvider1.address)
    expect(await Ico$FractionPolicy.ratePair()).to.eq(
      await mockProvider.address,
    )
  })
})

describe('ICO$Fractions:setICO$StableProvider:accessControl', function () {
  before('setup Ico$FractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      Ico$FractionPolicy
        .connect(deployer)
        .setICO$StableProvider(await deployer.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      Ico$FractionPolicy.connect(user).setICO$StableProvider(await deployer.getAddress()),
    ).to.be.reverted
  })
})

describe('Ico$FractionPolicy:setHandler', async function () {
  before('setup Ico$FractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set handler', async function () {
    await Ico$FractionPolicy
      .connect(deployer)
      .setHandler(await user.getAddress())
    expect(await Ico$FractionPolicy.handler()).to.eq(await user.getAddress())
  })
})

describe('ICO$Fractions:setHandler:accessControl', function () {
  before('setup Ico$FractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      Ico$FractionPolicy
        .connect(deployer)
        .setHandler(await handler.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      Ico$FractionPolicy
        .connect(user)
        .setHandler(await handler.getAddress()),
    ).to.be.reverted
  })
})

describe('ICO$FractionPolicy:setDeviationThreshold', async function () {
  let prevThreshold= BigNumber, threshold= BigNumber
  before('setup Ico$FractionPolicy contract', async function () {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    prevThreshold = await Ico$FractionPolicy.deviationThreshold()
    threshold = prevThreshold.add(ethers.utils.parseUnits('1', 16))
    await Ico$FractionPolicy.connect(deployer).setDeviationThreshold(threshold)
  })

  it('should set deviationThreshold', async function () {
    expect(await Ico$FractionPolicy.deviationThreshold()).to.eq(threshold)
  })
})

describe('Ico$Fraction:setDeviationThreshold:accessControl', function () {
  before('setup Ico$FractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(Ico$FractionPolicy.connect(deployer).setDeviationThreshold(0)).to
      .not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(Ico$FractionPolicy.connect(user).setDeviationThreshold(0)).to.be
      .reverted
  })
})

describe('Ico$FractionPolicy:Rebase:accessControl', async function () {
  beforeEach('setup Ico$FractionPolicy contract', async function () {
    ;({
      deployer,
      user,
      handler,
      mockICO$Fraction,
      Ico$FractionPolicy,
    })
  })

  describe('when rebase called by non-handler', function () {
    it('should fail', async function () {
      await expect(Ico$FractionPolicy.connect(user).rebase()).to.be.reverted
    })
  })

  describe('when stabilize called by non-handler', function () {
    it('should fail', async function () {
      await expect(Ico$FractionPolicy.connect(user).stabilize()).to.be.reverted
    })
  })

  describe('when stabilize called by handler', function () {
    it('should not fail', async function () {
      await Ico$FractionPolicy
        .connect(deployer)
        .setHandler(await user.getAddress())
      await expect(Ico$FractionPolicy.connect(user).stabilize()).to.not.be.reverted
    })
  })
})
