const fs = require("fs");

const PAIR_BUSD_$ICO = '0x0a67A6cC5163f421e7FF559486FFf81858D452ef';
const PAIR_BNB_$ICO = '0x0E3Bf08D8d504Ef3f975f0dd232C34b0591eCc90';
const PAIR_BNB_BUSD = '0x27E034ed68d9266F3431588e53641303d93388af';
// $ICO
const DEV_ADDRESS = '0x3Fef1059428da0cC060fd3c0349Db170FE455034';
const IMPERIUM_CONTRACT_ADDRESS = '0x13301153Fc4B90146d5b462F0da406e6f119e47C';
const LIQUDITY_FEE_ADDRESS = '0x79C3860364f18012F99f8D83419BB090B3c52cA8'

// AddProvider 0 address (Rate pair)
const ZEROADDR= "0x0000000000000000000000000000000000000000";
let $ICOAddress = '0x645d7BD47143B24b9F9d13392a43a6E6065294fD'
let $ICOPolicyAddress = '0x0b4BB9fAc47d8c3729f92A24A23f030A22732B91'
let HandlerAddress = '0xFfb6A61e971EDD20f06f3d783eEc5D112d4d234F'

async function main(){

        const $ICO = await ethers.getContractFactory("$ICOFraction");
        const $ICOPolicy = await ethers.getContractFactory("$ICOFractionPolicy");
        const Handler = await ethers.getContractFactory("Handler");
        
        const $ico= await $ICO.attach($ICOAddress);
        const $icoPolicy= await $ICOPolicy.attach($ICOPolicyAddress)
        const handler= await Handler.attach(HandlerAddress)

        // $ICO
        const dev = await $ico.setDeveloperAddress(DEV_ADDRESS)
        const liq = await $ico.setLiquidityPool(LIQUDITY_FEE_ADDRESS)
        const pool = await $ico.setImperiumPoolAddress(HandlerAddress)
        const rC = await $ico.setImperiumContractAddress(HandlerAddress)
        const pairA = await $ico.addProviderPair(PAIR_BUSD_$ICO)
        const pairA1 = await $ico.addProviderPair(PAIR_BNB_$ICO)
        const mP = await $ico.setMonetaryPolicy($icoPolicy.address)
        console.log('Setted dev add ', dev.hash)
        console.log('Setted liq fee add ', liq.hash)
        console.log('Setted Imperium pool fee add ', pool.hash)
        console.log('Setted Imperium fee add ', rC.hash)
        console.log('Setted DEX address BUSD ', pairA.hash)
        console.log('Setted DEX address BNB', pairA1.hash)
        console.log("Policy setted up on $ICO ", mP.hash)

        // Policy Contract 
        const addProviderPair= await $icoPolicy.addProviderPair(PAIR_BUSD_$ICO, ZEROADDR);//(These values are for only first time)
        const addProviderPairBNB= await $icoPolicy.addProviderPair(PAIR_BNB_$ICO, PAIR_BNB_BUSD);//(These values are for only first time)
        const setHandler= await $icoPolicy.setHandler(HandlerAddress);
        console.log("$ICOPolicy: addProviderPair ", addProviderPair.hash)
        console.log("$ICOPolicy: addProviderPair BNB", addProviderPairBNB.hash)
        console.log("$ICOPolicy: setHandler ", setHandler.hash)
}

    main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });