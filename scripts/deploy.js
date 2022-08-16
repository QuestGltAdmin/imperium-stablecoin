const fs = require("fs");
const address = require("../address/addressess");

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

    // Defining new user
    let user = {
        $ico: $ico.address,
        $icoPolicy: $icoPolicy.address,
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