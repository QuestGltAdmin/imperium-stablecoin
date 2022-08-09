const { expect } = require("chai");
const { ethers, upgrades, waffle } = require("hardhat");
const { BigNumberish } = require('ethers')
const { BigNumber } = require('bignumber.js')

const imul = (a, b, c) => {
  return ethers.BigNumber.from(
    new BigNumber(a.toString()).times(b.toString()).idiv(c.toString()).toString(10),
  )
}

const increaseTime = async (seconds) => {
  const now = (await ethers.provider.getBlock('latest')).timestamp
  await ethers.provider.send('evm_mine', [
    ethers.BigNumber.from(seconds).add(now).toNumber(),
  ])
}
module.exports = {
  imul: imul,
  increaseTime:increaseTime
};
// module.exports= increaseTime;
