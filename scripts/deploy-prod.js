const fs = require("fs");
const address = require("../address/addressess");

const ROUTER = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

// $ICO
const IMPERIUM_CONTRACT_ADDRESS = '0xEA3C823176D2F6feDC682d3cd9C30115448767b3';

async function main() {
    await run('compile');
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploying main contracts

    // 1. $ICO Token
    const $ICO = await ethers.getContractFactory("$ICOFraction");
    const $ico= await $ICO.deploy();
  
    console.log("$ICO address:", $ico.address);

    // 3. $ICO Policy Contract
    const $ICOPolicy = await ethers.getContractFactory("$ICOFractionPolicy");
    const $icoPolicy = await $ICOPolicy.deploy();

    console.log("$ICOFractionPolicy Address", $icoPolicy.address);

    // 3. Handler Contract
    const Handler = await ethers.getContractFactory("Handler");
    const handler = await Handler.deploy($icoPolicy.address, ROUTER, $ico.address, WBNB, IMPERIUM_CONTRACT_ADDRESS);
    
    console.log("Handler Contract: ", handler.address);

    // Defining new user
    let user = {
        $ico: $ico.address,
        $icoPolicy: $icoPolicy.address,
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