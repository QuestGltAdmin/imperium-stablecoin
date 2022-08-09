const ROUTER = '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3';
const WBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd';
const BUSD = '0x78867bbeef44f2326bf8ddd1941a4439382ef2a7'

// RUSD
const DEV_ADDRESS = '0x3Fef1059428da0cC060fd3c0349Db170FE455034';
const REFLECTO_CONTRACT_ADDRESS = '0x13301153Fc4B90146d5b462F0da406e6f119e47C';
const LIQUDITY_FEE_ADDRESS = '0x79C3860364f18012F99f8D83419BB090B3c52cA8'
const DEX_ADDRESS = ''

async function main() {
    await run('compile');
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploying main contracts
    const RUSD = await ethers.getContractFactory("RUSDFraction");
    // const rusd = await RUSD.deploy();
    const rusd = await upgrades.deployProxy(
      RUSD,
      [await deployer.getAddress(),deployer.address],
      {
        initializer: 'initialize(address,address)',
      },
    )
  
    console.log("RUSD address:", rusd.address);

    const RUSDRewards = await ethers.getContractFactory("RUSDRewards");
    const rusdRewards = await RUSDRewards.deploy(rusd.address);

    console.log("Rewards address:", rusdRewards.address);
    
    const rusdPolicy = await upgrades.deployProxy(
      (await ethers.getContractFactory('RUSDFractionPolicy')).connect(deployer),
      [await deployer.getAddress(), rusd.address, BUSD],
      {
        initializer: 'initialize(address,address,address)',
      },
    )
    // console.log("PolicyImplementation Address", rusdPolicyImplementation.address);
    console.log("Policy Proxy Deployed", rusdPolicy.address)   
    console.log("Checking policy BUSD",await rusdPolicy.busd());

    const setProvider= await rusdPolicy.setRUSDStableProvider("0x5E4d60C53A95D71979F4d25c853Cc2E01c922E16");
    console.log("Setted Provider",setProvider.hash);

    // change RUSD Reward contract
    const cngTx = await rusd.setRewardContract(rusdRewards.address)

    console.log('Changed reward address ', cngTx.hash)

    // set monetaryPolicy address on RUSD
    const mP = await rusd.setMonetaryPolicy(rusdPolicy.address)
    console.log("Policy setted up on RUSD ", mP.hash)

    const Handler = await ethers.getContractFactory("Handler");
    const handler = await Handler.deploy(rusdFractionPolicy.address, ROUTER, rusd.address, WBNB, REFLECTO_CONTRACT_ADDRESS, REFLECTO_CONTRACT_ADDRESS);

    const stabilize= await handler.stabilize();
    console.log("checking stabilize", stabilize.hash);

    // set reflecto pool address
    // set refllecto contract address
    const dev = await rusd.setDeveloperAddress(DEV_ADDRESS)
    const liq = await rusd.setLiquidityPool(LIQUDITY_FEE_ADDRESS)
    const pool = await rusd.setReflectoPoolAddress(handler.address)
    const rC = await rusd.setReflectoContractAddress(handler.address)
    const pairA = await rusd.addProviderPair(ROUTER)

    console.log('Setted dev add ', dev.hash)
    console.log('Setted liq fee add ', liq.hash)
    console.log('Setted Reflecto pool fee add ', pool.hash)
    console.log('Setted reflecto fee add ', rC.hash)
    console.log('Setted DEX address ', pairA.hash)

    // write missing settings
    // write here how to set up new reward pool
    // how to accept pool
    // how to start rewards
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });