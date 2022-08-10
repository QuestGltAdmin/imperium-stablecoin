const fs = require("fs");
const address = require("../address/addressess");

const ROUTER = '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3';
const WBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd';

// $ICO
const IMPERIUM_CONTRACT_ADDRESS = '0x13301153Fc4B90146d5b462F0da406e6f119e47C';

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