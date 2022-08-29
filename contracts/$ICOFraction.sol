// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./$ICO-additional/CastU256U128.sol";
import "./$ICO-additional/CastU256U32.sol";
import "./$ICO-additional/SafeMathInt.sol";
import "./$ICO-additional/SafeMath.sol";
import "./$ICO-additional/Initializable.sol";
import "./$ICO-additional/IERC20.sol";
import "./$ICO-additional/Ownable.sol";
import "./$ICO-additional/ERC20Detailed.sol";

contract $ICOFraction is ERC20Detailed, Ownable {
    using SafeMath for uint256;
    using SafeMathInt for int256;
    using CastU256U32 for uint256;
    using CastU256U128 for uint256;

    event LogRebase(uint256 indexed epoch, uint256 totalSupply);
    event LogMonetaryPolicyUpdated(address monetaryPolicy);
    
    modifier validRecipient(address to) {
        require(to != address(0x0));
        require(to != address(this));
        _;
    }

    uint256 private constant DECIMALS = 9;
    uint256 private constant MAX_UINT256 = type(uint256).max;
    uint256 private constant INITIAL_FRACTIONS_SUPPLY =
        50 * 10**6 * 10**DECIMALS; // 50 million

    // TOTAL_FRAC is a multiple of INITIAL_FRACTIONS_SUPPLY so that _fracsPer$ICO is an integer.
    // Use the highest value that fits in a uint256 for max granularity.
    uint256 private constant TOTAL_FRAC =
        MAX_UINT256 - (MAX_UINT256 % INITIAL_FRACTIONS_SUPPLY);

    // MAX_SUPPLY = maximum integer < (sqrt(4*TOTAL_FRAC + 1) - 1) / 2
    uint256 private constant MAX_SUPPLY = type(uint128).max; // (2^128) - 1

    address public monetaryPolicy;
    uint256 private _totalSupply;
    uint256 private _fracsPer$ICO;
    mapping(address => uint256) public nonces;

    bytes32 public constant PERMIT_TYPEHASH_META =
        0xea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb;

    mapping(address => uint256) private _fracBalances;

    // This is denominated in fractions, because the fracs-fractions conversion might change before
    // it's fully paid.
    mapping(address => mapping(address => uint256)) private _allowedFractions;

    // EIP-2612: permit – 712-signed approvals
    // https://eips.ethereum.org/EIPS/eip-2612
    string public constant EIP712_REVISION = "1";
    bytes32 public constant EIP712_DOMAIN =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    /* SETTER FUNCTIONS */
    function setMonetaryPolicy(address monetaryPolicy_) external onlyOwner {
        monetaryPolicy = monetaryPolicy_;
        emit LogMonetaryPolicyUpdated(monetaryPolicy_);
    }

    modifier onlyMonetaryPolicy() {
        require(msg.sender == monetaryPolicy);
        _;
    }

    function rebase(uint256 epoch, int256 supplyDelta)
        external
        onlyMonetaryPolicy
        returns (uint256)
    {
        if (supplyDelta == 0) {
            emit LogRebase(epoch, _totalSupply);
            return _totalSupply;
        }

        if (supplyDelta < 0) {
            // reduce the supply
            _totalSupply = _totalSupply.sub(uint256(supplyDelta.abs()));
        } else {
            // add to the supply
            _totalSupply = _totalSupply.add(uint256(supplyDelta));
        }

        if (_totalSupply > MAX_SUPPLY) {
            _totalSupply = MAX_SUPPLY;
        }

        _fracsPer$ICO = TOTAL_FRAC.div(_totalSupply);
        // The applied supplyDelta can deviate from the requested supplyDelta,
        // but this deviation is guaranteed to be < (_totalSupply^2)/(TOTAL_FRAC - _totalSupply).
        //
        // In the case of _totalSupply <= MAX_UINT128 (our current supply cap), this
        // deviation is guaranteed to be < 1, so we can omit this step. If the supply cap is
        // ever increased, it must be re-included.
        // _totalSupply = TOTAL_FRAC.div(_fracsPer$ICO)
        emit LogRebase(epoch, _totalSupply);
        return _totalSupply;
    }

    function initialize(address owner_)
        public
        initializer
        override
    {
        ERC20Detailed.initialize("IMPERIUM STABLE", "$ICO", uint8(DECIMALS));
        Ownable.initialize(owner_);


        _totalSupply = INITIAL_FRACTIONS_SUPPLY; // 50m
        _fracBalances[owner_] = TOTAL_FRAC; // 50m
        _fracsPer$ICO = TOTAL_FRAC.div(_totalSupply); // how many fracs make up 1 Fraction
        emit Transfer(address(0x0), owner_, _totalSupply);
    }

    /**
     * @return The total number of Fractions.
     */
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @param who The address to query.
     * @return The balance of the specified address.
     */
    function balanceOf(address who) external view override returns (uint256) {
        return _fracBalances[who].div(_fracsPer$ICO);
    }

    /**
     * @param who The address to query.
     * @return The fracs balance of the specified address.
     */
    function scaledBalanceOf(address who) external view returns (uint256) {
        return _fracBalances[who];
    }

    /**
     * @return the total number of fracs.
     */
    function scaledTotalSupply() external pure returns (uint256) {
        return TOTAL_FRAC;
    }

    function getChainID() external view returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }

    /**
     * @return The computed DOMAIN_SEPARATOR to be used off-chain services
     *         which implement EIP-712.
     *         https://eips.ethereum.org/EIPS/eip-2612
     **/
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN,
                    keccak256(bytes(name())),
                    keccak256(bytes(EIP712_REVISION)),
                    chainId,
                    address(this)
                )
            );
    }

    function mint(address _to, uint256 _value) external onlyMonetaryPolicy {
        uint256 fracValue = _value.mul(_fracsPer$ICO);
        _fracBalances[_to] = _fracBalances[_to].add(fracValue);
        _totalSupply = _totalSupply.add(_value);
    }

    function burn(address _to, uint256 _value) external onlyMonetaryPolicy {
        uint256 fracValue = _value.mul(_fracsPer$ICO);
        require(
            _fracBalances[_to] >= fracValue,
            "Value must be less then balance"
        );
        _fracBalances[_to] = _fracBalances[_to].sub(fracValue);
        _totalSupply = _totalSupply.sub(_value);
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _value
    ) internal virtual {
        uint256 fracValue = _value.mul(_fracsPer$ICO);

        _fracBalances[_from] = _fracBalances[_from].sub(fracValue);
        _fracBalances[_to] = _fracBalances[_to].add(fracValue);

        emit Transfer(_from, _to, _value);
    }

    /**
     * @dev Transfer tokens to a specified address.
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     * @return True on success, false otherwise.
     */
    function transfer(address to, uint256 value)
        external
        override
        validRecipient(to)
        returns (bool)
    {
        _transfer(msg.sender, to, value);
        return true;
    }


    /**
     * @dev Function to check the amount of tokens that an owner has allowed to a spender.
     * @param owner_ The address which owns the funds.
     * @param spender The address which will spend the funds.
     * @return The number of tokens still available for the spender.
     */
    function allowance(address owner_, address spender)
        external
        view
        override
        returns (uint256)
    {
        return _allowedFractions[owner_][spender];
    }

    /**x
     * @dev Transfer tokens from one address to another.
     * @param from The address you want to send tokens from.
     * @param to The address you want to transfer to.
     * @param value The amount of tokens to be transferred.
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external override validRecipient(to) returns (bool) {
        _transfer(from, to, value);
        _allowedFractions[from][msg.sender] = _allowedFractions[from][
            msg.sender
        ].sub(value);
        return true;
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of
     * msg.sender. This method is included for ERC20 compatibility.
     * increaseAllowance and decreaseAllowance should be used instead.
     * Changing an allowance with this method brings the risk that someone may transfer both
     * the old and the new allowance - if they are both greater than zero - if a transfer
     * transaction is mined before the later approve() call is mined.
     *
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     */
    function approve(address spender, uint256 value)
        external
        override
        returns (bool)
    {
        _allowedFractions[msg.sender][spender] = value;

        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev Increase the amount of tokens that an owner has allowed to a spender.
     * This method should be used instead of approve() to avoid the double approval vulnerability
     * described above.
     * @param spender The address which will spend the funds.
     * @param addedValue The amount of tokens to increase the allowance by.
     */
    function increaseAllowance(address spender, uint256 addedValue)
        public
        returns (bool)
    {
        _allowedFractions[msg.sender][spender] = _allowedFractions[msg.sender][
            spender
        ].add(addedValue);

        emit Approval(
            msg.sender,
            spender,
            _allowedFractions[msg.sender][spender]
        );
        return true;
    }

    /**
     * @dev Decrease the amount of tokens that an owner has allowed to a spender.
     *
     * @param spender The address which will spend the funds.
     * @param subtractedValue The amount of tokens to decrease the allowance by.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue)
        external
        returns (bool)
    {
        uint256 oldValue = _allowedFractions[msg.sender][spender];
        _allowedFractions[msg.sender][spender] = (subtractedValue >= oldValue)
            ? 0
            : oldValue.sub(subtractedValue);

        emit Approval(
            msg.sender,
            spender,
            _allowedFractions[msg.sender][spender]
        );
        return true;
    }

    // --- Approve by signature ---
    function permit(
        address holder,
        address spender,
        uint256 nonce,
        uint256 expiry,
        bool allowed,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH_META,
                        holder,
                        spender,
                        nonce,
                        expiry,
                        allowed
                    )
                )
            )
        );

        require(holder != address(0), "Imperium/invalid-address-0");
        require(
            holder == ecrecover(digest, v, r, s),
            "Imperium/invalid-permit"
        );
        require(
            expiry == 0 || block.timestamp <= expiry,
            "Imperium/permit-expired"
        );
        require(nonce == nonces[holder]++, "Imperium/invalid-nonce");
        uint256 wad = allowed ? _totalSupply : 0;

        _allowedFractions[holder][spender] = wad;
        emit Approval(holder, spender, wad);
    }
}
