pragma solidity 0.7.6;

import "../Handler.sol";
interface IHandler{
    function rebase() external;
}


contract ConstructorRebaseCallerContract {
    constructor(address handler) public {
        // Take out a flash loan.
        // Do something funky...
        IHandler(handler).rebase(); // should fail
        // pay back flash loan.
    }
}