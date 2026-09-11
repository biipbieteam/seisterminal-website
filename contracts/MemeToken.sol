// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MemeToken is ERC20 {
    address public immutable creator;
    address public immutable factory;

    error InvalidCreator();
    error InvalidSupply();

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address creator_
    ) ERC20(name_, symbol_) {
        if (creator_ == address(0)) {
            revert InvalidCreator();
        }

        if (totalSupply_ == 0) {
            revert InvalidSupply();
        }

        creator = creator_;
        factory = msg.sender;

        _mint(
            msg.sender,
            totalSupply_
        );
    }
}