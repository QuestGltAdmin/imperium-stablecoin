const { ethers } = require('hardhat');
const { expect } = require("chai");
const {
  getDomainSeparator,
  getPermitDigest,
  ownerPrivateKey,
  PERMIT_TYPEHASH,
  sign
} = require('./utils/meta-tx')

describe('Testing meta transactions', function () {
  let initialSupply;
  let Imperium;

  before('setup ICO$Fraction contract', setupContracts)

  async function setupContracts() {
    // prepare signers
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    // deploy upgradable token
    Imperium = await (await ethers.getContractFactory('ICO$Fraction')).connect(deployer).deploy()
    const factory = await ethers.getContractFactory('ICO$Fraction')
    Imperium = await upgrades.deployProxy(
      factory,
      [await deployer.getAddress()],
      {
        initializer: 'initialize(address)',
      },
    )
    // fetch initial supply
    initialSupply = await Imperium.totalSupply()
  }

  it('balance of contract deployer should be 500000000', async () => {
    const [admin] = await ethers.getSigners();
    const balance = await Imperium.balanceOf(admin.address);
    const totalBalance = balance / Math.pow(10, 9);
    expect(totalBalance).to.be.equal(500000000);
  });

  it('initializes DOMAIN_SEPARATOR and PERMIT_TYPEHASH correctly', async () => {
    expect(await Imperium.PERMIT_TYPEHASH_META()).to.be.equal(PERMIT_TYPEHASH);
    const ci = await Imperium.getChainID();
    expect(await Imperium.DOMAIN_SEPARATOR()).to.be.equal(
      getDomainSeparator(await Imperium.name(), Imperium.address, ci.toNumber())
    );
  });

  it('permits and emits Approval (replay safe)', async () => {
    const [adminSig, investorSig] = await ethers.getSigners();
    const investor = investorSig.address;
    const admin = adminSig.address;
    // Try transfer
    // expect(
    //   await Imperium
    //     .connect(investorSig)
    //     .transferFrom(admin, investor, 3000, {
    //       from: investor,
    //       gasLimit: 500000,
    //     })
    // ).to.be.revertedWith(
    //   'Insufficient Allowance -- Reason given: Insufficient Allowance.'
    // );
    // Create the approval request
    const approve = {
      owner: admin,
      spender: investor,
    };

    // deadline as much as you want in the future
    const deadline = 100000000000000;
    // console.log('1 -----------------------------');
    // console.log(
    //   ((await Imperium.balanceOf(investor)) as any) / Math.pow(10, 9)
    // );

    // Get the user's nonce
    const nonceBn = await Imperium.nonces(admin);
    const contractAdress = Imperium.address;
    const chain = await Imperium.getChainID();
    const chainId = chain.toNumber();
    const name = await Imperium.name();
    const nonce = nonceBn.toNumber();
    // Get the EIP712 digest

    // console.log()
    const digest = getPermitDigest(
      name,
      contractAdress,
      chainId,
      approve,
      nonce,
      deadline
    );

    // Sign it
    // NOTE: Using web3.eth.sign will hash the message internally again which
    // we do not want, so we're manually signing here
    const { v, r, s } = sign(digest, ownerPrivateKey);

    // Approve it
    const receipt = await Imperium.permit(
      approve.owner,
      approve.spender,
      nonce,
      deadline,
      true,
      v,
      r,
      s
    );
    // It worked!

    const updatedNonce = await Imperium.nonces(approve.owner);
    expect(updatedNonce.toNumber()).to.be.eq(1);

    const balance = await Imperium.balanceOf(admin);

    expect(
      (await Imperium.allowance(approve.owner, approve.spender)) /
        Math.pow(10, 9)
    ).to.be.eq((balance) / Math.pow(10, 9));

    // succesfull transfer
    await Imperium
      .connect(investorSig)
      .transferFrom(admin, investor, 30000000000000, {
        from: investor,
        gasLimit: 500000,
      });

    const balanceBn = await Imperium.balanceOf(investor);
    // console.log(balanceBn / Math.pow(10, 9));

    expect(balanceBn / Math.pow(10, 9)).to.be.equal(30000)

    // Re-using the same sig doesn't work since the nonce has been incremented
    // on the contract level for replay-protection
    expect(
      Imperium.permit(
        approve.owner,
        approve.spender,
        nonce,
        deadline,
        true,
        v,
        r,
        s
      )
    ).to.be.revertedWith('Imperium/invalid-nonce');

    // invalid ecrecover's return address(0x0), so we must also guarantee that
    // this case fails
    expect(
      Imperium.permit(
        '0x0000000000000000000000000000000000000000',
        approve.spender,
        nonce,
        deadline,
        true,
        '0x99',
        r,
        s
      )
    ).to.be.revertedWith('Imperium/invalid-address-0');

    expect(
      Imperium.permit(
        approve.owner,
        approve.spender,
        nonce,
        deadline,
        true,
        '0x99',
        r,
        s
      )
    ).to.be.revertedWith('eflecto/invalid-permit');
  });
});
