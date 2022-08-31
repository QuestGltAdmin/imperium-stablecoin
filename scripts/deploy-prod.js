const fs = require("fs");
const address = require("../address/addressess");

// ICO$
const IMPERIUM_CONTRACT_ADDRESS = '0xEA3C823176D2F6feDC682d3cd9C30115448767b3';

async function main() {
    await run('compile');
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploying main contracts

    // 1. ICO$ Token
    const ICO$ = await ethers.getContractFactory("ICO$Fraction");
    const Ico$= await ICO$.deploy();
  
    console.log("ICO$ address:", Ico$.address);

    // 3. ICO$ Policy Contract
    const ICO$Policy = await ethers.getContractFactory("ICO$FractionPolicy");
    const Ico$Policy = await ICO$Policy.deploy();

    console.log("ICO$FractionPolicy Address", Ico$Policy.address);

    // Defining new user
    let user = {
        Ico$: Ico$.address,
        Ico$Policy: Ico$Policy.address,
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