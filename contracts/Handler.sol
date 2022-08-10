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
    IRUSDFraction public ico;
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
        address _wbnb
    ) {
        Ownable.initialize(msg.sender);
        policy = ICOFractionPolicy(_policy);
        router = IRouter(_router);
        ico = IICOFraction(_ico);
        wbnb = _wbnb;
        // One time array Intializing
        reflectoPath.push(_wbnb);
        bnbPath.push(_ico);
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

    function collectICO(address _wallet) external onlyOwner {
        require(ico.balanceOf(address(this)) > 0, "Not enough ICO to withdraw");
        ico.transfer(_wallet, ico.balanceOf(address(this)));
    }

    function stabilize() external onlyOwner {
        require(msg.sender == tx.origin); // solhint-disable-line avoid-tx-origin

        if (ico.balanceOf(address(this)) > 0) {
            _convertICOtoBNB();
        }
        policy.stabilize();
    }

    function gatherFunds() external {
        if (ico.balanceOf(address(this)) > 0) {
            _convertICOtoBNB();
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

    function setICOAddress(IICOFraction _ico) external onlyOwner {
        ico = _ico;
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
        policy = ICOFractionPolicy(_policy);
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
        uint256 _amountIn = (ico.balanceOf(address(this)));
        return _amountIn;
    }

    function _getAmountInBNB() public view returns (uint256) {
        uint256 _amountIn = (address(this).balance);
        return _amountIn;
    }

    function _convertICOtoBNB() internal {
        uint256 amountIn = _getAmountIn();
        uint256 deadline = block.timestamp + 1000;
        address to = address(this);
        ico.approve(address(router), amountIn);
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
