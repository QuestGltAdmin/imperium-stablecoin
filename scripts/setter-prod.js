const fs = require("fs");
const PAIR_BUSD_$ICO_MY_DEX = '0x446978165E088A6887Dc11A67C26fd63e0893855';
const PAIR_BUSD_$ICO = '0x7e4B8c9593319Dd351C4D26E85A7a792eDe7939e';
const PAIR_BNB_$ICO = '0xDF50678E65dbF3842854207a05Ff626783f73614';
const PAIR_BNB_BUSD = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';

// AddProvider 0 address (Rate pair)
const ZEROADDR= "0x0000000000000000000000000000000000000000";

let $ICOAddress = '0x4Be8c674C51674bEb729832682bBA5E5b105b6e2'
let $ICOPolicyAddress = '0x1f55D1fF24b1bBD88F49849e4bf3516Ce4439C06'
let HandlerAddress = '0xC6E7900d07cD660d304Cd5dC22da3DaEed8AD334'

async function main(){

        const $ICO = await ethers.getContractFactory("$ICOFraction");
        const $ICOPolicy = await ethers.getContractFactory("$ICOFractionPolicy");
        const Handler = await ethers.getContractFactory("Handler");
        
        // const $ico= await $ICO.attach($ICOAddress);
        const $icoPolicy= await $ICOPolicy.attach($ICOPolicyAddress)
        const handler= await Handler.attach(HandlerAddress)


        // $ICO
        const mP = await $ico.setMonetaryPolicy($icoPolicy.address)
        console.log("Policy setted up on $ICO ", mP.hash)

        // Policy Contract 
        const addProviderPair= await $icoPolicy.addProviderPair(PAIR_BUSD_$ICO, ZEROADDR);//(These values are for only first time)
        console.log("$ICOPolicy: addProviderPair ", addProviderPair.hash)
        const addProviderPairBNB= await $icoPolicy.addProviderPair(PAIR_BNB_$ICO, PAIR_BNB_BUSD);//(These values are for only first time)
        console.log("$ICOPolicy: addProviderPair BNB", addProviderPairBNB.hash)
        const setHandler= await $icoPolicy.setHandler(HandlerAddress);
        console.log("$ICOPolicy: setHandler ", setHandler.hash)
        // const addProviderPairBNB= await $icoPolicy.addProviderPair(PAIR_BUSD_$ICO_MY_DEX, PAIR_BUSD_$ICO);
        // console.log(addProviderPairBNB)
}

    main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });