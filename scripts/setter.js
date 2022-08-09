const fs = require("fs");

const PAIR_BUSD_RUSD = '0x0a67A6cC5163f421e7FF559486FFf81858D452ef';
const PAIR_BNB_RUSD = '0x0E3Bf08D8d504Ef3f975f0dd232C34b0591eCc90';
const PAIR_BNB_BUSD = '0x27E034ed68d9266F3431588e53641303d93388af';
// RUSD
const DEV_ADDRESS = '0x3Fef1059428da0cC060fd3c0349Db170FE455034';
const REFLECTO_CONTRACT_ADDRESS = '0x13301153Fc4B90146d5b462F0da406e6f119e47C';
const LIQUDITY_FEE_ADDRESS = '0x79C3860364f18012F99f8D83419BB090B3c52cA8'

// SetDefaultReward params
const START=10;
const END=360000;
const RATE= "100000000";

// AddProvider 0 address (Rate pair)
const ZEROADDR= "0x0000000000000000000000000000000000000000";
let RUSDAddress = '0x645d7BD47143B24b9F9d13392a43a6E6065294fD'
let RUSDPolicyAddress = '0x0b4BB9fAc47d8c3729f92A24A23f030A22732B91'
let HandlerAddress = '0xFfb6A61e971EDD20f06f3d783eEc5D112d4d234F'
let RUSDRewardsAddress = '0xf2dcE23604236c1246c56ABF34429b45b1B018B6'

async function main(){

        const RUSD = await ethers.getContractFactory("RUSDFraction");
        const RUSDRewards = await ethers.getContractFactory("RUSDRewards");
        const RUSDPolicy = await ethers.getContractFactory("RUSDFractionPolicy");
        const Handler = await ethers.getContractFactory("Handler");
        
        const rusd= await RUSD.attach(RUSDAddress);
        const rusdPolicy= await RUSDPolicy.attach(RUSDPolicyAddress)
        const rusdRewards= await RUSDRewards.attach(RUSDRewardsAddress)
        const handler= await Handler.attach(HandlerAddress)

        // RUSD
        const dev = await rusd.setDeveloperAddress(DEV_ADDRESS)
        const liq = await rusd.setLiquidityPool(LIQUDITY_FEE_ADDRESS)
        const pool = await rusd.setReflectoPoolAddress(HandlerAddress)
        const rC = await rusd.setReflectoContractAddress(HandlerAddress)
        const pairA = await rusd.addProviderPair(PAIR_BUSD_RUSD)
        const pairA1 = await rusd.addProviderPair(PAIR_BNB_RUSD)
        const mP = await rusd.setMonetaryPolicy(rusdPolicy.address)
        // console.log('Changed reward address ', setReward.hash)
        console.log('Setted dev add ', dev.hash)
        console.log('Setted liq fee add ', liq.hash)
        console.log('Setted Reflecto pool fee add ', pool.hash)
        console.log('Setted reflecto fee add ', rC.hash)
        console.log('Setted DEX address BUSD ', pairA.hash)
        console.log('Setted DEX address BNB', pairA1.hash)
        console.log("Policy setted up on RUSD ", mP.hash)

        // REWARD CONTRACT
        const setDefaultToken= await rusdRewards.setDefaultToken(REFLECTO_CONTRACT_ADDRESS)
        const setReflectoContractAddress= await rusdRewards.setReflectoContractAddress(HandlerAddress)
        const setDeveloperAddress= await rusdRewards.setDeveloperAddress(DEV_ADDRESS);
        console.log("Reward Contract: set default token", setDefaultToken.hash)
        console.log("Reward Contract: set Reflecto Contract", setReflectoContractAddress.hash)
        console.log("Reward Contract: set Developer Address ", setDeveloperAddress.hash)

        // Send Reflecto Tokens
        const setDefaultReward= await rusdRewards.setDefaultReward(START, END, RATE);
        console.log("Reward Contract: setDefaultReward ", setDefaultReward.hash)

        // Policy Contract 
        const addProviderPair= await rusdPolicy.addProviderPair(PAIR_BUSD_RUSD, ZEROADDR);//(These values are for only first time)
        const addProviderPairBNB= await rusdPolicy.addProviderPair(PAIR_BNB_RUSD, PAIR_BNB_BUSD);//(These values are for only first time)
        const setHandler= await rusdPolicy.setHandler(HandlerAddress);
        console.log("RUSDPolicy: addProviderPair ", addProviderPair.hash)
        console.log("RUSDPolicy: addProviderPair BNB", addProviderPairBNB.hash)
        console.log("RUSDPolicy: setHandler ", setHandler.hash)
}

    main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });