// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WFLOW - Wrapped FLOW Token
 * @dev Simple ERC20 token representing FLOW for testing purposes on Flow EVM
 * In production, this would be a proper wrapped token with deposit/withdraw mechanics
 * For now, it's just a mintable ERC20 for testing the staking contract
 */
contract WFLOW is ERC20 {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }
    
    constructor() ERC20("Wrapped FLOW", "WFLOW") {
        owner = msg.sender;
        // Mint initial supply for testing (1 million WFLOW)
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    /**
     * @dev Mint tokens for testing purposes
     * In production, this would be replaced with deposit/withdraw mechanics
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Faucet function to give users test tokens
     * Anyone can call this to get 1000 WFLOW for testing
     */
    function faucet() external {
        require(balanceOf(msg.sender) < 10000 * 10**18, "Already have enough tokens");
        _mint(msg.sender, 1000 * 10**18);
    }
}