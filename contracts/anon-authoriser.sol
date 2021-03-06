// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/** Smart contract to enable anonymous authorisation */
contract AnonAuthoriser {
    struct PendingAuthorisation { 
        /** address of the user who made the authorisation */
        address authoriser;
        /** 
         * what this authorisation is for. 
         * specifying this can prevent a malicious user from misusing an authorisation.
         * your application should define what each API flag is for
         *
         * ideally, you should have a unique flag for each authorisation purpose
        */
        bytes32 apiFlag;
    }

    // map the address of the auth key pair
    // to the user requested the anon authorisation
    // note -- the address of a key pair is a derivation of the public key
    mapping(address => PendingAuthorisation) pendingAuthorisations;
    // each message has this prefixed to it before being signed
    bytes constant MSG_PREFIX = "\x19Ethereum Signed Message:\n32";

    // store the map 
    function generateAnonAuthorisation(address authKeyAddress, bytes32 apiFlag) public {
        require(authKeyAddress != address(0), "Invalid public key address");
        require(apiFlag > 0, "API flag must be non-zero");
        require(pendingAuthorisations[authKeyAddress].apiFlag == bytes32(0), "Authorisation already exists");

        pendingAuthorisations[authKeyAddress] = PendingAuthorisation(msg.sender, apiFlag);
    }

    /** 
     * Authorise something 
     * @param authoriser wallet address of the user that created the pending auth
     * @param apiFlag the api flag that was used to create the pending auth, denotes the purpose of the auth
     * @param authorisee the wallet address of the user that is being authorised, can be separate from `msg.sender`
     * the authorisee param exists to enable users to delegate authorisation to another wallet or SC
     */
    function anonAuthorise(address authoriser, bytes32 apiFlag, address authorisee, uint8 v, bytes32 r, bytes32 s) public {
        // generated the prefixed message to be signed
        // the authorisation request should have signed their own wallet address
        bytes32 msgHash = ethMessageHash(abi.encodePacked(authorisee, msg.sender));
        // version in some EC libs can be 0 or 1
        if(v == 0 || v == 1) {
            v = v + 27;
        }
        // the ECRECOVER function would return the address of the key pair
        // that was used to sign the message
        address signerAddr = ecrecover(msgHash, v, r, s);
        // if the address was zero -- the signature itself was badly formatted or invalid
        require(signerAddr != address(0), "Invalid Signature");
        // if this address was used to generate 
        PendingAuthorisation memory auth = pendingAuthorisations[signerAddr];
        require(auth.apiFlag > 0, "No such pending authorisation");
        require(auth.authoriser == authoriser, "Authoriser mismatch");
        require(auth.apiFlag == apiFlag, "API flag mismatch");
        
        delete pendingAuthorisations[signerAddr];
    }

    /**
    * @dev prefix a bytes32 value with "\x19Ethereum Signed Message:" and hash the result
    * this is consistent with how ETH signatures are generated
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