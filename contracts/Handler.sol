pragma solidity 0.7.6;

import "./_external/Ownable.sol";

import "./RUSDFractionPolicy.sol";

interface IRouter {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function getAmountsOut(uint256 amountIn, address[] memory path)
        external
        view
        returns (uint256[] memory amounts);

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IReflecto {
    function approve(address spender, uint256 value) external returns (bool);
}

/**
 * @title Handler
 * @notice The handler is the main entry point for rebase operations. It coordinates the policy
 * actions with external consumers.
 */
contract Handler is Ownable {
    RUSDFractionPolicy public policy;
    IRouter public router;
    IRUSDFraction public rusd;
    address public wbnb;
    address public reflecto;
    address public reflectoPool;
    address[] public bnbPath;
    address[] public reflectoPath;

    event Swap(uint256, uint256, address[], address, uint256);

    event Received(address, uint256);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    constructor(
        address _policy,
        address _router,
        address _rusd,
        address _wbnb,
        address _reflecto,
        address _reflectoPool
    ) {
        Ownable.initialize(msg.sender);
        policy = RUSDFractionPolicy(_policy);
        router = IRouter(_router);
        rusd = IRUSDFraction(_rusd);
        wbnb = _wbnb;
        reflecto = _reflecto;
        reflectoPool = _reflectoPool;
        // One time array Intializing
        reflectoPath.push(_wbnb);
        reflectoPath.push(_reflecto);
        bnbPath.push(_rusd);
        bnbPath.push(_wbnb);
    }

    /**
     * @notice Main entry point to initiate a rebase operation.
     *         The Handler calls rebase on the policy and notifies downstream applications.
     *         Contracts are guarded from calling, to avoid flash loan attacks on liquidity
     *         providers.
     *         If a transaction in the transaction list fails, Handler will stop execution
     *         and revert to prevent a gas underprice attack.
     */
    function rebase() external onlyOwner {
        require(msg.sender == tx.origin); // solhint-disable-line avoid-tx-origin
        policy.rebase();
        IProviderPair _ratePair = policy.ratePair();
        _ratePair.sync();
    }

    function collectRUSD(address _wallet) external onlyOwner {
        require(rusd.balanceOf(address(this)) > 0, "Not enough RUSD to withdraw");
        rusd.transfer(_wallet, rusd.balanceOf(address(this)));
    }

    function stabilize() external onlyOwner {
        require(msg.sender == tx.origin); // solhint-disable-line avoid-tx-origin

        if (rusd.balanceOf(address(this)) > 0) {
            _convertRUSDtoBNB();
        }
        policy.stabilize();
    }

    function gatherFunds() external {
        if (rusd.balanceOf(address(this)) > 0) {
            _convertRUSDtoBNB();
        }
        IProviderPair _ratePair = policy.ratePair();
        _ratePair.sync();
    }

    function stabilizeOnly() external {
        require(msg.sender == tx.origin); // solhint-disable-line avoid-tx-origin

        policy.stabilize();
    }


    function setRouter(IRouter _router) external onlyOwner {
        router = _router;
    }

    function setRUSDAddress(IRUSDFraction _rusd) external onlyOwner {
        rusd = _rusd;
    }

    function setWBNBAddress(address _wbnb) external onlyOwner {
        wbnb = _wbnb;
    }

    function setReflectoAddress(address _reflecto) external onlyOwner {
        reflecto = _reflecto;
    }

    function setReflectoPoolAddress(address _reflectoPool) external onlyOwner {
        reflectoPool = _reflectoPool;
    }

    function setPolicyAddress(address _policy) external onlyOwner {
        policy = RUSDFractionPolicy(_policy);
    }

    function _getAmountOutBNB(uint256 _amountIn, address[] memory _path)
        public
        view
        returns (uint256)
    {
        _amountIn = (address(this).balance);
        uint256 amountInmin = (_amountIn * 95) / 100;
        // _amountIn = (_amountIn*95)/100;
        uint256[] memory amountOut = router.getAmountsOut(amountInmin, _path);
        return amountOut[1];
    }

    function _getAmountOut(uint256 _amountIn, address[] memory _path)
        public
        view
        returns (uint256)
    {
        _amountIn = (_amountIn * 95) / 100;
        uint256[] memory amountOut = router.getAmountsOut(_amountIn, _path);
        return amountOut[1];
    }

    function _getAmountIn() public view returns (uint256) {
        uint256 _amountIn = (rusd.balanceOf(address(this)));
        return _amountIn;
    }

    function _getAmountInBNB() public view returns (uint256) {
        uint256 _amountIn = (address(this).balance);
        return _amountIn;
    }

    function _convertRUSDtoBNB() internal {
        uint256 amountIn = _getAmountIn();
        uint256 deadline = block.timestamp + 1000;
        address to = address(this);
        rusd.approve(address(router), amountIn);
        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountIn,
            0,
            bnbPath,
            to,
            deadline
        );
        payable(address(reflecto)).transfer((address(this).balance) / 2);
        if (_getAmountInBNB() > 0) {
            _convertBNBtoReflecto(_getAmountInBNB());
        }
    }

    function _convertBNBtoReflecto(uint256 amountIn) public payable {
        uint256 deadline = block.timestamp + 1000;
        address to = reflectoPool;
        router.swapExactETHForTokensSupportingFeeOnTransferTokens{
            value: amountIn
        }(0, reflectoPath, to, deadline);
    }
}
