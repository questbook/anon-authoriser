import '@nomiclabs/hardhat-ethers'
import makeAnonAuthoriserClient, { generateKeyPairAndAddress } from '@questbook/anon-authoriser-js'
import { ethers } from 'hardhat'
import type { AnonAuthoriser__factory } from '../src/types'
import { expect } from 'chai'
import { randomBytes } from 'crypto'

describe("Anon Authoriser Tests", () => {
	// flow is:
	// 1. contract is deployed
	// 2. wallet A generates new key pair (and subsequently address) and requests anon authorisation
	// 3. wallet B receives private key, signs their address and attempts authorisation
	// 4. check that authorisation was successful
	it("should authenticate a user successfully", async() => {
		const apiFlag = makeApiFlag()
		let contract = await deployContract()
		const client = makeAnonAuthoriserClient(contract)
		const result =  await client.generateAnonAuthorisation(apiFlag)
		expect(result.privateKey).to.be.instanceof(Buffer)
		expect(result.privateKey).to.have.length.greaterThan(0)
		// authorise from new address
		const [, signer2] = await ethers.getSigners()

		const client2 = makeAnonAuthoriserClient(contract.connect(signer2))
		await client2.anonAuthorise(result)
	})

	it("fail to authenticate after key has been used", async() => {
		const apiFlag = makeApiFlag()
		const contract = await deployContract()
		
		const client = makeAnonAuthoriserClient(contract)
		const result = await client.generateAnonAuthorisation(apiFlag)
		await client.anonAuthorise(result)

		try {
			await client.anonAuthorise(result)
			throw new Error("should have failed")
		} catch(error: any) {
			expect(error.message).to.include('No such pending authorisation')
		}
	})

	it('should fail to authorise a signature from an invalid key', async() => {
		const apiFlag = makeApiFlag()
		const contract = await deployContract()

		const client = makeAnonAuthoriserClient(contract)
		const result = await client.generateAnonAuthorisation(apiFlag)
		// generate a new private key and sign with that
		// this should fail authentication
		result.privateKey = generateKeyPairAndAddress().privateKey

		try {
			await client.anonAuthorise(result)
			throw new Error("should have failed")
		} catch(error: any) {
			expect(error.message).to.include('No such pending authorisation')
		}
	})

	it('should fail to authorise a signature from a different authoriser', async() => {
		const apiFlag = makeApiFlag()
		const contract = await deployContract()

		const client = makeAnonAuthoriserClient(contract)
		const result = await client.generateAnonAuthorisation(apiFlag)
		// generate a new private key and sign with that
		// this should fail authentication
		result.authoriser = ethers.Wallet.createRandom().address

		try {
			await client.anonAuthorise(result)
			throw new Error("should have failed")
		} catch(error: any) {
			expect(error.message).to.include('Authoriser mismatch')
		}
	})

	it('should handle multiple authorisations concurrently', async() => {
		const contract = await deployContract()
		const client = makeAnonAuthoriserClient(contract)

		// authorise from new addresses
		const [, signer2, signer3, signer4] = await ethers.getSigners()
		await Promise.all(
			[signer2, signer3, signer4].map(async (signer) => {
				const apiFlag = makeApiFlag()
				const authResult = await client.generateAnonAuthorisation(apiFlag)
			
				const authReqClient = makeAnonAuthoriserClient(contract.connect(signer))
				await authReqClient.anonAuthorise(authResult)
			})
		)
	})

	async function deployContract() {
		const Factory = await ethers.getContractFactory('AnonAuthoriser') as AnonAuthoriser__factory
		const contract = await Factory.deploy()
		await contract.deployed()

		return contract
	}
})

const makeApiFlag = () => randomBytes(32)