// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract MahiroCoinPermit is ERC20, ERC20Permit, ERC2771Context {
    constructor(address trustedForwarder)
        ERC20("MahiroCoin_P", "MHRCP")
        ERC20Permit("MahiroCoin_P")
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


}