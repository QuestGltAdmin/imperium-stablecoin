const fs = require("fs");

const PAIR_BUSD_ICO$ = '0x0a67A6cC5163f421e7FF559486FFf81858D452ef';
const PAIR_BNB_ICO$ = '0x0E3Bf08D8d504Ef3f975f0dd232C34b0591eCc90';
const PAIR_BNB_BUSD = '0x27E034ed68d9266F3431588e53641303d93388af';

// AddProvider 0 address (Rate pair)
const ZEROADDR = "0x0000000000000000000000000000000000000000";
let ICO$Address = '0x645d7BD47143B24b9F9d13392a43a6E6065294fD'
let ICO$PolicyAddress = '0x0b4BB9fAc47d8c3729f92A24A23f030A22732B91'
let HandlerAddress = '0xFfb6A61e971EDD20f06f3d783eEc5D112d4d234F'

async function main() {

  const ICO$ = await ethers.getContractFactory("ICO$Fraction");
  const ICO$Policy = await ethers.getContractFactory("ICO$FractionPolicy");

  const Ico$ = await ICO$.attach(ICO$Address);
  const Ico$Policy = await ICO$Policy.attach(ICO$PolicyAddress)

  // ICO$
  const mP = await Ico$.setMonetaryPolicy(Ico$Policy.address)
  console.log("Policy setted up on ICO$ ", mP.hash)

  // Policy Contract 
  const addProviderPair = await Ico$Policy.addProviderPair(PAIR_BUSD_ICO$, ZEROADDR);//(These values are for only first time)
  const addProviderPairBNB = await Ico$Policy.addProviderPair(PAIR_BNB_ICO$, PAIR_BNB_BUSD);//(These values are for only first time)
  const setHandler = await Ico$Policy.setHandler(HandlerAddress);
  console.log("ICO$Policy: addProviderPair ", addProviderPair.hash)
  console.log("ICO$Policy: addProviderPair BNB", addProviderPairBNB.hash)
  console.log("ICO$Policy: setHandler ", setHandler.hash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });