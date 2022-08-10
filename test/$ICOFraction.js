const { expect } = require("chai");
const { ethers, upgrades, network } = require("hardhat");
const { Contract, Signer, BigNumber } = require('ethers')
require('dotenv').config()

const to$ICOFracDenomination = (Imperium) =>
  ethers.utils.parseUnits(Imperium, DECIMALS)

const DECIMALS = 9
const INITIAL_SUPPLY = ethers.utils.parseUnits('50', 6 + DECIMALS)
const MAX_UINT256 = ethers.BigNumber.from(2).pow(256).sub(1)
const TOTAL_FRACS = MAX_UINT256.sub(MAX_UINT256.mod(INITIAL_SUPPLY))

const transferAmount = to$ICOFracDenomination('10')
const unitTokenAmount = to$ICOFracDenomination('1')

let accounts = Signer[15],
  deployer = Signer,
  $icoFraction = Contract,
  initialSupply = BigNumber

async function setupContracts() {
  // prepare signers
  accounts = await ethers.getSigners()
  deployer = accounts[0]
  // deploy upgradable token
  const $ICOFraction = await (await ethers.getContractFactory('$ICOFraction')).connect(deployer).deploy()
  const factory = await ethers.getContractFactory('$ICOFraction')
  $icoFraction = await upgrades.deployProxy(
    factory,
    [await deployer.getAddress()],
    {
      initializer: 'initialize(address)',
    },
  )
  // fetch initial supply
  initialSupply = await $icoFraction.totalSupply()
}

describe('$ICOFraction', () => {
  before('setup $ICOFraction contract', setupContracts)

  it('should reject any ether sent to it', async function () {
    const user = accounts[1]
    await expect(user.sendTransaction({ to: $icoFraction.address, value: 1 })).to
      .be.reverted
  })
})

describe('$ICOFraction:Initialization', () => {
  before('setup $ICOFraction contract', setupContracts)

  it('should transfer 50M $icoFraction to the deployer', async function () {
    expect(await $icoFraction.balanceOf(await deployer.getAddress())).to.eq(
      INITIAL_SUPPLY,
    )
  })

  it('should set the totalSupply to 50M', async function () {
    expect(await $icoFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
  })

  it('should set the owner', async function () {
    expect(await $icoFraction.owner()).to.eq(await deployer.getAddress())
  })

  it('should set detailed ERC20 parameters', async function () {
    expect(await $icoFraction.name()).to.eq('IMPERIUM STABLE')
    expect(await $icoFraction.symbol()).to.eq('$ICO')
    expect(await $icoFraction.decimals()).to.eq(DECIMALS)
  })
})

describe('$ICOFraction:setMonetaryPolicy', async () => {
  let policy = Signer, policyAddress = Contract

  before('setup $ICOFractions contract', async () => {
    await setupContracts()
    policy = accounts[1]
    policyAddress = await policy.getAddress()
  })
  it('should set reference to policy contract', async function () {
    await expect($icoFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.emit($icoFraction, 'LogMonetaryPolicyUpdated')
      .withArgs(policyAddress)
    expect(await $icoFraction.monetaryPolicy()).to.eq(policyAddress)
  })
})

describe('$icoFraction:setMonetaryPolicy:accessControl', async () => {
  let policy = Signer, policyAddress = Contract

  before('setup $icoFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    policyAddress = await policy.getAddress()
  })

  it('should be callable by owner', async function () {
    await expect($icoFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
  })
})

describe('$ICOFraction:setMonetaryPolicy:accessControl', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer

  before('setup $icoFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()
  })

  it('should NOT be callable by non-owner', async function () {
    await expect($icoFraction.connect(user).setMonetaryPolicy(policyAddress)).to
      .be.reverted
  })
})

describe('$ICOFraction:Rebase:accessControl', async () => {
  let user = Signer, policyAddress = Contract

  before('setup $icoFraction contract', async function () {
    await setupContracts()
    user = accounts[1]
    policyAddress = await user.getAddress()
    await $icoFraction.connect(deployer).setMonetaryPolicy(policyAddress)
  })

  it('should be callable by monetary policy', async function () {
    await expect($icoFraction.connect(user).rebase(1, transferAmount)).to.not.be
      .reverted
  })

  it('should not be callable by others', async function () {
    await expect($icoFraction.connect(deployer).rebase(1, transferAmount)).to.be
      .reverted
  })
})

describe('$ICOFraction:Rebase:Expansion', async () => {
  // Rebase +5M (10%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer
  const rebaseAmt = INITIAL_SUPPLY.div(10)

  before('setup $icoFraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await $icoFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await $icoFraction
      .connect(deployer)
      .transfer(await A.getAddress(), to$ICOFracDenomination('750'))
    await $icoFraction
      .connect(deployer)
      .transfer(await B.getAddress(), to$ICOFracDenomination('250'))

    expect(await $icoFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await $icoFraction.balanceOf(await A.getAddress())).to.eq(
      to$ICOFracDenomination('750'),
    )
    expect(await $icoFraction.balanceOf(await B.getAddress())).to.eq(
      to$ICOFracDenomination('250'),
    )

    expect(await $icoFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await $icoFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await $icoFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should emit Rebase', async function () {
    await expect($icoFraction.connect(policy).rebase(1, rebaseAmt))
      .to.emit($icoFraction, 'LogRebase')
      .withArgs(1, initialSupply.add(rebaseAmt))
  })

  it('should increase the totalSupply', async function () {
    expect(await $icoFraction.totalSupply()).to.eq(initialSupply.add(rebaseAmt))
  })

  it('should NOT CHANGE the scaledTotalSupply', async function () {
    expect(await $icoFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should increase individual balances', async function () {
    expect(await $icoFraction.balanceOf(await A.getAddress())).to.eq(
      to$ICOFracDenomination('825'),
    )
    expect(await $icoFraction.balanceOf(await B.getAddress())).to.eq(
      to$ICOFracDenomination('275'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await $icoFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await $icoFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should return the new supply', async function () {
    await $icoFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    const returnVal = await $icoFraction
      .connect(policy)
      .callStatic.rebase(2, rebaseAmt)
    await $icoFraction.connect(policy).rebase(2, rebaseAmt)
    expect(await $icoFraction.totalSupply()).to.eq(returnVal)
  })
})

describe('$ICOFraction:Rebase:Expansion', async function () {
  let policy = Signer
  const MAX_SUPPLY = ethers.BigNumber.from(2).pow(128).sub(1)
  describe('when totalSupply is less than MAX_SUPPLY and expands beyond', function () {
    before('setup $icoFraction contract', async function () {
      await setupContracts()
      policy = accounts[1]
      const totalSupply = await $icoFraction.totalSupply.call()
      await $icoFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
      await $icoFraction
        .connect(policy)
        .rebase(1, MAX_SUPPLY.sub(totalSupply).sub(to$ICOFracDenomination('1')))
    })

    it('should emit Rebase', async function () {
      await expect(
        $icoFraction.connect(policy).rebase(2, to$ICOFracDenomination('2')),
      )
        .to.emit($icoFraction, 'LogRebase')
        .withArgs(2, MAX_SUPPLY)
    })

    it('should increase the totalSupply to MAX_SUPPLY', async function () {
      expect(await $icoFraction.totalSupply()).to.eq(MAX_SUPPLY)
    })
  })

  describe('when totalSupply is MAX_SUPPLY and expands', function () {
    before(async function () {
      expect(await $icoFraction.totalSupply()).to.eq(MAX_SUPPLY)
    })

    it('should emit Rebase', async function () {
      await expect(
        $icoFraction.connect(policy).rebase(3, to$ICOFracDenomination('2')),
      )
        .to.emit($icoFraction, 'LogRebase')
        .withArgs(3, MAX_SUPPLY)
    })

    it('should NOT change the totalSupply', async function () {
      expect(await $icoFraction.totalSupply()).to.eq(MAX_SUPPLY)
    })
  })
})

describe('$ICOFraction:Rebase:NoChange', function () {
  // Rebase (0%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer

  before('setup $icoFraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await $icoFraction
      .connect(deployer)
      .transfer(await A.getAddress(), to$ICOFracDenomination('750'))
    await $icoFraction
      .connect(deployer)
      .transfer(await B.getAddress(), to$ICOFracDenomination('250'))

    expect(await $icoFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await $icoFraction.balanceOf(await A.getAddress())).to.eq(
      to$ICOFracDenomination('750'),
    )
    expect(await $icoFraction.balanceOf(await B.getAddress())).to.eq(
      to$ICOFracDenomination('250'),
    )

    expect(await $icoFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await $icoFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await $icoFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should emit Rebase', async function () {
    await $icoFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await expect($icoFraction.connect(policy).rebase(1, 0))
      .to.emit($icoFraction, 'LogRebase')
      .withArgs(1, initialSupply)
  })

  it('should NOT CHANGE the totalSupply', async function () {
    expect(await $icoFraction.totalSupply()).to.eq(initialSupply)
  })

  it('should NOT CHANGE the scaledTotalSupply', async function () {
    expect(await $icoFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should NOT CHANGE individual balances', async function () {
    expect(await $icoFraction.balanceOf(await A.getAddress())).to.eq(
      to$ICOFracDenomination('750'),
    )
    expect(await $icoFraction.balanceOf(await B.getAddress())).to.eq(
      to$ICOFracDenomination('250'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await $icoFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await $icoFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })
})

describe('$ICOFraction:Rebase:Contraction', function () {
  // Rebase -5M (-10%), with starting balances A:750 and B:250.
  let A = Signer, B = Signer, policy = Signer
  const rebaseAmt = INITIAL_SUPPLY.div(10)

  before('setup $icoFraction contract', async function () {
    await setupContracts()
    A = accounts[2]
    B = accounts[3]
    policy = accounts[1]
    await $icoFraction
      .connect(deployer)
      .transfer(await A.getAddress(), to$ICOFracDenomination('750'))
    await $icoFraction
      .connect(deployer)
      .transfer(await B.getAddress(), to$ICOFracDenomination('250'))

    expect(await $icoFraction.totalSupply()).to.eq(INITIAL_SUPPLY)
    expect(await $icoFraction.balanceOf(await A.getAddress())).to.eq(
      to$ICOFracDenomination('750'),
    )
    expect(await $icoFraction.balanceOf(await B.getAddress())).to.eq(
      to$ICOFracDenomination('250'),
    )

    expect(await $icoFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
    expect(await $icoFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await $icoFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })

  it('should emit Rebase', async function () {
    await $icoFraction.connect(deployer).setMonetaryPolicy(await policy.getAddress())
    await expect($icoFraction.connect(policy).rebase(1, -rebaseAmt))
      .to.emit($icoFraction, 'LogRebase')
      .withArgs(1, initialSupply.sub(rebaseAmt))
  })

  it('should decrease the totalSupply', async function () {
    expect(await $icoFraction.totalSupply()).to.eq(initialSupply.sub(rebaseAmt))
  })

  it('should NOT. CHANGE the scaledTotalSupply', async function () {
    expect(await $icoFraction.scaledTotalSupply()).to.eq(TOTAL_FRACS)
  })

  it('should decrease individual balances', async function () {
    expect(await $icoFraction.balanceOf(await A.getAddress())).to.eq(
      to$ICOFracDenomination('675'),
    )
    expect(await $icoFraction.balanceOf(await B.getAddress())).to.eq(
      to$ICOFracDenomination('225'),
    )
  })

  it('should NOT CHANGE the individual scaled balances', async function () {
    expect(await $icoFraction.scaledBalanceOf(await A.getAddress())).to.eq(
      '1736881338559742931353564775130318617799049769984608460591863250000000000',
    )
    expect(await $icoFraction.scaledBalanceOf(await B.getAddress())).to.eq(
      '578960446186580977117854925043439539266349923328202820197287750000000000',
    )
  })
})

describe('$ICOFraction:Transfer', function () {
  let UserA = Signer, UserB = Signer, UserC = Signer, developer = Signer, liquidityPool = Signer, ImperiumPool = Signer, ImperiumContract = Signer, provider = Signer

  before('setup $icoFraction contract', async () => {
    await setupContracts()
    provider = accounts[9]
    UserA = accounts[10]
    UserB = accounts[11]
    UserC = accounts[12]
  })

  describe('deployer transfers sell', function () {
    it('should have correct balances', async function () {
      const deployerBefore = await $icoFraction.balanceOf(
        await deployer.getAddress(),
      )
      await $icoFraction
        .connect(deployer)
        .transfer(await provider.getAddress(), to$ICOFracDenomination('10'))
      expect(await $icoFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(to$ICOFracDenomination('10')),
      )
      expect(await $icoFraction.balanceOf(await provider.getAddress())).to.eq(
        to$ICOFracDenomination('10'),
      )
    })
  })

  describe('deployer transfers 100 to userA', async function () {
    it('should have correct balances', async function () {
      const deployerBefore = await $icoFraction.balanceOf(
        await deployer.getAddress(),
      )
      await $icoFraction
        .connect(deployer)
        .transfer(await UserA.getAddress(), to$ICOFracDenomination('100'))
      expect(await $icoFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(to$ICOFracDenomination('100')),
      )
      expect(await $icoFraction.balanceOf(await UserA.getAddress())).to.eq(
        to$ICOFracDenomination('100'),
      )
    })
  })

  describe('deployer transfers 200 to userB', async function () {
    it('should have correct balances', async function () {
      const deployerBefore = await $icoFraction.balanceOf(
        await deployer.getAddress(),
      )
    
      await $icoFraction
        .connect(deployer)
        .transfer(await UserB.getAddress(), to$ICOFracDenomination('200'))
      expect(await $icoFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.sub(to$ICOFracDenomination('200')),
      )
      expect(await $icoFraction.balanceOf(await UserB.getAddress())).to.eq(
        to$ICOFracDenomination('200'),
      )
    })
  })

  describe('deployer transfers 100 Buy fees', function () {
    it('should have correct balances', async function () {
      const deployerBefore = await $icoFraction.balanceOf(
        await deployer.getAddress(),
      )
      const providerBefore = await $icoFraction.balanceOf(
        await provider.getAddress(),
      )
      await $icoFraction
        .connect(provider)
        .transfer(await deployer.getAddress(), to$ICOFracDenomination('1'))
      expect(await $icoFraction.balanceOf(await provider.getAddress())).to.eq(
        providerBefore.sub(to$ICOFracDenomination('1')),
      )
      expect(await $icoFraction.balanceOf(await deployer.getAddress())).to.eq(
        deployerBefore.add(to$ICOFracDenomination('1')),
      )
    })
  })

  describe('when the recipient address is the contract address', function () {
    it('reverts on transfer', async function () {
      await expect(
        $icoFraction.connect(UserA).transfer($icoFraction.address, unitTokenAmount),
      ).to.be.reverted
    })

    it('reverts on transferFrom', async function () {
      await expect(
        $icoFraction
          .connect(UserA)
          .transferFrom(
            await UserA.getAddress(),
            $icoFraction.address,
            unitTokenAmount,
          ),
      ).to.be.reverted
    })
  })

  describe('when the recipient is the zero address', function () {
    it('emits an approval event', async function () {
      await expect(
        $icoFraction
          .connect(UserA)
          .approve(ethers.constants.AddressZero, transferAmount),
      )
        .to.emit($icoFraction, 'Approval')
        .withArgs(
          await UserA.getAddress(),
          ethers.constants.AddressZero,
          transferAmount,
        )
    })

    it('transferFrom should fail', async function () {
      await expect(
        $icoFraction
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
    before('setup $ICOFraction contract', setupContracts)
    
    it('All fees included test', async () => {
      // normal transfer
      const [admin,,,,,,,,,,,, investor1, investor2] = await ethers.getSigners();
      await $icoFraction.transfer(investor1.address, '10000000000');
      const balanceInvestorBefore = await $icoFraction.balanceOf(investor1.address);
      const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
      expect(10).to.be.equal(totalBalance);

      // transfer from
      await $icoFraction.approve(investor2.address, '10000000000');
      await $icoFraction.connect(investor2).transferFrom(admin.address, investor2.address, '10000000000');
      const balanceInvestor2Before = await $icoFraction.balanceOf(investor2.address);
      const totalBalance1 = balanceInvestor2Before / Math.pow(10, 9);
      expect(10).to.be.equal(totalBalance1);
    })
  })

  // describe('Max sale per day', function () {
  //     before('setup $ICOFraction contract', setupContracts)
  //     let balanceAdmin;
  //     let balanceInvestor;
  //     it('Should allow to sell less the 500 $ICO', async () => {
  //       const [admin,,,,,,,,,,,,,,,investor1] = await ethers.getSigners();
  //       await $icoFraction.transfer(investor1.address, '200000000000');
  //       const balanceInvestorBefore = await $icoFraction.balanceOf(investor1.address);
  //       const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
  //       expect(200).to.be.equal(totalBalance);
  //       balanceAdmin = await $icoFraction.balanceOf(admin.address)
  //       balanceInvestor = await $icoFraction.balanceOf(investor1.address)
  //     })

  //     it('Should not allow to sell more the 200 $ICO', async () => {
  //       const [admin,,,,,,,,,,,,,,,investor1] = await ethers.getSigners();

  //       expect(
  //         $icoFraction.transfer(investor1.address, '320000000000')
  //       ).to.be.revertedWith('One day needs to pass to be able to sell again');

  //       const balanceAdmin1 = await $icoFraction.balanceOf(admin.address)
  //       const balanceInvestor1 = await $icoFraction.balanceOf(investor1.address)
  //       expect(balanceInvestor1).to.be.eq(balanceInvestor);
  //       expect(balanceAdmin1).to.be.eq(balanceAdmin);
  //       await $icoFraction.transfer(investor1.address, '300000000000');
  //       const balanceInvestorBefore = await $icoFraction.balanceOf(investor1.address);
  //       const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
  //       expect(200).to.be.equal(totalBalance);
  //     })

  //     it('Move time to one day to allow another 200 $ICO', async () => {
  //       const [admin,,,,,,,,,,,,,,,investor1] = await ethers.getSigners();

  //       expect(
  //         $icoFraction.transfer(investor1.address, '320000000000')
  //       ).to.be.revertedWith('One day needs to pass to be able to sell again');


  //       const oneDay = 1 * 24 * 60 * 60;
  //       await ethers.provider.send('evm_increaseTime', [oneDay]);
  //       await ethers.provider.send('evm_mine');

  //       await $icoFraction.transfer(investor1.address, '300000000000');
  //       const balanceInvestorBefore = await $icoFraction.balanceOf(investor1.address);
  //       const totalBalance = balanceInvestorBefore / Math.pow(10, 9);
  //       expect(1140).to.be.equal(totalBalance);
  //     })
  // })
})

describe('$ICOFraction:Mint', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer
  let balanceOfUserBefore;
  let TotalSupply;

  before('setup $icoFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()

  })

  it('should be callable by owner', async function () {
    await expect($icoFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
      balanceOfUserBefore = await $icoFraction.balanceOf(user.address);
    TotalSupply = await $icoFraction.totalSupply();
  })
  it('should be callable by policy', async function () {
    await expect($icoFraction.connect(policy).mint(user.address , 10000000000))
      .to.not.be.reverted
  })
  it('should not be callable by any other', async function () {
    await expect($icoFraction.connect(deployer).mint(user.address , 10000000000))
      .to.be.reverted
  })
  it('Balance will be increased by 10000000000', async function () {   
        const ExpectedtotalBalance = balanceOfUserBefore.add(10000000000);
        const BalanceOf = await $icoFraction.balanceOf(user.address);
        expect(BalanceOf).to.be.equal(ExpectedtotalBalance);
  })
  it('Totalsupply will be increased by 10000000000', async function () {   
        const ExpectedTotalSupply = TotalSupply.add(10000000000);
        const TotalSup = await $icoFraction.totalSupply();
        expect(TotalSup).to.be.equal(ExpectedTotalSupply);
  })
})

describe('$ICOFraction:Burn', async () => {
  let policy = Signer, policyAddress = Contract, user = Signer
  let balanceOfUserBefore;
  let TotalSupply;

  before('setup $icoFraction contract', async () => {
    await setupContracts()
    policy = accounts[1]
    user = accounts[2]
    policyAddress = await policy.getAddress()

  })

  it('should be callable by owner', async function () {
    await expect($icoFraction.connect(deployer).setMonetaryPolicy(policyAddress))
      .to.not.be.reverted
      balanceOfUserBefore = await $icoFraction.balanceOf(deployer.address);
    TotalSupply = await $icoFraction.totalSupply();
  })
  it('should be callable by policy', async function () {
    await expect($icoFraction.connect(policy).burn(deployer.address , 10000000000))
      .to.not.be.reverted
  })
  it('can not burn more then balance', async function () {
    await expect($icoFraction.connect(policy).burn(user.address , 10000000000))
      .to.be.reverted
  })
  it('Balance will be decreased by 10000000000', async function () {   
        const ExpectedtotalBalance = balanceOfUserBefore.sub(10000000000);
        const BalanceOf = await $icoFraction.balanceOf(deployer.address);
        expect(BalanceOf).to.be.equal(ExpectedtotalBalance);
  })
  it('Totalsupply will be decreased by 10000000000', async function () {   
        const ExpectedTotalSupply = TotalSupply.sub(10000000000);
        const TotalSup = await $icoFraction.totalSupply();
        expect(TotalSup).to.be.equal(ExpectedTotalSupply);
  })
})