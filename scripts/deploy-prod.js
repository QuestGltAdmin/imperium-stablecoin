const fs = require("fs");
const address = require("../address/addressess");

const ROUTER = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

// RUSD
const REFLECTO_CONTRACT_ADDRESS = '0xEA3C823176D2F6feDC682d3cd9C30115448767b3';

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