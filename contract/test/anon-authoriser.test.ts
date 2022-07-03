import '@nomiclabs/hardhat-ethers'
import makeAnonAuthoriserClient, { generateKeyPairAndAddress } from '@questbook/anon-authoriser-js'
import { ethers } from 'hardhat'
import type { AnonAuthoriser__factory } from '../src/types'
import { expect } from 'chai'

describe("Anon Authoriser Tests", () => {
	// flow is:
	// 1. contract is deployed
	// 2. wallet A generates new key pair (and subsequently address) and requests anon authorisation
	// 3. wallet B receives private key, signs their address and attempts authorisation
	// 4. check that authorisation was successful
	it("should authenticate a user successfully", async() => {
		let contract = await deployContract()
		const client = makeAnonAuthoriserClient(contract)
		const result =  await client.generateAnonAuthorisation()
		expect(result.authId).to.be.greaterThan(0)
		expect(result.privateKey).to.be.instanceof(Buffer)
		// authorise from new address
		const [, signer2] = await ethers.getSigners()

		const client2 = makeAnonAuthoriserClient(contract.connect(signer2))
		await client2.anonAuthorise(result)
	})

	it("fail to authenticate after key has been used", async() => {
		const contract = await deployContract()
		
		const client = makeAnonAuthoriserClient(contract)
		const result = await client.generateAnonAuthorisation()
		await client.anonAuthorise(result)

		try {
			await client.anonAuthorise(result)
			throw new Error("should have failed")
		} catch(error: any) {
			expect(error.message).to.include('No such pending authorisation')
		}
	})

	it('should fail to authorise a signature from an invalid key', async() => {
		const contract = await deployContract()

		const client = makeAnonAuthoriserClient(contract)
		const result = await client.generateAnonAuthorisation()
		// generate a new private key and sign with that
		// this should fail authentication
		result.privateKey = generateKeyPairAndAddress().privateKey

		try {
			await client.anonAuthorise(result)
			throw new Error("should have failed")
		} catch(error: any) {
			expect(error.message).to.include('Signature mismatch')
		}
	})

	it('should handle multiple authorisations concurrently', async() => {
		const contract = await deployContract()
		const client = makeAnonAuthoriserClient(contract)

		// authorise from new addresses
		const [, signer2, signer3, signer4] = await ethers.getSigners()
		for(const signer of [signer2, signer3, signer4]) {
			const authResult = await client.generateAnonAuthorisation()
			
			const authReqClient = makeAnonAuthoriserClient(contract.connect(signer))
			await authReqClient.anonAuthorise(authResult)
		}
	})

	async function deployContract() {
		const Factory = await ethers.getContractFactory('AnonAuthoriser') as AnonAuthoriser__factory
		const contract = await Factory.deploy()
		await contract.deployed()

		return contract
	}
})