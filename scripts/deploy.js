const fs = require("fs");
const address = require("../address/addressess");

const ROUTER = '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3';
const WBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd';

// RUSD
const REFLECTO_CONTRACT_ADDRESS = '0x13301153Fc4B90146d5b462F0da406e6f119e47C';

async function main() {
    await run('compile');
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploying main contracts

    // 1. RUSD Token
    const RUSD = await ethers.getContractFactory("RUSDFraction");
    const rusd= await RUSD.deploy();
  
    console.log("RUSD address:", rusd.address);

    // 2. RUSD Rewards Contract
    const RUSDRewards = await ethers.getContractFactory("RUSDRewards");
    const rusdRewards = await RUSDRewards.deploy(rusd.address);

    console.log("Rewards address:", rusdRewards.address);

    // 3. RUSD Policy Contract
    const RUSDPolicy = await ethers.getContractFactory("RUSDFractionPolicy");
    const rusdPolicy = await RUSDPolicy.deploy();

    console.log("RUSDFractionPolicy Address", rusdPolicy.address);

    // 3. Handler Contract
    const Handler = await ethers.getContractFactory("Handler");
    const handler = await Handler.deploy(rusdPolicy.address, ROUTER, rusd.address, WBNB, REFLECTO_CONTRACT_ADDRESS, rusdRewards.address);
    
    console.log("Handler Contract: ", handler.address);

    // Defining new user
    let user = {
        rusd: rusd.address,
        rusdPolicy: rusdPolicy.address,
        rusdReward: rusdRewards.address,
        handler: handler.address,
    };
    address.push(user);
    const address_json= JSON.stringify(address)
    fs.writeFileSync("address/addressess.json", address_json)
}
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });