// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IdentityRegistry
 * @dev Simple on-chain identity registry mapping Ethereum addresses to DIDs
 */
contract IdentityRegistry {
    // Mapping from address to DID string
    mapping(address => string) private identities;
    
    // Mapping to check if an address has registered
    mapping(address => bool) private registered;
    
    // Event emitted when an identity is registered
    event IdentityRegistered(address indexed addr, string did);
    
    /**
     * @dev Register a DID for the caller's address
     * @param did The DID string to associate with the caller
     */
    function registerIdentity(string memory did) external {
        require(bytes(did).length > 0, "DID cannot be empty");
        
        identities[msg.sender] = did;
        registered[msg.sender] = true;
        
        emit IdentityRegistered(msg.sender, did);
    }
    
    /**
     * @dev Get the DID associated with an address
     * @param addr The address to query
     * @return The DID string, or empty string if not registered
     */
    function getIdentity(address addr) external view returns (string memory) {
        return identities[addr];
    }
    
    /**
     * @dev Check if an address has registered an identity
     * @param addr The address to check
     * @return True if registered, false otherwise
     */
    function isRegistered(address addr) external view returns (bool) {
        return registered[addr];
    }
}
