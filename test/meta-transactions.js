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
  let reflecto;

  before('setup RUSDFraction contract', setupContracts)

  async function setupContracts() {
    // prepare signers
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    // deploy upgradable token
    reflecto = await (await ethers.getContractFactory('RUSDFraction')).connect(deployer).deploy()
    const rusdReward = await (await ethers.getContractFactory('RUSDRewards'))
    .connect(deployer)
    .deploy(reflecto.address)
    const factory = await ethers.getContractFactory('RUSDFraction')
    reflecto = await upgrades.deployProxy(
      factory,
      [await deployer.getAddress(),rusdReward.address],
      {
        initializer: 'initialize(address,address)',
      },
    )
    // fetch initial supply
    initialSupply = await reflecto.totalSupply()
  }

  it('balance of contract deployer should be 50000000', async () => {
    const [admin] = await ethers.getSigners();
    const balance = await reflecto.balanceOf(admin.address);
    const totalBalance = balance / Math.pow(10, 9);
    expect(totalBalance).to.be.equal(50000000);
  });

  it('initializes DOMAIN_SEPARATOR and PERMIT_TYPEHASH correctly', async () => {
    expect(await reflecto.PERMIT_TYPEHASH_META()).to.be.equal(PERMIT_TYPEHASH);
    const ci = await reflecto.getChainID();
    expect(await reflecto.DOMAIN_SEPARATOR()).to.be.equal(
      getDomainSeparator(await reflecto.name(), reflecto.address, ci.toNumber())
    );
  });

  it('permits and emits Approval (replay safe)', async () => {
    const [adminSig, investorSig] = await ethers.getSigners();
    const investor = investorSig.address;
    const admin = adminSig.address;
    // Try transfer
    // expect(
    //   await reflecto
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
    //   ((await reflecto.balanceOf(investor)) as any) / Math.pow(10, 9)
    // );

    // Get the user's nonce
    const nonceBn = await reflecto.nonces(admin);
    const contractAdress = reflecto.address;
    const chain = await reflecto.getChainID();
    const chainId = chain.toNumber();
    const name = await reflecto.name();
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
    const receipt = await reflecto.permit(
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

    const updatedNonce = await reflecto.nonces(approve.owner);
    expect(updatedNonce.toNumber()).to.be.eq(1);

    const balance = await reflecto.balanceOf(admin);

    expect(
      (await reflecto.allowance(approve.owner, approve.spender)) /
        Math.pow(10, 9)
    ).to.be.eq((balance) / Math.pow(10, 9));

    // succesfull transfer
    await reflecto
      .connect(investorSig)
      .transferFrom(admin, investor, 30000000000000, {
        from: investor,
        gasLimit: 500000,
      });

    const balanceBn = await reflecto.balanceOf(investor);
    // console.log(balanceBn / Math.pow(10, 9));

    expect(balanceBn / Math.pow(10, 9)).to.be.equal(30000-(30000*0.031))

    // Re-using the same sig doesn't work since the nonce has been incremented
    // on the contract level for replay-protection
    expect(
      reflecto.permit(
        approve.owner,
        approve.spender,
        nonce,
        deadline,
        true,
        v,
        r,
        s
      )
    ).to.be.revertedWith('Reflecto/invalid-nonce');

    // invalid ecrecover's return address(0x0), so we must also guarantee that
    // this case fails
    expect(
      reflecto.permit(
        '0x0000000000000000000000000000000000000000',
        approve.spender,
        nonce,
        deadline,
        true,
        '0x99',
        r,
        s
      )
    ).to.be.revertedWith('Reflecto/invalid-address-0');

    expect(
      reflecto.permit(
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
