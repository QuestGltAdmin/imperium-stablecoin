const { ecsign } = require('ethereumjs-util');

const { utils } = require('ethers');

const PERMIT_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes(
    'Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)'
  )
);

// MUST REMOVE 0x FROM BEGINGING OF PRIVATE KEY
const ownerPrivateKey = Buffer.from(
  'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  'hex'
);

const sign = (digest, privateKey) => {
  return ecsign(Buffer.from(digest.slice(2), 'hex'), privateKey);
};

// Gets the EIP712 domain separator
function getDomainSeparator(
  name,
  contractAddress,
  chainId
) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        utils.keccak256(
          utils.toUtf8Bytes(
            'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
          )
        ),
        utils.keccak256(utils.toUtf8Bytes(name)),
        utils.keccak256(utils.toUtf8Bytes('1')),
        chainId,
        contractAddress,
      ]
    )
  );
}

// Returns the EIP712 hash which should be signed by the user
// in order to make a call to `permit`
function getPermitDigest(
  name,
  address,
  chainId,
  approve,
  nonce,
  deadline
) {
  const DOMAIN_SEPARATOR = getDomainSeparator(name, address, chainId);
  return utils.keccak256(
    utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        utils.keccak256(
          utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'bool'],
            [
              PERMIT_TYPEHASH,
              approve.owner,
              approve.spender,
              nonce,
              deadline,
              true,
            ]
          )
        ),
      ]
    )
  );
}

module.exports = {
  PERMIT_TYPEHASH: PERMIT_TYPEHASH,
  ownerPrivateKey: ownerPrivateKey,
  sign: sign,
  getDomainSeparator: getDomainSeparator,
  getPermitDigest: getPermitDigest
};