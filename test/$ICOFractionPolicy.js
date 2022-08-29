const { expect } = require("chai");
const { ethers, upgrades, waffle } = require("hardhat");
const {Contract, Signer}= require('ethers')
const {BigNumber,BigNumberish} = require('bignumber.js')
const { imul, increaseTime } = require('./utils/utils')
require('dotenv').config()


let $icoFractionPolicy= Contract,
  mock$ICOFraction= Contract
let deployer= Signer, user= Signer, handler= Signer
let prevEpoch= BigNumber, prevTime= BigNumber

async function mockedUpgradablePolicy() {
  // get signers
  const [deployer, user, handler] = await ethers.getSigners()
  // deploy mocks
  const mock$ICOFraction = await (
    await ethers.getContractFactory('$ICOFraction')
  )
    .connect(deployer)
    .deploy()

  const mockBUSD = await (
    await ethers.getContractFactory('BUSD')
  )
    .connect(deployer)
    .deploy()
  // deploy upgradable contract
  const $icoFractionPolicy = await upgrades.deployProxy(
    (await ethers.getContractFactory('$ICOFractionPolicy')).connect(deployer),
    [await deployer.getAddress(), mock$ICOFraction.address,mockBUSD.address],
    {
      initializer: 'initialize(address,address,address)',
    },
  )

  await $icoFractionPolicy
    .connect(deployer)
    .setHandler(await handler.getAddress())
  // return entities
  return {
    deployer,
    user,
    handler,
    mock$ICOFraction,
    $icoFractionPolicy,
  }
}

async function mockedUpgradablePolicyWithOpenRebaseWindow() {
  const {
    deployer,
    user,
    handler,
    mock$ICOFraction,
    $icoFractionPolicy,
  } = await mockedUpgradablePolicy()
  await $icoFractionPolicy.connect(deployer).setRebaseTimingParameters(60, 0, 60)
  return {
    deployer,
    user,
    handler,
    mock$ICOFraction,
    $icoFractionPolicy,
  }
}

async function mockExternalData(
  $icoFractionSupply= BigNumber,
) {
  await mock$ICOFraction.connect(deployer).totalSupply()
}

async function parseRebaseLog(response) {
  const receipt = (await (await response).wait())
  const logs = receipt.events.filter(
    (event) => event.event === 'LogRebase',
  )
  return logs[0].args
}

describe('$ICOFractionPolicy', function () {
  before('setup $ICOFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should reject any ether sent to it', async function () {
    await expect(
      user.sendTransaction({ to: $icoFractionPolicy.address, value: 1 }),
    ).to.be.reverted
  })
})

describe('$ICOFractionPolicy:initialize', async function () {
  describe('initial values set correctly', function () {
    before('setup $icoFractionPolicy contract', async () => {
      ;({
        deployer,
        user,
        handler,
        mock$ICOFraction,
        $icoFractionPolicy,
      } = await waffle.loadFixture(mockedUpgradablePolicy))
    })

    it('deviationThreshold', async function () {
      expect(await $icoFractionPolicy.deviationThreshold()).to.eq(
        ethers.utils.parseUnits('5', 7),
      )
    })
    it('epoch', async function () {
      expect(await $icoFractionPolicy.epoch()).to.eq(0)
    })
    it('globalImperiumEpochAnd$ICOSupply', async function () {
      const r = await $icoFractionPolicy.globalImperiumEpochAnd$ICOSupply()
      expect(r[0]).to.eq(0)
      expect(r[1]).to.eq(0)
    })
    it('should set owner', async function () {
      expect(await $icoFractionPolicy.owner()).to.eq(await deployer.getAddress())
    })
    it('should set reference to $ICOFractions', async function () {
      expect(await $icoFractionPolicy.$icoFracs()).to.eq(mock$ICOFraction.address)
    })
  })
})

describe('$ICOFractionPolicy:setHandler', async function () {
  before('setup $icoFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set handler', async function () {
    await $icoFractionPolicy
      .connect(deployer)
      .setHandler(await user.getAddress())
    expect(await $icoFractionPolicy.handler()).to.eq(await user.getAddress())
  })
})

describe('$ICOFractionPolicy:setProviderAddress', async function () {
  before('setup $ICOFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
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
    
  await $icoFractionPolicy
      .connect(deployer)
      .addProviderPair(await mockProvider.address,await mockProvider1.address)
    expect(await $icoFractionPolicy.ratePair()).to.eq(
      await mockProvider.address,
    )
  })
})

describe('$ICOFractions:set$ICOStableProvider:accessControl', function () {
  before('setup $icoFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      $icoFractionPolicy
        .connect(deployer)
        .set$ICOStableProvider(await deployer.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      $icoFractionPolicy.connect(user).set$ICOStableProvider(await deployer.getAddress()),
    ).to.be.reverted
  })
})

describe('$icoFractionPolicy:setHandler', async function () {
  before('setup $icoFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set handler', async function () {
    await $icoFractionPolicy
      .connect(deployer)
      .setHandler(await user.getAddress())
    expect(await $icoFractionPolicy.handler()).to.eq(await user.getAddress())
  })
})

describe('$ICOFractions:setHandler:accessControl', function () {
  before('setup $icoFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      $icoFractionPolicy
        .connect(deployer)
        .setHandler(await handler.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      $icoFractionPolicy
        .connect(user)
        .setHandler(await handler.getAddress()),
    ).to.be.reverted
  })
})

describe('$ICOFractionPolicy:setDeviationThreshold', async function () {
  let prevThreshold= BigNumber, threshold= BigNumber
  before('setup $icoFractionPolicy contract', async function () {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    prevThreshold = await $icoFractionPolicy.deviationThreshold()
    threshold = prevThreshold.add(ethers.utils.parseUnits('1', 16))
    await $icoFractionPolicy.connect(deployer).setDeviationThreshold(threshold)
  })

  it('should set deviationThreshold', async function () {
    expect(await $icoFractionPolicy.deviationThreshold()).to.eq(threshold)
  })
})

describe('$icoFraction:setDeviationThreshold:accessControl', function () {
  before('setup $icoFractionPolicy contract', async () => {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect($icoFractionPolicy.connect(deployer).setDeviationThreshold(0)).to
      .not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect($icoFractionPolicy.connect(user).setDeviationThreshold(0)).to.be
      .reverted
  })
})

describe('$icoFractionPolicy:Rebase:accessControl', async function () {
  beforeEach('setup $icoFractionPolicy contract', async function () {
    ;({
      deployer,
      user,
      handler,
      mock$ICOFraction,
      $icoFractionPolicy,
    })
  })

  describe('when rebase called by non-handler', function () {
    it('should fail', async function () {
      await expect($icoFractionPolicy.connect(user).rebase()).to.be.reverted
    })
  })

  describe('when stabilize called by non-handler', function () {
    it('should fail', async function () {
      await expect($icoFractionPolicy.connect(user).stabilize()).to.be.reverted
    })
  })

  describe('when stabilize called by handler', function () {
    it('should not fail', async function () {
      await $icoFractionPolicy
        .connect(deployer)
        .setHandler(await user.getAddress())
      await expect($icoFractionPolicy.connect(user).stabilize()).to.not.be.reverted
    })
  })
})
