const ROUTER = '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3';
const WBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd';
const BUSD = '0x78867bbeef44f2326bf8ddd1941a4439382ef2a7'

// $ICO
const DEV_ADDRESS = '0x3Fef1059428da0cC060fd3c0349Db170FE455034';
const IMPERIUM_CONTRACT_ADDRESS = '0x13301153Fc4B90146d5b462F0da406e6f119e47C';
const LIQUDITY_FEE_ADDRESS = '0x79C3860364f18012F99f8D83419BB090B3c52cA8'
const DEX_ADDRESS = ''

async function main() {
    await run('compile');
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploying main contracts
    const $ICO = await ethers.getContractFactory("$ICOFraction");
    // const $ico = await $ICO.deploy();
    const $ico = await upgrades.deployProxy(
      $ICO,
      [await deployer.getAddress(),deployer.address],
      {
        initializer: 'initialize(address,address)',
      },
    )
  
    console.log("$ICO address:", $ico.address);
    
    const $icoPolicy = await upgrades.deployProxy(
      (await ethers.getContractFactory('$ICOFractionPolicy')).connect(deployer),
      [await deployer.getAddress(), $ico.address, BUSD],
      {
        initializer: 'initialize(address,address,address)',
      },
    )
    // console.log("PolicyImplementation Address", $icoPolicyImplementation.address);
    console.log("Policy Proxy Deployed", $icoPolicy.address)   
    console.log("Checking policy BUSD",await $icoPolicy.busd());

    const setProvider= await $icoPolicy.set$ICOStableProvider("0x5E4d60C53A95D71979F4d25c853Cc2E01c922E16");
    console.log("Setted Provider",setProvider.hash);

    // set monetaryPolicy address on $ICO
    const mP = await $ico.setMonetaryPolicy($icoPolicy.address)
    console.log("Policy setted up on $ICO ", mP.hash)

    const Handler = await ethers.getContractFactory("Handler");
    const handler = await Handler.deploy($icoFractionPolicy.address, ROUTER, $ico.address, WBNB, IMPERIUM_CONTRACT_ADDRESS, IMPERIUM_CONTRACT_ADDRESS);

    const stabilize= await handler.stabilize();
    console.log("checking stabilize", stabilize.hash);

    // set Imperium pool address
    // set refllecto contract address
    const dev = await $ico.setDeveloperAddress(DEV_ADDRESS)
    const liq = await $ico.setLiquidityPool(LIQUDITY_FEE_ADDRESS)
    const pool = await $ico.setImperiumPoolAddress(handler.address)
    const rC = await $ico.setImperiumContractAddress(handler.address)
    const pairA = await $ico.addProviderPair(ROUTER)

    console.log('Setted dev add ', dev.hash)
    console.log('Setted liq fee add ', liq.hash)
    console.log('Setted Imperium pool fee add ', pool.hash)
    console.log('Setted Imperium fee add ', rC.hash)
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