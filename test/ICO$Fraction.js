const { expect } = require("chai");
const { ethers, upgrades, network } = require("hardhat");
const { Contract, Signer, BigNumber } = require('ethers')
require('dotenv').config()

const toICO$FracDenomination = (Imperium) =>
  ethers.utils.parseUnits(Imperium, DECIMALS)

const DECIMALS = 9
const INITIAL_SUPPLY = ethers.utils.parseUnits('50', 6 + DECIMALS)
const MAX_UINT256 = ethers.BigNumber.from(2).pow(256).sub(1)
const TOTAL_FRACS = MAX_UINT256.sub(MAX_UINT256.mod(INITIAL_SUPPLY))

const transferAmount = toICO$FracDenomination('10')
const unitTokenAmount = toICO$FracDenomination('1')

let accounts = Signer[15],
  deployer = Signer,
  Ico$Fraction = Contract,
  initialSupply = BigNumber

async function setupContracts() {
  // prepare signers
  accounts = await ethers.getSigners()
  deployer = accounts[0]
  // deploy upgradable token
  const ICO$Fraction = await (await ethers.getContractFactory('ICO$Fraction')).connect(deployer).deploy()
  const factory = await ethers.getContractFactory('ICO$Fraction')
  Ico$Fraction = await upgrades.deployProxy(
    factory,
    [await deployer.getAddress()],
    {
      initializer: 'initialize(address)',
    },
  )
  // fetch initial supply
  initialSupply = await Ico$Fraction.totalSupply()
}

describe('ICO$Fraction', () => {
  before('setup ICO$Fraction contract', setupContracts)

  it('should reject any ether sent to it', async function () {
    const user = accounts[1]
    await expect(user.sendTransaction({ to: Ico$Fraction.address, value: 1 })).to
      .be.reverted
  })
})

describe('ICO$Fraction:Initialization', () => {
  before('setup ICO$Fraction contract', setupContracts)

  it('should transfer 50M Ico$Fraction to the deployer', async function () {
    expect(await Ico$Fraction.balanceOf(await deployer.getAddress())).to.eq(
      INITIAL_SUPPLY,
    )
  })

  it('should set the totalSupply to 50M', async function () {
    expect(await Ico$Fraction.totalSupply()).to.eq(INITIAL_SUPPLY)
  })

  it('should set the owner', async function () {
    expect(await Ico$Fraction.owner()).to.eq(await deployer.getAddress())
  })

  it('should set detailed ERC20 parameters', async function () {
    expect(await Ico$Fraction.name()).to.eq('Imperial Dollar')
    expect(await Ico$Fraction.symbol()).to.eq('ICO$')
    expect(await Ico$Fraction.decimals()).to.eq(DECIMALS)
  })
})

describe('ICO$Fraction:setMonetaryPolicy', async () => {
  let policy = Signer, policyAddress = Contract

  before('setup ICO$Fractions contract', async () => {
    await setupContracts()
    policy = accounts[1]
    policyAddress = await policy.getAddress()
  })
  it('should set reference to policy contract', async function () {
    await expect(Ico$Fraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.emit(Ico$Fraction, 'LogMonetaryPolicyUpdated')
      .withArgs(policyAddress)
    expect(await Ico$Fraction.monetaryPolicy()).to.eq(policyAddress)
  })
})

describe('Ico$Fraction:setMonetaryPolicy:accessControl', async () => {
  let policy = Signer, policyAddress = Contract

  before('setup Ico$Fraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    policyAddress = await policy.getAddress()
  })

  it('should be callable by owner', async function () {
    await expect(Ico$Fraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
  })
})

describe('ICO$Fraction:setMonetaryPolicy:accessControl', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer

  before('setup Ico$Fraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(Ico$Fraction.connect(user).setMonetaryPolicy(policyAddress)).to
      .be.reverted
  })
})

describe('ICO$Fraction:Rebase:accessControl', async () => {
  let user = Signer, policyAddress = Contract

  before('setup Ico$Fraction contract', async function () {
    await setupContracts()
    user = accounts[1]
    policyAddress = await user.getAddress()
    await Ico$Fraction.connect(deployer).setMonetaryPolicy(policyAddress)
  })

  it('should be callable by monetary policy', async function () {
    await expect(Ico$Fraction.connect(user).rebase(1, transferAmount)).to.not.be
      .reverted
  })

  it('should not be callable by others', async function () {
    await expect(Ico$Fraction.connect(deployer).rebase(1, transferAmount)).to.be
      .reverted
  })
})

describe('ICO$Fraction:Rebase:Expansion', async () => {
  // Rebase +5M (10%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer
  const rebaseAmt = INITIAL_SUPPLY.div(10)

  before('setup Ico$Fraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await Ico$Fraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await Ico$Fraction
      .connect(deployer)
      .transfer(await A.getAddress(), toICO$FracDenomination('750'))
    await Ico$Fraction
      .connect(deployer)
      .transfer(await B.getAddress(), toICO$FracDenomination('250'))

    expect(await Ico$Fraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await Ico$Fraction.balanceOf(await A.getAddress())).to.eq(
      toICO$FracDenomination('750'),
    )
    expect(await Ico$Fraction.balanceOf(await B.getAddress())).to.eq(
      toICO$FracDenomination('250'),
    )

    expect(await Ico$Fraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await Ico$Fraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await Ico$Fraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should emit Rebase', async function () {
    await expect(Ico$Fraction.connect(policy).rebase(1, rebaseAmt))
      .to.emit(Ico$Fraction, 'LogRebase')
      .withArgs(1, initialSupply.add(rebaseAmt))
  })

  it('should increase the totalSupply', async function () {
    expect(await Ico$Fraction.totalSupply()).to.eq(initialSupply.add(rebaseAmt))
  })

  it('should NOT CHANGE the scaledTotalSupply', async function () {
    expect(await Ico$Fraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should increase individual balances', async function () {
    expect(await Ico$Fraction.balanceOf(await A.getAddress())).to.eq(
      toICO$FracDenomination('825'),
    )
    expect(await Ico$Fraction.balanceOf(await B.getAddress())).to.eq(
      toICO$FracDenomination('275'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await Ico$Fraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await Ico$Fraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should return the new supply', async function () {
    await Ico$Fraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    const returnVal = await Ico$Fraction
      .connect(policy)
      .callStatic.rebase(2, rebaseAmt)
    await Ico$Fraction.connect(policy).rebase(2, rebaseAmt)
    expect(await Ico$Fraction.totalSupply()).to.eq(returnVal)
  })
})

describe('ICO$Fraction:Rebase:Expansion', async function () {
  let policy = Signer
  const MAX_SUPPLY = ethers.BigNumber.from(2).pow(128).sub(1)
  describe('when totalSupply is less than MAX_SUPPLY and expands beyond', function () {
    before('setup Ico$Fraction contract', async function () {
      await setupContracts()
      policy = accounts[1]
      const totalSupply = await Ico$Fraction.totalSupply.call()
      await Ico$Fraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
      await Ico$Fraction
        .connect(policy)
        .rebase(1, MAX_SUPPLY.sub(totalSupply).sub(toICO$FracDenomination('1')))
    })

    it('should emit Rebase', async function () {
      await expect(
        Ico$Fraction.connect(policy).rebase(2, toICO$FracDenomination('2')),
      )
        .to.emit(Ico$Fraction, 'LogRebase')
        .withArgs(2, MAX_SUPPLY)
    })

    it('should increase the totalSupply to MAX_SUPPLY', async function () {
      expect(await Ico$Fraction.totalSupply()).to.eq(MAX_SUPPLY)
    })
  })

  describe('when totalSupply is MAX_SUPPLY and expands', function () {
    before(async function () {
      expect(await Ico$Fraction.totalSupply()).to.eq(MAX_SUPPLY)
    })

    it('should emit Rebase', async function () {
      await expect(
        Ico$Fraction.connect(policy).rebase(3, toICO$FracDenomination('2')),
      )
        .to.emit(Ico$Fraction, 'LogRebase')
        .withArgs(3, MAX_SUPPLY)
    })

    it('should NOT change the totalSupply', async function () {
      expect(await Ico$Fraction.totalSupply()).to.eq(MAX_SUPPLY)
    })
  })
})

describe('ICO$Fraction:Rebase:NoChange', function () {
  // Rebase (0%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer

  before('setup Ico$Fraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await Ico$Fraction
      .connect(deployer)
      .transfer(await A.getAddress(), toICO$FracDenomination('750'))
    await Ico$Fraction
      .connect(deployer)
      .transfer(await B.getAddress(), toICO$FracDenomination('250'))

    expect(await Ico$Fraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await Ico$Fraction.balanceOf(await A.getAddress())).to.eq(
      toICO$FracDenomination('750'),
    )
    expect(await Ico$Fraction.balanceOf(await B.getAddress())).to.eq(
      toICO$FracDenomination('250'),
    )

    expect(await Ico$Fraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await Ico$Fraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await Ico$Fraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should emit Rebase', async function () {
    await Ico$Fraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await expect(Ico$Fraction.connect(policy).rebase(1, 0))
      .to.emit(Ico$Fraction, 'LogRebase')
      .withArgs(1, initialSupply)
  })

  it('should NOT CHANGE the totalSupply', async function () {
    expect(await Ico$Fraction.totalSupply()).to.eq(initialSupply)
  })

  it('should NOT CHANGE the scaledTotalSupply', async function () {
    expect(await Ico$Fraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should NOT CHANGE individual balances', async function () {
    expect(await Ico$Fraction.balanceOf(await A.getAddress())).to.eq(
      toICO$FracDenomination('750'),
    )
    expect(await Ico$Fraction.balanceOf(await B.getAddress())).to.eq(
      toICO$FracDenomination('250'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await Ico$Fraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await Ico$Fraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })
})

describe('ICO$Fraction:Rebase:Contraction', function () {
  // Rebase -5M (-10%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer
  const rebaseAmt = INITIAL_SUPPLY.div(10000)

  before('setup Ico$Fraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await Ico$Fraction
      .connect(deployer)
      .transfer(await A.getAddress(), toICO$FracDenomination('750'))
    await Ico$Fraction
      .connect(deployer)
      .transfer(await B.getAddress(), toICO$FracDenomination('250'))

    expect(await Ico$Fraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await Ico$Fraction.balanceOf(await A.getAddress())).to.eq(
      toICO$FracDenomination('750'),
    )
    expect(await Ico$Fraction.balanceOf(await B.getAddress())).to.eq(
      toICO$FracDenomination('250'),
    )

    expect(await Ico$Fraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await Ico$Fraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await Ico$Fraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should emit Rebase', async function () {
    await Ico$Fraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await expect(Ico$Fraction.connect(policy).rebase(1, -rebaseAmt))
      .to.emit(Ico$Fraction, 'LogRebase')
      .withArgs(1, initialSupply.sub(rebaseAmt))
  })

  it('should decrease the totalSupply', async function () {
    expect(await Ico$Fraction.totalSupply()).to.eq(initialSupply.sub(rebaseAmt))
  })

  it('should NOT. CHANGE the scaledTotalSupply', async function () {
    expect(await Ico$Fraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should decrease individual balances', async function () {
    expect(await Ico$Fraction.balanceOf(await A.getAddress())).to.eq(
      toICO$FracDenomination('749.925'),
    )
    expect(await Ico$Fraction.balanceOf(await B.getAddress())).to.eq(
      toICO$FracDenomination('249.975'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await Ico$Fraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await Ico$Fraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })
})

describe('ICO$Fraction:Transfer', function () {
  let UserA = Signer, UserB = Signer, UserC = Signer, developer = Signer, liquidityPool = Signer, ImperiumPool = Signer, ImperiumContract = Signer, provider = Signer

  before('setup Ico$Fraction contract', async () => {
    await setupContracts()
    provider = accounts[9]
    UserA = accounts[10]
    UserB = accounts[11]
    UserC = accounts[12]
  })

  describe('deployer transfers sell', function () {
    it('should have correct balances', async function () {
      const deployerBefore = await Ico$Fraction.balanceOf(
        await deployer.getAddress(),
      )
      await Ico$Fraction
        .connect(deployer)
        .transfer(await provider.getAddress(), toICO$FracDenomination('10'))
      expect(await Ico$Fraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(toICO$FracDenomination('10')),
      )
      expect(await Ico$Fraction.balanceOf(await provider.getAddress())).to.eq(
        toICO$FracDenomination('10'),
      )
    })
  })

  describe('deployer transfers 100 to userA', async function () {
    it('should have correct balances', async function () {
      const deployerBefore = await Ico$Fraction.balanceOf(
        await deployer.getAddress(),
      )
      await Ico$Fraction
        .connect(deployer)
        .transfer(await UserA.getAddress(), toICO$FracDenomination('100'))
      expect(await Ico$Fraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(toICO$FracDenomination('100')),
      )
      expect(await Ico$Fraction.balanceOf(await UserA.getAddress())).to.eq(
        toICO$FracDenomination('100'),
      )
    })
  })

  describe('deployer transfers 200 to userB', async function () {
    it('should have correct balances', async function () {
      const deployerBefore = await Ico$Fraction.balanceOf(
        await deployer.getAddress(),
      )
    
      await Ico$Fraction
        .connect(deployer)
        .transfer(await UserB.getAddress(), toICO$FracDenomination('200'))
      expect(await Ico$Fraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(toICO$FracDenomination('200')),
      )
      expect(await Ico$Fraction.balanceOf(await UserB.getAddress())).to.eq(
        toICO$FracDenomination('200'),
      )
    })
  })

  describe('deployer transfers 100 Buy fees', function () {
    it('should have correct balances', async function () {
      const deployerBefore = await Ico$Fraction.balanceOf(
        await deployer.getAddress(),
      )
      const providerBefore = await Ico$Fraction.balanceOf(
        await provider.getAddress(),
      )
      await Ico$Fraction
        .connect(provider)
        .transfer(await deployer.getAddress(), toICO$FracDenomination('1'))
      expect(await Ico$Fraction.balanceOf(await provider.getAddress())).to.eq(
        providerBefore.sub(toICO$FracDenomination('1')),
      )
      expect(await Ico$Fraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.add(toICO$FracDenomination('1')),
      )
    })
  })

  describe('when the recipient address is the contract address', function () {
    it('reverts on transfer', async function () {
      await expect(
        Ico$Fraction.connect(UserA).transfer(Ico$Fraction.address, unitTokenAmount),
      ).to.be.reverted
    })

    it('reverts on transferFrom', async function () {
      await expect(
        Ico$Fraction
          .connect(UserA)
          .transferFrom(
            await UserA.getAddress(),
            Ico$Fraction.address,
            unitTokenAmount,
          ),
      ).to.be.reverted
    })
  })

  describe('when the recipient is the zero address', function () {
    it('emits an approval event', async function () {
      await expect(
        Ico$Fraction
          .connect(UserA)
          .approve(ethers.constants.AddressZero, transferAmount),
      )
        .to.emit(Ico$Fraction, 'Approval')
        .withArgs(
          await UserA.getAddress(),
          ethers.constants.AddressZero,
          transferAmount,
        )
    })

    it('transferFrom should fail', async function () {
      await expect(
        Ico$Fraction
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
    before('setup ICO$Fraction contract', setupContracts)
    
    it('All fees included test', async () => {
      // normal transfer
      const [admin,,,,,,,,,,,, investor1, investor2] = await ethers.getSigners();
      await Ico$Fraction.transfer(investor1.address, '10000000000');
      const balanceInvestorBefore = await Ico$Fraction.balanceOf(investor1.address);
      const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
      expect(10).to.be.equal(totalBalance);

      // transfer from
      await Ico$Fraction.approve(investor2.address, '10000000000');
      await Ico$Fraction.connect(investor2).transferFrom(admin.address, investor2.address, '10000000000');
      const balanceInvestor2Before = await Ico$Fraction.balanceOf(investor2.address);
      const totalBalance1 = balanceInvestor2Before / Math.pow(10, 9);
      expect(10).to.be.equal(totalBalance1);
    })
  })
})

describe('ICO$Fraction:Mint', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer
  let balanceOfUserBefore;
  let TotalSupply;

  before('setup Ico$Fraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()

  })

  it('should be callable by owner', async function () {
    await expect(Ico$Fraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
      balanceOfUserBefore = await Ico$Fraction.balanceOf(user.address);
    TotalSupply = await Ico$Fraction.totalSupply();
  })
  it('should be callable by policy', async function () {
    await expect(Ico$Fraction.connect(policy).mint(user.address , 10000000000))
      .to.not.be.reverted
  })
  it('should not be callable by any other', async function () {
    await expect(Ico$Fraction.connect(deployer).mint(user.address , 10000000000))
      .to.be.reverted
  })
  it('Balance will be increased by 10000000000', async function () {   
        const ExpectedtotalBalance = balanceOfUserBefore.add(10000000000);
        const BalanceOf = await Ico$Fraction.balanceOf(user.address);
        expect(BalanceOf).to.be.equal(ExpectedtotalBalance);
  })
  it('Totalsupply will be increased by 10000000000', async function () {   
        const ExpectedTotalSupply = TotalSupply.add(10000000000);
        const TotalSup = await Ico$Fraction.totalSupply();
        expect(TotalSup).to.be.equal(ExpectedTotalSupply);
  })
})

describe('ICO$Fraction:Burn', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer
  let balanceOfUserBefore;
  let TotalSupply;

  before('setup Ico$Fraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()

  })

  it('should be callable by owner', async function () {
    await expect(Ico$Fraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
      balanceOfUserBefore = await Ico$Fraction.balanceOf(deployer.address);
    TotalSupply = await Ico$Fraction.totalSupply();
  })
  it('should be callable by policy', async function () {
    await expect(Ico$Fraction.connect(policy).burn(deployer.address , 10000000000))
      .to.not.be.reverted
  })
  it('can not burn more then balance', async function () {
    await expect(Ico$Fraction.connect(policy).burn(user.address , 10000000000))
      .to.be.reverted
  })
  it('Balance will be decreased by 10000000000', async function () {   
        const ExpectedtotalBalance = balanceOfUserBefore.sub(10000000000);
        const BalanceOf = await Ico$Fraction.balanceOf(deployer.address);
        expect(BalanceOf).to.be.equal(ExpectedtotalBalance);
  })
  it('Totalsupply will be decreased by 10000000000', async function () {   
        const ExpectedTotalSupply = TotalSupply.sub(10000000000);
        const TotalSup = await Ico$Fraction.totalSupply();
        expect(TotalSup).to.be.equal(ExpectedTotalSupply);
  })
})