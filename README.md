### How to maintain price?

Market Capital-   100 ICO$ -- 100 USD (in Reserve)

Market cap = number of tokens * value of single token.

If ICO$ is rising, market cap will rise. 

To maintain market cap we will reduce number of tokens.

* Trigger range should be less than 5%. 

### ICO$:

ICO$’s non-dilutive supply changes introduce a fundamentally different set of incentives for traders because changes in demand are expressed by the number of ICO$ held in addition to price. As a result, profit-maximizing factors are compelled to revise new trading strategies. This new behavior generates a step-function-like movement pattern that is distinct from Bitcoin and traditional assets.


1.	Fracs are hidden denomination of ICO$ tokens. Meaning some Fracs make up one ICO$ token.
2.	Frac balance converted into Fractions are always rounded down      (truncated).

#### CPI: #### 

*	Don't follow CPI, just follow 1 USD Because CPI isn't the correct way to measure inflation. Inflation is a subjective matter, hence it's not required that we follow the inflation, the supply change and demands from the community will automatically adjust with the inflation. Else, it'll be unfair for some.

*	CPI is just like if you have a bucket of different products (apple, cooking oil, rice, etc.) and you see the price of that bucket 1 year later, the difference in price refers to inflation. 


### Steps: ###

***1.	Deploy Token: ICO$ Fraction***

i.	Initialize (Owner Address): _`initialize(<owner_address>)`_ - Create ICO$ token and sets default values in the variables.

ii.	Set Monetary Policy (monetary policy address)

iii.	Set Default Reward Token _`setDefaultReward(<rewardToken_address>)`

iv.	*Request to add reward tokens*: _`addReward(IERC20 token <address>, start, end, rate)`_ - This function is payable in because fees must be paid in order to request a new token to be added as a reward token in the pool. 
(Note: Must be run after approval of the token)

v.	Approve the reward tokens that are requested to be added (OnlyOwner): _`approveReward(<reward_token>)`_

vi.	Claim the rewards if you possess ICO$ tokens with you: _`claim(_to, [_reward_token1, _reward_token2, ...])`_

***2.	Deploy Monetary Policy: ICO$ Fraction Policy***

i.	Initialize (Owner Address,  ICO$ Fraction  Address)

ii.	Set Handler (Handler Address)

iii.	Add Provider (Provider Address): Index 0 will save the stable coin 

iv.	Set ICO$ Stable Provider (provider Address): for decentralize exchange rate rate


***3. Handler:***

	Rebase the supply: `rebase()` - It'll check the market price of ICO$, and if the fluctuation if more than 5% on either side, rebase will change the total supply and takes the coin back to 1$.



### How this contract work: ###

1.	Deploy stable Coin ICO$ Fraction contract.
2.	Initialize ICO$ Fraction  contract by running function initialize with owner address. 
3.	Now deploy Policy Contact.
4.	Initialize ICO$ Fraction Policy  contract by running function initialize with owner address, ICO$ Fraction Contract address.
5.	SetMonetoryPolicy in ICO$ Fraction contract.
6.	Add liquidity with stable coin like ICO$ or TUSD or Dai on any platform like sushiswap, uniswap. You will get provider address here
7.	Addprovide in Policy contract for live price and to change price according to our target price.
8.	Deploy Handler contract with policy contract in constructor.
9.	Run setHandler in policy contract to run rebase function
10.	You are now all set to run rebase function and make your coin stable.

### Contracts at Work ###

•	ICO$ token (stablecoin)

•	Imperium Token (reward token)

•	Policy contract

•	Handler 


## Deploy Testnet

`npx hardhat run --network testnet scripts/deploy.js`
initialize ICO$ and Policy
exclude contracts from fee Imperium exclude pool, Ico$ exlude main addres
create liqudity pools
send Imperium to Reward contract
send ICO$ to users
`npx hardhat run --network testnet scripts/setter.js`

## Test Contracts

ICO$ address: 0x645d7BD47143B24b9F9d13392a43a6E6065294fD
Rewards address: 0xf2dcE23604236c1246c56ABF34429b45b1B018B6
ICO$FractionPolicy Address 0x0b4BB9fAc47d8c3729f92A24A23f030A22732B91
Handler Contract:  0xFfb6A61e971EDD20f06f3d783eEc5D112d4d234F

## Deploy Mainnet

`npx hardhat run --network mainnet scripts/deploy-prod.js`
verify contract ICO$

`npx hardhat verify --network mainnet 0x18a6fB85Fe50e8C7a13d1Bd0459092a162F55415`

initialize ICO$ and Policy
exclude contracts from fee Imperium exclude pool, Ico$ exlude main addres
create liqudity pools
send Imperium to Reward contract
`npx hardhat run --network mainnet scripts/setter-prod.js`
send ICO$ to users

## Flatten contracts for REMIX

npx hardhat flatten contracts/ICO$Fraction.sol > Ico$.sol

## Mainnet Contracts

ICO$ address: 0x4Be8c674C51674bEb729832682bBA5E5b105b6e2
Rewards address: 0x871d5a028f2b26EF8051714A7dE167c42bc2a0b2
ICO$FractionPolicy Address 0x1f55D1fF24b1bBD88F49849e4bf3516Ce4439C06
Handler Contract:  0xC6E7900d07cD660d304Cd5dC22da3DaEed8AD334