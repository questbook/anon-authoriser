// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AnonAuthoriser {
    struct PendingAuthorisation { 
        /** address of the user who made the authorisation */
        address authoriser;
    }

    uint64 currentAuthorisationId = 0;
    // map the address of the auth key
    // to the user requested the anon authorisation
    mapping(address => PendingAuthorisation) pendingAuthorisations;
    // each message has this prefixed to it before being signed
    bytes constant MSG_PREFIX = "\x19Ethereum Signed Message:\n32";

    function generateAnonAuthorisation(address authKeyAddress) public {
        require(authKeyAddress != address(0), "Invalid public key address");
        pendingAuthorisations[authKeyAddress] = PendingAuthorisation(msg.sender);
    }

    /** Authorise something*/
    function anonAuthorise(uint8 v, bytes32 r, bytes32 s) public {
        bytes32 msgHash = ethMessageHash(abi.encodePacked(msg.sender));

        if(v == 0 || v == 1) {
            v = v + 27;
        }

        address signerAddr = ecrecover(msgHash, v, r, s);

        require(signerAddr != address(0), "Invalid Signature");

        PendingAuthorisation memory auth = pendingAuthorisations[signerAddr];
        require(auth.authoriser != address(0), "No such pending authorisation");
        
        delete pendingAuthorisations[signerAddr];
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