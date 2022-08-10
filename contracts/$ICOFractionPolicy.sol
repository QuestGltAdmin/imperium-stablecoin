pragma solidity 0.7.6;

import "./_external/SafeMath.sol";
import "./_external/Ownable.sol";

import "./lib/SafeMathInt.sol";
import "./lib/UInt256Lib.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}    

interface I$ICOFraction {
    function totalSupply() external view returns (uint256);

    function rebase(uint256 epoch, int256 supplyDelta)
        external
        returns (uint256);

    function balanceOf(address user) external view returns (uint256);
    
    function approve(address spender,uint256 value) external returns (bool);

    function mint(address to, uint256 value) external;

    function burn(address to, uint256 value) external;

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
}

interface IProviderPair {
    function getReserves()
        external
        view
        returns (
            uint112,
            uint112,
            uint32
        );

    function sync() external;

    function token0() external view returns(address);
    function token1() external view returns(address);
}

contract $ICOFractionPolicy is Ownable {
    using SafeMath for uint256;
    using SafeMathInt for int256;
    using UInt256Lib for uint256;

    event Stabilize(
        uint256 new$ICOSupply
    );
    event LogRebase(
        uint256 indexed epoch,
        uint256 exchangeRate,
        uint256 targetRate,
        int256 requestedSupplyAdjustment,
        uint256 timestampSec
    );

    I$ICOFraction public $icoFracs;
    IERC20 public busd;
    IProviderPair[] public providerPairs;

    mapping(IProviderPair => IProviderPair) public pairWithBUSD;

    IProviderPair public ratePair;

    // If the current exchange rate is within this fractional distance from the target, no supply
    // update is performed.
    // (ie) abs(rate - targetRate) / targetRate < deviationThreshold, then no supply change.
    // DECIMALS Fixed point number.
    uint256 public deviationThreshold;

    // The number of rebase cycles since inception
    uint256 public epoch;

    uint256 private constant DECIMALS = 9;

    // Due to the expression in computeSupplyDelta(), MAX_RATE * MAX_SUPPLY must fit into an int256.
    // Both are 9 decimals fixed point numbers.
    uint256 private constant MAX_RATE = 10**6 * 10**DECIMALS;
    // MAX_SUPPLY = MAX_INT256 / MAX_RATE
    uint256 private constant MAX_SUPPLY = uint256(type(int256).max) / MAX_RATE;

    // This module handles the rebase execution and downstream notification.
    address public handler;

    modifier onlyHandler() {
        require(msg.sender == handler);
        _;
    }
  
    function abs(int x) private pure returns (uint) {
        uint y= uint(x >= 0 ? x : -x);
        return y;
    }   

    function checkDeviation(
        uint256 exchangeRateWithBUSD,
        uint256 exchangeRateWith$ICO
    ) internal pure returns (bool) {
        uint256 deviation;
        deviation =
            (abs(int256(exchangeRateWithBUSD - exchangeRateWith$ICO)) * 100) /
            exchangeRateWithBUSD;
        if (deviation > 5) {
            return true;
        }
        return false;
    }

    // For TOKEN/BUSD
    function getPriceData(IProviderPair providerPair) public view returns (uint256) {
        uint112 reserve0;
        uint112 reserve1;
        uint32 timestamp;
        uint256 exchangeRate;
        (reserve0, reserve1, timestamp) = IProviderPair(providerPair).getReserves();
        // Check which coin is lesser decimal
        address token0= IProviderPair(providerPair).token0();
        address token1= IProviderPair(providerPair).token1();
        uint8 reserve0Decimal= IERC20(token0).decimals();
        uint8 reserve1Decimal = IERC20(token1).decimals();
        uint256 decimalDiff;

        if (reserve0Decimal > reserve1Decimal) {
            decimalDiff = uint256(reserve0Decimal - reserve1Decimal);
            reserve1 = uint112(reserve1 * uint112(10**decimalDiff));
        } else {
            decimalDiff = uint256(reserve1Decimal - reserve0Decimal);
            reserve0 = uint112(reserve0 * uint112(10**decimalDiff));
        }
        if(token0 == address(busd) || token0== address($icoFracs)){
            exchangeRate = (uint256((reserve0 * 10** DECIMALS )/ reserve1)); 
        }else{
            exchangeRate = (uint256((reserve1 * 10** DECIMALS ) / reserve0));
        }
        return (exchangeRate);
    }

    function getPriceData() public view returns (uint256) {
        uint112 reserve0;
        uint112 reserve1;
        uint32 timestamp;
        uint256 exchangeRate;
        (reserve0, reserve1, timestamp) = IProviderPair(ratePair).getReserves();
        address token0 = IProviderPair(ratePair).token0();

        if(token0 == address($icoFracs)){
            
            exchangeRate = (uint256(reserve1/reserve0));    
        }else{
            exchangeRate = (uint256(reserve0/reserve1));
        }
        return (exchangeRate);
    }

    /**
     * @notice Initiates a new rebase operation, provided the minimum time period has elapsed.
     *
     * @dev The supply adjustment equals (_totalSupply * DeviationFromTargetRate)
     *      Where DeviationFromTargetRate is (MarketOracleRate - targetRate) / targetRate
     *      and targetRate is fixed to 1.
    */
    function rebase() external onlyHandler {
        epoch = epoch.add(1);

        uint256 targetRate = 10**DECIMALS; // $1
        uint256 exchangeRate;

        (exchangeRate) = getPriceData();
        if (exchangeRate > MAX_RATE) {
            exchangeRate = MAX_RATE;
        }
        int256 supplyDelta = computeSupplyDelta(exchangeRate, targetRate);

        if (
            supplyDelta > 0 &&
            $icoFracs.totalSupply().add(uint256(supplyDelta)) > MAX_SUPPLY
        ) {
            supplyDelta = (MAX_SUPPLY.sub($icoFracs.totalSupply()))
                .toInt256Safe();
        }

        uint256 supplyAfterRebase = $icoFracs.rebase(epoch, supplyDelta);
        assert(supplyAfterRebase <= MAX_SUPPLY);
        for (uint256 i = 0; i < providerPairs.length; i++) {
            IProviderPair(providerPairs[i]).sync();
        }
        emit LogRebase(
            epoch,
            exchangeRate,
            targetRate,
            supplyDelta,
            block.timestamp
        );
    }

    function stabilize() public onlyHandler {
        for(uint8 i=0; i<providerPairs.length; i++){
            uint112 reserve0;
            uint112 reserve1;
            uint32 timestamp;
            uint8 decimalDiff;
            address token0;
            address token1;
            uint8 token0Decimals;
            uint8 token1Decimals;
            uint256 supplyToChange;
            (reserve0, reserve1, timestamp) = IProviderPair(providerPairs[i]).getReserves();
            //  for rate pair: $ICO/BUSD
            if (address(providerPairs[i]) == address(ratePair)) {
                token0 = IProviderPair(providerPairs[i]).token0(); 
                token1 = IProviderPair(providerPairs[i]).token1();

                // Always make token0 ICO
                if(token1 == address($icoFracs)){
                    address newToken= token0;
                    token0 = token1;
                    token1= newToken;

                    uint112 reserve_ = reserve0;
                    reserve0= reserve1;
                    reserve1 = reserve_;
                }

                token0Decimals = IERC20(token0).decimals();
                token1Decimals = IERC20(token1).decimals();

                if (token0Decimals > token1Decimals) {
                    decimalDiff = token0Decimals - token1Decimals;
                    reserve1 = uint112(reserve1 * (10**uint112(decimalDiff)));
                } else if (token0Decimals < token1Decimals) {
                    decimalDiff = token1Decimals - token0Decimals;
                    reserve0 = uint112(reserve0 * (10**uint112(decimalDiff)));
                }

                if(reserve0 > reserve1){
                    supplyToChange = uint256(reserve0 - reserve1);
                    supplyToChange = supplyToChange/(10**uint256(decimalDiff));
                    I$ICOFraction($icoFracs).burn(address(providerPairs[i]), supplyToChange);
                }
                else if(reserve0 < reserve1){
                    supplyToChange = uint256(reserve1 - reserve0);
                    supplyToChange = supplyToChange/(10**uint256(decimalDiff));
                    I$ICOFraction($icoFracs).mint(address(providerPairs[i]), supplyToChange);
                }
                else{
                    continue;
                }
            }
            // for other pairs
            else{
                stabilizeOtherPairs(providerPairs[i]);
            }   
            IProviderPair(providerPairs[i]).sync();
        }
        uint256 new$ICOSupply= I$ICOFraction($icoFracs).totalSupply();
        emit Stabilize(new$ICOSupply);
    }

    function stabilizeOtherPairs(IProviderPair _providerPair) internal{
        uint112 otherPair_reserve0;
        uint112 otherPair_reserve1;
        uint32 otherPair_timestamp;
        (otherPair_reserve0, otherPair_reserve1, otherPair_timestamp)
            =IProviderPair(pairWithBUSD[_providerPair]).getReserves();
        
        // Exchange rate of Other token with BUSD
        uint exchangeRateWithBUSD= getPriceData(pairWithBUSD[_providerPair]);  
        uint supplyChange;
        uint112 reserve0;
        uint112 reserve1;
        uint32 timestamp;
        address token0= IProviderPair(_providerPair).token0();
        address token1= IProviderPair(_providerPair).token1();   
        uint8 token1Decimals= IERC20(token1).decimals();  
        uint8 token0Decimals= IERC20(token0).decimals();  
        (reserve0, reserve1, timestamp) =IProviderPair(_providerPair).getReserves();
        // Exchange rate of Other token with $ICO
        uint exchangeRateWith$ICO= getPriceData(_providerPair);
        // CHECK DEVIATION
        if (checkDeviation(exchangeRateWithBUSD, exchangeRateWith$ICO)) {
            if (token0 == address($icoFracs)) {
                if (int256(exchangeRateWithBUSD - exchangeRateWith$ICO) > 0) {
                    supplyChange = uint256(
                        uint256(reserve1) *
                            uint256(exchangeRateWithBUSD - exchangeRateWith$ICO)
                    );
                    supplyChange = supplyChange.div(
                        10**uint256(token1Decimals)
                    );
                    I$ICOFraction($icoFracs).mint(
                        address(_providerPair),
                        supplyChange
                    );
                } else if (
                    int256(exchangeRateWith$ICO - exchangeRateWithBUSD) > 0
                ) {
                    supplyChange = uint256(
                        uint256(reserve1) *
                            uint256(exchangeRateWith$ICO - exchangeRateWithBUSD)
                    );
                    supplyChange = supplyChange.div(
                        10**uint256(token1Decimals)
                    );
                    I$ICOFraction($icoFracs).burn(
                        address(_providerPair),
                        supplyChange
                    );
                }
            } else {
                if (int256(exchangeRateWithBUSD - exchangeRateWith$ICO) > 0) {
                    supplyChange = uint256(
                        uint256(reserve0) *
                            uint256(exchangeRateWithBUSD - exchangeRateWith$ICO)
                    );
                    supplyChange = supplyChange.div(
                        10**uint256(token0Decimals)
                    );
                    I$ICOFraction($icoFracs).mint(
                        address(_providerPair),
                        supplyChange
                    );
                } else if (
                    int256(exchangeRateWith$ICO - exchangeRateWithBUSD) > 0
                ) {
                    supplyChange = uint256(
                        uint256(reserve0) *
                            uint256(exchangeRateWith$ICO - exchangeRateWithBUSD)
                    );
                    supplyChange = supplyChange.div(
                        10**uint256(token0Decimals)
                    );
                    I$ICOFraction($icoFracs).burn(
                        address(_providerPair),
                        supplyChange
                    );
                }
            }
        }
    }

    function addProviderPair(IProviderPair _$ICOProviderPair, IProviderPair _OtherTokenPairWithBUSD) external onlyOwner {
        if (providerPairs.length == 0) {
            ratePair = _$ICOProviderPair;
        }
        require(providerPairs.length <= 50, "cannot add more than 50");
        // require(address(_$ICOProviderPair) != address(0) && address(_OtherTokenPairWithBUSD)!=address(0), "Invalid Parameter Address");
        providerPairs.push(_$ICOProviderPair);
        // If the pair is with $ICO/BNB then, Other token pair is= BNB/BUSD
        pairWithBUSD[_$ICOProviderPair]= _OtherTokenPairWithBUSD;   
    }

    function set$ICOStableProvider(IProviderPair _ratePair) external onlyOwner {
        ratePair = _ratePair;
    }

    /**
     * @notice Sets the reference to the handler.
     * @param handler_ The address of the handler contract.
     */
    function setHandler(address handler_) external onlyOwner {
        handler = handler_;
    }

    /**
     * @notice Sets the deviation threshold fraction. If the exchange rate given by the market
     *         oracle is within this fractional distance from the targetRate, then no supply
     *         modifications are made. DECIMALS fixed point number.
     * @param deviationThreshold_ The new exchange rate threshold fraction.
     */
    function setDeviationThreshold(uint256 deviationThreshold_)
        external
        onlyOwner
    {
        deviationThreshold = deviationThreshold_;
    }

    /**
     * @notice A multi-chain $ICO interface method. The Imperium monetary policy contract
     *         on the base-chain and XC-ImperiumController contracts on the satellite-chains
     *         implement this method. It atomically returns two values:
     *         what the current contract believes to be,
     *         the globalImperiumEpoch and global$ICOSupply.
     * @return globalImperiumEpoch The current epoch number.
     * @return global$ICOSupply The total supply at the current epoch.
     */
    function globalImperiumEpochAnd$ICOSupply()
        external
        view
        returns (uint256, uint256)
    {
        return (epoch, $icoFracs.totalSupply());
    }

    /**
     * @dev ZOS upgradable contract initialization method.
     *      It is called at the time of contract creation to invoke parent class initializers and
     *      initialize the contract's state variables.
     */
    function initialize(address owner_, I$ICOFraction $icoFracs_, IERC20 _busd)
        public
        initializer
    {
        Ownable.initialize(owner_);
        // deviationThreshold = 0.05e18 = 5e16
        deviationThreshold = 5 * 10**(DECIMALS - 2);
        epoch = 0;
        $icoFracs = $icoFracs_;
        busd= _busd;
    }

    /**
     * @return Computes the total supply adjustment in response to the exchange rate
     *         and the targetRate.
     */
    function computeSupplyDelta(uint256 rate, uint256 targetRate)
        internal
        view
        returns (int256)
    {
        if (withinDeviationThreshold(rate, targetRate)) {
            return 0;
        }

        // supplyDelta = totalSupply * (rate - targetRate) / targetRate
        int256 targetRateSigned = targetRate.toInt256Safe();
        return
            $icoFracs
                .totalSupply()
                .toInt256Safe()
                .mul(rate.toInt256Safe().sub(targetRateSigned))
                .div(targetRateSigned);
    }

    function removeProvider(IProviderPair _providerPair) external onlyOwner{
        require(_providerPair!=ratePair, "Cannot delete rate pair");
        bool flag=false;
        for(uint8 i=0;i < providerPairs.length; i++){
            if(providerPairs[i]== _providerPair){
                providerPairs[i]= providerPairs[providerPairs.length-1];
                providerPairs.pop();
                delete pairWithBUSD[_providerPair];
                flag = false;
                break;
            }else{
                flag = true;
         }
        }
        if(flag==true){
            revert();
        }
    }

    /**
     * @param rate The current exchange rate, an 18 decimal fixed point number.
     * @param targetRate The target exchange rate, an 18 decimal fixed point number.
     * @return If the rate is within the deviation threshold from the target rate, returns true.
     *         Otherwise, returns false.
     */

    function withinDeviationThreshold(uint256 rate, uint256 targetRate)
        internal
        view
        returns (bool)
    {
        uint256 absoluteDeviationThreshold = targetRate
            .mul(deviationThreshold)
            .div(10**DECIMALS);

        return
            (rate >= targetRate &&
                rate.sub(targetRate) < absoluteDeviationThreshold) ||
            (rate < targetRate &&
                targetRate.sub(rate) < absoluteDeviationThreshold);
    }
}
