const fs = require("fs");
const address = require("../address/addressess");


async function main() {
    await run('compile');
    const [deployer] = await ethers.getSigners();
  
    console.log("Running contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploying main contracts

    // 1. $ICO Token
    const Handler = await ethers.getContractFactory("Handler");
    const handler= await Handler.attach('0xC6E7900d07cD660d304Cd5dC22da3DaEed8AD334');
    await handler.stabilizeOnly()
}
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });