pragma solidity 0.7.6;

import "./_external/Ownable.sol";

import "./$ICOFractionPolicy.sol";

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

/**
 * @title Handler
 * @notice The handler is the main entry point for rebase operations. It coordinates the policy
 * actions with external consumers.
 */
contract Handler is Ownable {
    $ICOFractionPolicy public policy;
    I$ICOFraction public $ico;

    event Received(address, uint256);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    constructor(
        address _policy,
        address _$ico
    ) {
        Ownable.initialize(msg.sender);
        policy = $ICOFractionPolicy(_policy);
        $ico = I$ICOFraction(_$ico);
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

    function stabilize() external {
        require(msg.sender == tx.origin); // solhint-disable-line avoid-tx-origin

        policy.stabilize();
    }

    function set$ICOAddress(I$ICOFraction _$ico) external onlyOwner {
        $ico = _$ico;
    }
}
