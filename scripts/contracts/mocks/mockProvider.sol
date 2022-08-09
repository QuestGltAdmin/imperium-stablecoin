pragma solidity 0.7.6;

contract mockProvider {
    
uint112 public reserve0;           // uses single storage slot, accessible via getReserves
uint112 public reserve1;           // uses single storage slot, accessible via getReserves
uint32  public blockTimestampLast;

function setReserves(uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) public view {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
}