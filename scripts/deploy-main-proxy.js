const WBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd';
const BUSD = '0x78867bbeef44f2326bf8ddd1941a4439382ef2a7'

// ICO$
const DEX_ADDRESS = ''

async function main() {
    await run('compile');
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploying main contracts
    const ICO$ = await ethers.getContractFactory("ICO$Fraction");
    // const Ico$ = await ICO$.deploy();
    const Ico$ = await upgrades.deployProxy(
      ICO$,
      [await deployer.getAddress()],
      {
        initializer: 'initialize(address)',
      },
    )
  
    console.log("ICO$ address:", Ico$.address);
    
    const Ico$Policy = await upgrades.deployProxy(
      (await ethers.getContractFactory('ICO$FractionPolicy')).connect(deployer),
      [await deployer.getAddress(), Ico$.address, BUSD],
      {
        initializer: 'initialize(address,address,address)',
      },
    )
    // console.log("PolicyImplementation Address", Ico$PolicyImplementation.address);
    console.log("Policy Proxy Deployed", Ico$Policy.address)   
    console.log("Checking policy BUSD",await Ico$Policy.busd());

    const setProvider= await Ico$Policy.setICO$StableProvider("0x5E4d60C53A95D71979F4d25c853Cc2E01c922E16");
    console.log("Setted Provider",setProvider.hash);

    // set monetaryPolicy address on ICO$
    const mP = await Ico$.setMonetaryPolicy(Ico$Policy.address)
    console.log("Policy setted up on ICO$ ", mP.hash)

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