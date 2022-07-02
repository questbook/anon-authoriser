// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AnonAuthoriser {
    struct PendingAuthorisation { 
        /** address of the user who made the authorisation */
        address authoriser;
        /** address of the public key used to sign the data */
        address authKeyAddress;
    }

    uint64 currentAuthorisationId = 0;
    mapping(uint64 => PendingAuthorisation) pendingAuthorisations;
    // each message has this prefixed to it before being signed
    bytes constant MSG_PREFIX = "\x19Ethereum Signed Message:\n32";

    function generateAnonAuthorisation(address authKeyAddress) public returns (uint64) {
        currentAuthorisationId += 1;
        pendingAuthorisations[currentAuthorisationId] = PendingAuthorisation(msg.sender, authKeyAddress);
        return currentAuthorisationId;
    }

    /** Authorise something*/
    function anonAuthorise(uint64 authId, uint8 v, bytes32 r, bytes32 s) public {
        PendingAuthorisation memory auth = pendingAuthorisations[authId];
        require(auth.authKeyAddress != address(0), "No such pending authorisation");
        
        bytes32 msgHash = ethMessageHash(abi.encodePacked(msg.sender));

        if(v == 0 || v == 1) {
            v = v + 27;
        }

        address signerAddr = ecrecover(msgHash, v, r, s);

        require(signerAddr != address(0), "Invalid Signature");
        require(signerAddr == auth.authKeyAddress, "Signature mismatch");

        delete pendingAuthorisations[authId];
    }

    /**
    * @dev prefix a bytes32 value with "\x19Ethereum Signed Message:" and hash the result
    */
    function ethMessageHash(bytes memory message) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                MSG_PREFIX,
                keccak256(abi.encodePacked(message))
            )
        );
    }
}