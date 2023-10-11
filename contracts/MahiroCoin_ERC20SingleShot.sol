// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract MahiroCoinSingleShot is ERC20, ERC20Permit, ERC2771Context {
    constructor(address trustedForwarder)
        ERC20("MahiroCoin_SS", "MHRCSS")
        ERC20Permit("MahiroCoin_SS")
        ERC2771Context(trustedForwarder)
    {
        _mint(_msgSender(), 1000000 * 10 ** decimals());
    }

    function _msgSender() internal view virtual override(ERC2771Context,Context) returns (address sender) {
        return ERC2771Context._msgSender();
    }
    function _msgData() internal view virtual override(ERC2771Context,Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function singleShot(address _owner, address _spender, address _recipient, uint amount, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        permit(_owner, _spender, amount, deadline, v, r, s);
        require(allowance(_owner, _spender) > 0, "not allowance");
        transferFrom(_owner, _recipient, amount);
    }

}