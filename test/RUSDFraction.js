const { expect } = require("chai");
const { ethers, upgrades, network } = require("hardhat");
const { Contract, Signer, BigNumber } = require('ethers')
require('dotenv').config()

const toRUSDFracDenomination = (reflecto) =>
  ethers.utils.parseUnits(reflecto, DECIMALS)

const DECIMALS = 9
const INITIAL_SUPPLY = ethers.utils.parseUnits('50', 6 + DECIMALS)
const MAX_UINT256 = ethers.BigNumber.from(2).pow(256).sub(1)
const TOTAL_FRACS = MAX_UINT256.sub(MAX_UINT256.mod(INITIAL_SUPPLY))

const transferAmount = toRUSDFracDenomination('10')
const unitTokenAmount = toRUSDFracDenomination('1')

let accounts = Signer[15],
  deployer = Signer,
  rusdFraction = Contract,
  initialSupply = BigNumber

async function setupContracts() {
  // prepare signers
  accounts = await ethers.getSigners()
  deployer = accounts[0]
  // deploy upgradable token
  const RUSDFraction = await (await ethers.getContractFactory('RUSDFraction')).connect(deployer).deploy()
  const rusdReward = await (await ethers.getContractFactory('RUSDRewards'))
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
  // fetch initial supply
  initialSupply = await rusdFraction.totalSupply()
}

describe('RUSDFraction', () => {
  before('setup RUSDFraction contract', setupContracts)

  it('should reject any ether sent to it', async function () {
    const user = accounts[1]
    await expect(user.sendTransaction({ to: rusdFraction.address, value: 1 })).to
      .be.reverted
  })
})

describe('RUSDFraction:Initialization', () => {
  before('setup RUSDFraction contract', setupContracts)

  it('should transfer 50M rusdFraction to the deployer', async function () {
    expect(await rusdFraction.balanceOf(await deployer.getAddress())).to.eq(
      INITIAL_SUPPLY,
    )
  })

  it('should set the totalSupply to 50M', async function () {
    expect(await rusdFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
  })

  it('should set the owner', async function () {
    expect(await rusdFraction.owner()).to.eq(await deployer.getAddress())
  })

  it('should set detailed ERC20 parameters', async function () {
    expect(await rusdFraction.name()).to.eq('REFLECTO USD')
    expect(await rusdFraction.symbol()).to.eq('RUSD')
    expect(await rusdFraction.decimals()).to.eq(DECIMALS)
  })
})

describe('RUSDFraction:setMonetaryPolicy', async () => {
  let policy = Signer, policyAddress = Contract

  before('setup RUSDFractions contract', async () => {
    await setupContracts()
    policy = accounts[1]
    policyAddress = await policy.getAddress()
  })
  it('should set reference to policy contract', async function () {
    await expect(rusdFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.emit(rusdFraction, 'LogMonetaryPolicyUpdated')
      .withArgs(policyAddress)
    expect(await rusdFraction.monetaryPolicy()).to.eq(policyAddress)
  })
})

describe('rusdFraction:setMonetaryPolicy:accessControl', async () => {
  let policy = Signer, policyAddress = Contract

  before('setup rusdFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    policyAddress = await policy.getAddress()
  })

  it('should be callable by owner', async function () {
    await expect(rusdFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
  })
})

describe('RUSDFraction:setMonetaryPolicy:accessControl', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer

  before('setup rusdFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(rusdFraction.connect(user).setMonetaryPolicy(policyAddress)).to
      .be.reverted
  })
})

describe('RUSDFraction:Rebase:accessControl', async () => {
  let user = Signer, policyAddress = Contract

  before('setup rusdFraction contract', async function () {
    await setupContracts()
    user = accounts[1]
    policyAddress = await user.getAddress()
    await rusdFraction.connect(deployer).setMonetaryPolicy(policyAddress)
  })

  it('should be callable by monetary policy', async function () {
    await expect(rusdFraction.connect(user).rebase(1, transferAmount)).to.not.be
      .reverted
  })

  it('should not be callable by others', async function () {
    await expect(rusdFraction.connect(deployer).rebase(1, transferAmount)).to.be
      .reverted
  })
})

