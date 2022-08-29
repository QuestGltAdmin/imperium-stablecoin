pragma solidity ^0.8.0;

import "./yields-utils-v2/token/ERC20Permit.sol";
import "./yields-utils-v2/access/AccessControl.sol";

contract BUSD is ERC20Permit, AccessControl {
    address owner;
    constructor() ERC20Permit("Binance USD", "BUSD", 18) {
        owner= msg.sender;
        _mint(msg.sender, 2000000 * 10**18);
    }

   // function mint(address dst, uint256 wad) external auth returns (bool) {
    //     return _mint(dst, wad);
    // }
       function issue (uint amount) public {
        require(msg.sender==owner);
        require(_totalSupply + amount > _totalSupply);
        require(_balanceOf[owner] + amount > _balanceOf[owner]);

        _balanceOf[owner] += amount;
        _totalSupply += amount;
        issue(amount);
    }
  
    // function burn(address dst, uint256 wad) external auth returns (bool) {
    //     return _burn(dst, wad);
    // }
       function redeem(uint amount) public {
           require(msg.sender==owner);
        require(_totalSupply >= amount);
        require(_balanceOf[owner] >= amount);

        _totalSupply -= amount;
        _balanceOf[owner] -= amount;
        redeem(amount);
    }

    // Called when new token are issued
    event Issue(uint amount);

    // Called when tokens are redeemed
    event Redeem(uint amount);
}
