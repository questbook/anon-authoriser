# Anonymous Authoriser

Authorise another wallet to undertake a certain action without knowing their wallet address

## Why does this exist?

1. Say Alice wants to invite Bob to her team on a dApp. 
2. She cannot invite Bob via an email invite since the dApp cannot verify that on chain
3. She's also not familiar with Bob's primary wallet address, and asking another person for their address on a specific chain is cumbersome
4. `anon-authoriser` comes in to solve this specific problem.
5. The SC allows Alice to simply generate an invite link and share this with Bob off-chain. Can be done via any instant messaging platform or an email. 
6. Bob can then use this invite link to verify his identity on chain and join Alice's team

The same principle can be extended to allow a user access to certain features or authorise them to take certain actions.

## How it works

1. Let's assume Alice wants to authorise Bob to take a certain action. In this case, Alice is the authoriser.
2. Alice Creates a public-private key pair `(Pu, Pr)` & compute address `A = Address(Pu)`.
	- Note: your ETH address is a function of your public key -- which is `A` in this case
3. She denotes the purpose of the authorisation with a flag F. This flag prevents Bob from using Alice's authorisation to undertake another action that she hasn't authorised
4. She then asks the SC to store this as a pending authorisation with the call: `generateAnonAuthorisation(A, F)`
5. SC stores Alices wallet Wa and flag F against the address A
6. SC ensures this address hasn't been used already & returns successfully
7. Alice sends Bob her wallet address, the private key and authorisation flag (Wa, Pr, F)
8. Bob signs his wallet address (`Wb`) using `Pr` `S = Sign(Wb, Pr)`
9. Bob requests the SC to verify authorisation using `anonAuthorise(Wa, F, S)`
10. Solidity signature check returns the address that signed the message. The SC uses this to verify the signature sent by Bob, the message being Bob's wallet address `A' = Verify(Wb, S)`
11. SC checks if there is a record stored against `A'`
12. Finally, SC checks that the authoriser specified (`Wa` in this case)
and the flag of purpose F specified match the existing record.
13. If everything matches, SC returns successfully and deletes the record
so it cannot be used again
14. Bob is now considered authorised. 
	- `Pr` can even be published online as it cannot be used now

## Setup & Running Tests

1. Clone the repository, and `cd` into the repository
2. Run `yarn` to install all deps
3. To run tests: `yarn test`
4. If you make changes to the contract:
	- be sure to generate the latest types using `yarn build:sol`
	- lint the typescript using `yarn lint:ts`

## Using this library

You can include this in your smart contract project and/or your JS project to invoke the contract.

Install using yarn:
```
yarn add git+https://github.com/questbook/anon-authoriser
```

We're live on the following chains:

```
celo-alfajores-testnet: 0x2215f272cE9a8d7800DcfC23eC3d5d284912E197
rinkeby: 0xF93F605142Fb1Efad7Aa58253dDffF67775b4520
celo-mainnet: 0x2d2F79aF6e50490b7C25EB93B7C8c060F4e56A2d
findora-testnet: 0x376cD6a04835Da22F99eeb9f89440697b0caDd84
harmony-mainnet: 0xF39E0AA8cA215D41dF7c9AeB3aBa76FfdAd0951F
```

You can call the contract from your smart contracts or can call them directly from your dApp. 

A good example of the former is our [grants contract](https://github.com/questbook/grants-contracts-upgradeable/blob/main/contracts/WorkspaceRegistry.sol) -- where we use this contract to enable invite links on our app. 

## Example Usage in SC

TODO

## Deploying the Contracts on your own

1. Create a `.env` file in `./contract` folder
2. Supply your private key to the `.env` file:
	```
	PRIVATE_KEY=0x12345
	```
3. Run `NETWORK={network} yarn deploy` to deploy the contract to the specific network. `{network}` can be any of the networks specified in `./chains.json` file.
4. To add another chain, submit a PR to our central [chains repository](https://github.com/questbook/chains) -- which will auto-commit the new network to this repository, allowing you to run step 3 with the newly added network