describe('RUSDFraction:Rebase:Expansion', async () => {
  // Rebase +5M (10%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer
  const rebaseAmt = INITIAL_SUPPLY.div(10)

  before('setup rusdFraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await rusdFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await rusdFraction
      .connect(deployer)
      .transfer(await A.getAddress(), toRUSDFracDenomination('750'))
    await rusdFraction
      .connect(deployer)
      .transfer(await B.getAddress(), toRUSDFracDenomination('250'))

    expect(await rusdFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await rusdFraction.balanceOf(await A.getAddress())).to.eq(
      toRUSDFracDenomination('726.75'),
    )
    expect(await rusdFraction.balanceOf(await B.getAddress())).to.eq(
      toRUSDFracDenomination('242.25'),
    )

    expect(await rusdFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await rusdFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1683038017064390900481604267101278740647279227115085598313515489250000000',
    )
    expect(await rusdFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '561012672354796966827201422367092913549093075705028532771171829750000000',
    )
  })

  it('should emit Rebase', async function () {
    await expect(rusdFraction.connect(policy).rebase(1, rebaseAmt))
      .to.emit(rusdFraction, 'LogRebase')
      .withArgs(1, initialSupply.add(rebaseAmt))
  })

  it('should increase the totalSupply', async function () {
    expect(await rusdFraction.totalSupply()).to.eq(initialSupply.add(rebaseAmt))
  })

  it('should NOT CHANGE the scaledTotalSupply', async function () {
    expect(await rusdFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should increase individual balances', async function () {
    expect(await rusdFraction.balanceOf(await A.getAddress())).to.eq(
      toRUSDFracDenomination('799.425'),
    )
    expect(await rusdFraction.balanceOf(await B.getAddress())).to.eq(
      toRUSDFracDenomination('266.475'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await rusdFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1683038017064390900481604267101278740647279227115085598313515489250000000',
    )
    expect(await rusdFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '561012672354796966827201422367092913549093075705028532771171829750000000',
    )
  })

  it('should return the new supply', async function () {
    await rusdFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    const returnVal = await rusdFraction
      .connect(policy)
      .callStatic.rebase(2, rebaseAmt)
    await rusdFraction.connect(policy).rebase(2, rebaseAmt)
    expect(await rusdFraction.totalSupply()).to.eq(returnVal)
  })
})

describe('RUSDFraction:Rebase:Expansion', async function () {
  let policy = Signer
  const MAX_SUPPLY = ethers.BigNumber.from(2).pow(128).sub(1)
  describe('when totalSupply is less than MAX_SUPPLY and expands beyond', function () {
    before('setup rusdFraction contract', async function () {
      await setupContracts()
      policy = accounts[1]
      const totalSupply = await rusdFraction.totalSupply.call()
      await rusdFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
      await rusdFraction
        .connect(policy)
        .rebase(1, MAX_SUPPLY.sub(totalSupply).sub(toRUSDFracDenomination('1')))
    })

    it('should emit Rebase', async function () {
      await expect(
        rusdFraction.connect(policy).rebase(2, toRUSDFracDenomination('2')),
      )
        .to.emit(rusdFraction, 'LogRebase')
        .withArgs(2, MAX_SUPPLY)
    })

    it('should increase the totalSupply to MAX_SUPPLY', async function () {
      expect(await rusdFraction.totalSupply()).to.eq(MAX_SUPPLY)
    })
  })

  describe('when totalSupply is MAX_SUPPLY and expands', function () {
    before(async function () {
      expect(await rusdFraction.totalSupply()).to.eq(MAX_SUPPLY)
    })

    it('should emit Rebase', async function () {
      await expect(
        rusdFraction.connect(policy).rebase(3, toRUSDFracDenomination('2')),
      )
        .to.emit(rusdFraction, 'LogRebase')
        .withArgs(3, MAX_SUPPLY)
    })

    it('should NOT change the totalSupply', async function () {
      expect(await rusdFraction.totalSupply()).to.eq(MAX_SUPPLY)
    })
  })
})

describe('RUSDFraction:Rebase:NoChange', function () {
  // Rebase (0%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer

  before('setup rusdFraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await rusdFraction
      .connect(deployer)
      .transfer(await A.getAddress(), toRUSDFracDenomination('750'))
    await rusdFraction
      .connect(deployer)
      .transfer(await B.getAddress(), toRUSDFracDenomination('250'))

    expect(await rusdFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await rusdFraction.balanceOf(await A.getAddress())).to.eq(
      toRUSDFracDenomination('726.75'),
    )
    expect(await rusdFraction.balanceOf(await B.getAddress())).to.eq(
      toRUSDFracDenomination('242.25'),
    )

    expect(await rusdFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await rusdFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1683038017064390900481604267101278740647279227115085598313515489250000000',
    )
    expect(await rusdFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '561012672354796966827201422367092913549093075705028532771171829750000000',
    )
  })

  it('should emit Rebase', async function () {
    await rusdFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await expect(rusdFraction.connect(policy).rebase(1, 0))
      .to.emit(rusdFraction, 'LogRebase')
      .withArgs(1, initialSupply)
  })

  it('should NOT CHANGE the totalSupply', async function () {
    expect(await rusdFraction.totalSupply()).to.eq(initialSupply)
  })

  it('should NOT CHANGE the scaledTotalSupply', async function () {
    expect(await rusdFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should NOT CHANGE individual balances', async function () {
    expect(await rusdFraction.balanceOf(await A.getAddress())).to.eq(
      toRUSDFracDenomination('726.75'),
    )
    expect(await rusdFraction.balanceOf(await B.getAddress())).to.eq(
      toRUSDFracDenomination('242.25'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await rusdFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1683038017064390900481604267101278740647279227115085598313515489250000000',
    )
    expect(await rusdFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '561012672354796966827201422367092913549093075705028532771171829750000000',
    )
  })
})

describe('RUSDFraction:Rebase:Contraction', function () {
  // Rebase -5M (-10%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer
  const rebaseAmt = INITIAL_SUPPLY.div(10)

  before('setup rusdFraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await rusdFraction
      .connect(deployer)
      .transfer(await A.getAddress(), toRUSDFracDenomination('750'))
    await rusdFraction
      .connect(deployer)
      .transfer(await B.getAddress(), toRUSDFracDenomination('250'))

    expect(await rusdFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await rusdFraction.balanceOf(await A.getAddress())).to.eq(
      toRUSDFracDenomination('726.75'),
    )
    expect(await rusdFraction.balanceOf(await B.getAddress())).to.eq(
      toRUSDFracDenomination('242.25'),
    )

    expect(await rusdFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await rusdFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1683038017064390900481604267101278740647279227115085598313515489250000000',
    )
    expect(await rusdFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '561012672354796966827201422367092913549093075705028532771171829750000000',
    )
  })

  it('should emit Rebase', async function () {
    await rusdFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await expect(rusdFraction.connect(policy).rebase(1, -rebaseAmt))
      .to.emit(rusdFraction, 'LogRebase')
      .withArgs(1, initialSupply.sub(rebaseAmt))
  })

  it('should decrease the totalSupply', async function () {
    expect(await rusdFraction.totalSupply()).to.eq(initialSupply.sub(rebaseAmt))
  })

  it('should NOT. CHANGE the scaledTotalSupply', async function () {
    expect(await rusdFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should decrease individual balances', async function () {
    expect(await rusdFraction.balanceOf(await A.getAddress())).to.eq(
      toRUSDFracDenomination('654.075'),
    )
    expect(await rusdFraction.balanceOf(await B.getAddress())).to.eq(
      toRUSDFracDenomination('218.025'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await rusdFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1683038017064390900481604267101278740647279227115085598313515489250000000',
    )
    expect(await rusdFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '561012672354796966827201422367092913549093075705028532771171829750000000',
    )
  })
})

describe('RUSDFraction:Transfer', function () {
  let UserA = Signer, UserB = Signer, UserC = Signer, developer = Signer, liquidityPool = Signer, ReflectoPool = Signer, ReflectoContract = Signer, provider = Signer

  before('setup rusdFraction contract', async () => {
    await setupContracts()
    developer = accounts[5]
    liquidityPool = accounts[6]
    ReflectoPool = accounts[7]
    ReflectoContract = accounts[8]
    provider = accounts[9]
    UserA = accounts[10]
    UserB = accounts[11]
    UserC = accounts[12]
    // await rusdFraction.connect(deployer).initialize(await developer.getAddress())
    await rusdFraction.connect(deployer).setDeveloperAddress(await developer.getAddress())
    await rusdFraction.connect(deployer).setLiquidityPool(await liquidityPool.getAddress())
    await rusdFraction.connect(deployer).setReflectoPoolAddress(await ReflectoPool.getAddress())
    await rusdFraction.connect(deployer).setReflectoContractAddress(await ReflectoContract.getAddress())
    await rusdFraction.connect(deployer).addProviderPair(await provider.getAddress())
  })

  describe('deployer transfers sell', function () {
    it('should have correct balances', async function () {
      const deployerBefore = await rusdFraction.balanceOf(
        await deployer.getAddress(),
      )
      await rusdFraction
        .connect(deployer)
        .transfer(await provider.getAddress(), toRUSDFracDenomination('10'))
      expect(await rusdFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(toRUSDFracDenomination('10')),
      )
      expect(await rusdFraction.balanceOf(await provider.getAddress())).to.eq(
        toRUSDFracDenomination('9.64'),
      )
      expect(await rusdFraction.balanceOf(await developer.getAddress())).to.eq(
        toRUSDFracDenomination('0.01'),
      )
      expect(await rusdFraction.balanceOf(await liquidityPool.getAddress())).to.eq(
        toRUSDFracDenomination('0.3'),
      )
      expect(await rusdFraction.balanceOf(await ReflectoPool.getAddress())).to.eq(
        toRUSDFracDenomination('0.025'),
      )
      expect(await rusdFraction.balanceOf(await ReflectoContract.getAddress())).to.eq(
        toRUSDFracDenomination('0.025'),
      )
    })
  })

  describe('deployer transfers 100 to userA', async function () {
    it('should have correct balances', async function () {
      const deployerBefore = await rusdFraction.balanceOf(
        await deployer.getAddress(),
      )
      const developerBefore = await rusdFraction.balanceOf(
        await developer.getAddress(),
      )
      const liquiditypoolBefore = await rusdFraction.balanceOf(
        await liquidityPool.getAddress(),
      )
      const reflectopoolBefore = await rusdFraction.balanceOf(
        await ReflectoPool.getAddress(),
      )
      const reflectoContractBefore = await rusdFraction.balanceOf(
        await ReflectoContract.getAddress(),
      )
      await rusdFraction
        .connect(deployer)
        .transfer(await UserA.getAddress(), toRUSDFracDenomination('100'))
      expect(await rusdFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(toRUSDFracDenomination('100')),
      )
      expect(await rusdFraction.balanceOf(await UserA.getAddress())).to.eq(
        toRUSDFracDenomination('96.9'),
      )
      expect(await rusdFraction.balanceOf(await developer.getAddress())).to.eq(
        developerBefore.add(toRUSDFracDenomination('0.1')),
      )
      expect(await rusdFraction.balanceOf(await liquidityPool.getAddress())).to.eq(
        liquiditypoolBefore.add(toRUSDFracDenomination('3')),
      )
      expect(await rusdFraction.balanceOf(await ReflectoPool.getAddress())).to.eq(
        reflectopoolBefore.add(toRUSDFracDenomination('0')),
      )
      expect(await rusdFraction.balanceOf(await ReflectoContract.getAddress())).to.eq(
        reflectoContractBefore.add(toRUSDFracDenomination('0')),
      )
    })
  })

  describe('deployer transfers 200 to userB', async function () {
    it('should have correct balances', async function () {
      const deployerBefore = await rusdFraction.balanceOf(
        await deployer.getAddress(),
      )
      const developerBefore = await rusdFraction.balanceOf(
        await developer.getAddress(),
      )
      const liquiditypoolBefore = await rusdFraction.balanceOf(
        await liquidityPool.getAddress(),
      )
      const reflectopoolBefore = await rusdFraction.balanceOf(
        await ReflectoPool.getAddress(),
      )
      const reflectoContractBefore = await rusdFraction.balanceOf(
        await ReflectoContract.getAddress(),
      )
      await rusdFraction
        .connect(deployer)
        .transfer(await UserB.getAddress(), toRUSDFracDenomination('200'))
      expect(await rusdFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(toRUSDFracDenomination('200')),
      )
      expect(await rusdFraction.balanceOf(await UserB.getAddress())).to.eq(
        toRUSDFracDenomination('193.8'),
      )
      expect(await rusdFraction.balanceOf(await developer.getAddress())).to.eq(
        developerBefore.add(toRUSDFracDenomination('0.2')),
      )
      expect(await rusdFraction.balanceOf(await liquidityPool.getAddress())).to.eq(
        liquiditypoolBefore.add(toRUSDFracDenomination('6')),
      )
      expect(await rusdFraction.balanceOf(await ReflectoPool.getAddress())).to.eq(
        reflectopoolBefore.add(toRUSDFracDenomination('0')),
      )
      expect(await rusdFraction.balanceOf(await ReflectoContract.getAddress())).to.eq(
        reflectoContractBefore.add(toRUSDFracDenomination('0')),
      )
    })
  })

  describe('deployer transfers 100 Buy fees', function () {
    it('should have correct balances', async function () {
      const deployerBefore = await rusdFraction.balanceOf(
        await deployer.getAddress(),
      )
      const providerBefore = await rusdFraction.balanceOf(
        await provider.getAddress(),
      )
      const developerBefore = await rusdFraction.balanceOf(
        await developer.getAddress(),
      )
      const liquiditypoolBefore = await rusdFraction.balanceOf(
        await liquidityPool.getAddress(),
      )
      const reflectopoolBefore = await rusdFraction.balanceOf(
        await ReflectoPool.getAddress(),
      )
      const reflectoContractBefore = await rusdFraction.balanceOf(
        await ReflectoContract.getAddress(),
      )
      await rusdFraction
        .connect(provider)
        .transfer(await deployer.getAddress(), toRUSDFracDenomination('1'))
      expect(await rusdFraction.balanceOf(await provider.getAddress())).to.eq(
        providerBefore.sub(toRUSDFracDenomination('1')),
      )
      expect(await rusdFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.add(toRUSDFracDenomination('0.964')),
      )
      expect(await rusdFraction.balanceOf(await developer.getAddress())).to.eq(
        developerBefore.add(toRUSDFracDenomination('0.001')),
      )
      expect(await rusdFraction.balanceOf(await liquidityPool.getAddress())).to.eq(
        liquiditypoolBefore.add(toRUSDFracDenomination('0.03')),
      )
      expect(await rusdFraction.balanceOf(await ReflectoPool.getAddress())).to.eq(
        reflectopoolBefore.add(toRUSDFracDenomination('0.0025')),
      )
      expect(await rusdFraction.balanceOf(await ReflectoContract.getAddress())).to.eq(
        reflectoContractBefore.add(toRUSDFracDenomination('0.0025')),
      )
    })
  })

  describe('when the recipient address is the contract address', function () {
    it('reverts on transfer', async function () {
      await expect(
        rusdFraction.connect(UserA).transfer(rusdFraction.address, unitTokenAmount),
      ).to.be.reverted
    })

    it('reverts on transferFrom', async function () {
      await expect(
        rusdFraction
          .connect(UserA)
          .transferFrom(
            await UserA.getAddress(),
            rusdFraction.address,
            unitTokenAmount,
          ),
      ).to.be.reverted
    })
  })

  describe('when the recipient is the zero address', function () {
    it('emits an approval event', async function () {
      await expect(
        rusdFraction
          .connect(UserA)
          .approve(ethers.constants.AddressZero, transferAmount),
      )
        .to.emit(rusdFraction, 'Approval')
        .withArgs(
          await UserA.getAddress(),
          ethers.constants.AddressZero,
          transferAmount,
        )
    })

    it('transferFrom should fail', async function () {
      await expect(
        rusdFraction
          .connect(UserC)
          .transferFrom(
            await UserA.getAddress(),
            ethers.constants.AddressZero,
            unitTokenAmount,
          ),
      ).to.be.reverted
    })
  })

  describe('exclude from fees', function () {
    // beforeEach(async function () {
    //   await network.provider.send("hardhat_reset")
    // })
    before('setup RUSDFraction contract', setupContracts)
    
    it('All fees included test', async () => {
      // normal transfer
      const [admin,,,,,,,,,,,, investor1, investor2] = await ethers.getSigners();
      await rusdFraction.transfer(investor1.address, '10000000000');
      const balanceInvestorBefore = await rusdFraction.balanceOf(investor1.address);
      const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
      expect(10-10*0.031).to.be.equal(totalBalance);

      // transfer from
      await rusdFraction.approve(investor2.address, '10000000000');
      await rusdFraction.connect(investor2).transferFrom(admin.address, investor2.address, '10000000000');
      const balanceInvestor2Before = await rusdFraction.balanceOf(investor2.address);
      const totalBalance1 = balanceInvestor2Before / Math.pow(10, 9);
      expect(10-10*0.031).to.be.equal(totalBalance1);
    })

    // exclude from all fees
    it('Exclude all fees for address', async () => {
      const [admin,,,,,,,,,,,,,,investor1, investor2] = await ethers.getSigners();
      // exclude all from fees
      await rusdFraction.excludeFromAllFees(admin.address, true);

      // normal transfer
      await rusdFraction.transfer(investor1.address, '10000000000');
      const balanceInvestorBefore = await rusdFraction.balanceOf(investor1.address);
      const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
      expect(10).to.be.equal(totalBalance);

      // transfer from
      await rusdFraction.approve(investor2.address, '10000000000');
      await rusdFraction.connect(investor2).transferFrom(admin.address, investor2.address, '10000000000');
      const balanceInvestor2Before = await rusdFraction.balanceOf(investor2.address);
      const totalBalance1 = balanceInvestor2Before / Math.pow(10, 9);
      expect(10).to.be.equal(totalBalance1);
    })
    

    // change exclude from some fees
    it('Change some fees', async () => {
      const [admin,,,,,investor1, investor2] = await ethers.getSigners();
      await rusdFraction.excludeFromAllFees(admin.address, false);
      // exclude all from fees
      await rusdFraction.setCustomFees(
        admin.address,
        100,
        100,
        0,
        0,
        0,
        0,
        100,
        100,
        true
    );

      // normal transfer
      await rusdFraction.transfer(investor1.address, '10000000000');
      const balanceInvestorBefore = await rusdFraction.balanceOf(investor1.address);
      const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
      expect(10-10*0.02).to.be.equal(totalBalance);

      // transfer from
      await rusdFraction.approve(investor2.address, '10000000000');
      await rusdFraction.connect(investor2).transferFrom(admin.address, investor2.address, '10000000000');
      const balanceInvestor2Before = await rusdFraction.balanceOf(investor2.address);
      const totalBalance1 = balanceInvestor2Before / Math.pow(10, 9);
      expect(10-10*0.02).to.be.equal(totalBalance1);
    })
  })

  describe('Max sale per day', function () {
      before('setup RUSDFraction contract', setupContracts)
      let balanceAdmin;
      let balanceInvestor;
      it('Should allow to sell less the 500 RUSD', async () => {
        const [admin,,,,,,,,,,,,,,,investor1] = await ethers.getSigners();
        await rusdFraction.addProviderPair(investor1.address)

        await rusdFraction.transfer(investor1.address, '200000000000');
        const balanceInvestorBefore = await rusdFraction.balanceOf(investor1.address);
        const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
        expect(200-200*0.036).to.be.equal(totalBalance);
        balanceAdmin = await rusdFraction.balanceOf(admin.address)
        balanceInvestor = await rusdFraction.balanceOf(investor1.address)
      })

      it('Should not allow to sell more the 200 RUSD', async () => {
        const [admin,,,,,,,,,,,,,,,investor1] = await ethers.getSigners();

        expect(
          rusdFraction.transfer(investor1.address, '320000000000')
        ).to.be.revertedWith('One day needs to pass to be able to sell again');

        const balanceAdmin1 = await rusdFraction.balanceOf(admin.address)
        const balanceInvestor1 = await rusdFraction.balanceOf(investor1.address)
        expect(balanceInvestor1).to.be.eq(balanceInvestor);
        expect(balanceAdmin1).to.be.eq(balanceAdmin);
        await rusdFraction.transfer(investor1.address, '300000000000');
        const balanceInvestorBefore = await rusdFraction.balanceOf(investor1.address);
        const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
        expect(200-200*0.036).to.be.equal(totalBalance);
      })

      it('Move time to one day to allow another 200 RUSD', async () => {
        const [admin,,,,,,,,,,,,,,,investor1] = await ethers.getSigners();

        expect(
          rusdFraction.transfer(investor1.address, '320000000000')
        ).to.be.revertedWith('One day needs to pass to be able to sell again');


        const oneDay = 1 * 24 * 60 * 60;
        await ethers.provider.send('evm_increaseTime', [oneDay]);
        await ethers.provider.send('evm_mine');

        await rusdFraction.transfer(investor1.address, '300000000000');
        const balanceInvestorBefore = await rusdFraction.balanceOf(investor1.address);
        const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
        expect(600-600*0.036).to.be.equal(totalBalance);
      })
  })
})

describe('RUSDFraction:Mint', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer
  let balanceOfUserBefore;
  let TotalSupply;

  before('setup rusdFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()

  })

  it('should be callable by owner', async function () {
    await expect(rusdFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
      balanceOfUserBefore = await rusdFraction.balanceOf(user.address);
    TotalSupply = await rusdFraction.totalSupply();
  })
  it('should be callable by policy', async function () {
    await expect(rusdFraction.connect(policy).mint(user.address , 10000000000))
      .to.not.be.reverted
  })
  it('should not be callable by any other', async function () {
    await expect(rusdFraction.connect(deployer).mint(user.address , 10000000000))
      .to.be.reverted
  })
  it('Balance will be increased by 10000000000', async function () {   
        const ExpectedtotalBalance = balanceOfUserBefore.add(10000000000);
        const BalanceOf = await rusdFraction.balanceOf(user.address);
        expect(BalanceOf).to.be.equal(ExpectedtotalBalance);
  })
  it('Totalsupply will be increased by 10000000000', async function () {   
        const ExpectedTotalSupply = TotalSupply.add(10000000000);
        const TotalSup = await rusdFraction.totalSupply();
        expect(TotalSup).to.be.equal(ExpectedTotalSupply);
  })
})

describe('RUSDFraction:Burn', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer
  let balanceOfUserBefore;
  let TotalSupply;

  before('setup rusdFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()

  })

  it('should be callable by owner', async function () {
    await expect(rusdFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
      balanceOfUserBefore = await rusdFraction.balanceOf(deployer.address);
    TotalSupply = await rusdFraction.totalSupply();
  })
  it('should be callable by policy', async function () {
    await expect(rusdFraction.connect(policy).burn(deployer.address , 10000000000))
      .to.not.be.reverted
  })
  it('can not burn more then balance', async function () {
    await expect(rusdFraction.connect(policy).burn(user.address , 10000000000))
      .to.be.reverted
  })
  it('Balance will be decreased by 10000000000', async function () {   
        const ExpectedtotalBalance = balanceOfUserBefore.sub(10000000000);
        const BalanceOf = await rusdFraction.balanceOf(deployer.address);
        expect(BalanceOf).to.be.equal(ExpectedtotalBalance);
  })
  it('Totalsupply will be decreased by 10000000000', async function () {   
        const ExpectedTotalSupply = TotalSupply.sub(10000000000);
        const TotalSup = await rusdFraction.totalSupply();
        expect(TotalSup).to.be.equal(ExpectedTotalSupply);
  })
})