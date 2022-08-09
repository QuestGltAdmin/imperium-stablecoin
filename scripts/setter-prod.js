const fs = require("fs");
const PAIR_BUSD_RUSD_MY_DEX = '0x446978165E088A6887Dc11A67C26fd63e0893855';
const PAIR_BUSD_RUSD = '0x7e4B8c9593319Dd351C4D26E85A7a792eDe7939e';
const PAIR_BNB_RUSD = '0xDF50678E65dbF3842854207a05Ff626783f73614';
const PAIR_BNB_BUSD = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';
// RUSD
const DEV_ADDRESS = '0x41d0Ff4a7758bE25B8b27F0a86bf650408BEea3e';
const REFLECTO_CONTRACT_ADDRESS = '0xEA3C823176D2F6feDC682d3cd9C30115448767b3';

// TBT
const LIQUDITY_FEE_ADDRESS = '0x7e4B8c9593319Dd351C4D26E85A7a792eDe7939e'

// SetDefaultReward params
const START=3600;
const END=2592000;
const RATE= "100000000000000";

// AddProvider 0 address (Rate pair)
const ZEROADDR= "0x0000000000000000000000000000000000000000";

let RUSDAddress = '0x4Be8c674C51674bEb729832682bBA5E5b105b6e2'
let RUSDPolicyAddress = '0x1f55D1fF24b1bBD88F49849e4bf3516Ce4439C06'
let HandlerAddress = '0xC6E7900d07cD660d304Cd5dC22da3DaEed8AD334'
let RUSDRewardsAddress = '0x871d5a028f2b26EF8051714A7dE167c42bc2a0b2'

async function main(){

        const RUSD = await ethers.getContractFactory("RUSDFraction");
        const RUSDRewards = await ethers.getContractFactory("RUSDRewards");
        const RUSDPolicy = await ethers.getContractFactory("RUSDFractionPolicy");
        const Handler = await ethers.getContractFactory("Handler");
        
        // const rusd= await RUSD.attach(RUSDAddress);
        const rusdPolicy= await RUSDPolicy.attach(RUSDPolicyAddress)
        const rusdRewards= await RUSDRewards.attach(RUSDRewardsAddress)
        const handler= await Handler.attach(HandlerAddress)


        // RUSD
        const dev = await rusd.setDeveloperAddress(DEV_ADDRESS)
        console.log('Setted dev add ', dev.hash)
        const liq = await rusd.setLiquidityPool(LIQUDITY_FEE_ADDRESS)
        console.log('Setted liq fee add ', liq.hash)
        const pool = await rusd.setReflectoPoolAddress(HandlerAddress)
        console.log('Setted Reflecto pool fee add ', pool.hash)
        const rC = await rusd.setReflectoContractAddress(HandlerAddress)
        console.log('Setted reflecto fee add ', rC.hash)
        const pairA = await rusd.addProviderPair(PAIR_BUSD_RUSD)
        console.log('Setted DEX address BUSD ', pairA.hash)
        const pairA1 = await rusd.addProviderPair(PAIR_BNB_RUSD)
        console.log('Setted DEX address BNB', pairA1.hash)
        const mP = await rusd.setMonetaryPolicy(rusdPolicy.address)
        console.log("Policy setted up on RUSD ", mP.hash)
        console.log('Changed reward address ', setReward.hash)

        // REWARD CONTRACT
        const setDefaultToken= await rusdRewards.setDefaultToken(REFLECTO_CONTRACT_ADDRESS)
        console.log("Reward Contract: set default token", setDefaultToken.hash)
        const setReflectoContractAddress= await rusdRewards.setReflectoContractAddress(HandlerAddress)
        console.log("Reward Contract: set Reflecto Contract", setReflectoContractAddress.hash)
        const setDeveloperAddress= await rusdRewards.setDeveloperAddress(DEV_ADDRESS);
        console.log("Reward Contract: set Developer Address ", setDeveloperAddress.hash)

        // Send Reflecto Tokens
        const setDefaultReward= await rusdRewards.setDefaultReward(START, END, RATE);
        console.log("Reward Contract: setDefaultReward ", setDefaultReward.hash)

        // Policy Contract 
        const addProviderPair= await rusdPolicy.addProviderPair(PAIR_BUSD_RUSD, ZEROADDR);//(These values are for only first time)
        console.log("RUSDPolicy: addProviderPair ", addProviderPair.hash)
        const addProviderPairBNB= await rusdPolicy.addProviderPair(PAIR_BNB_RUSD, PAIR_BNB_BUSD);//(These values are for only first time)
        console.log("RUSDPolicy: addProviderPair BNB", addProviderPairBNB.hash)
        const setHandler= await rusdPolicy.setHandler(HandlerAddress);
        console.log("RUSDPolicy: setHandler ", setHandler.hash)
        // const addProviderPairBNB= await rusdPolicy.addProviderPair(PAIR_BUSD_RUSD_MY_DEX, PAIR_BUSD_RUSD);
        // console.log(addProviderPairBNB)
}

    main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });