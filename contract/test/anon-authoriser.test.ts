import '@nomiclabs/hardhat-ethers'
import * as curve from 'secp256k1'
import { randomBytes } from 'crypto'
import { ethers } from 'hardhat'
import type { AnonAuthoriser, AnonAuthoriser__factory } from '../src/types'
import { keccak256 } from 'ethers/lib/utils'
import { expect } from 'chai'

describe("Anon Authoriser Tests", () => {
	// flow is:
	// 1. contract is deployed
	// 2. wallet A generates new key pair (and subsequently address) and requests anon authorisation
	// 3. wallet B receives private key, signs their address and attempts authorisation
	// 4. check that authorisation was successful
	it("should authenticate a user successfully", async() => {
		let contract = await deployContract()
		const { privateKey, authId } = await generateAnonAuthorisation(contract)

		// authorise from new address
		const [, signer2] = await ethers.getSigners()
		const senderAddress = await signer2.getAddress()

		const inp = generateInputForAuthorisation(senderAddress, privateKey)
		contract = contract.connect(signer2)
		await contract.anonAuthorise(authId, inp.v, inp.r, inp.s)
	});

	it("fail to authenticate after key has been used", async() => {
		const contract = await deployContract()
		const { privateKey, authId } = await generateAnonAuthorisation(contract)
		const senderAddress = await contract.signer.getAddress()

		const inp = generateInputForAuthorisation(senderAddress, privateKey)
		await contract.anonAuthorise(authId, inp.v, inp.r, inp.s)

		try {
			await contract.anonAuthorise(authId, inp.v, inp.r, inp.s)
			throw new Error("should have failed")
		} catch(error: any) {
			expect(error.message).to.include('No such pending authorisation')
		}
	})

	async function deployContract() {
		const Factory = await ethers.getContractFactory('AnonAuthoriser') as AnonAuthoriser__factory
		const contract = await Factory.deploy()
		await contract.deployed()

		return contract
	}

	async function generateAnonAuthorisation(contract: AnonAuthoriser) {
		const { privateKey, address } = generateKeyPairAndAddress()
		const interaction1 = await contract.generateAnonAuthorisation(address)
		await interaction1.wait()

		return { privateKey, authId: 1 } // TODO: fetch authId
	}
})

function prefixedHexToBuffer(address: string) {
	return Buffer.from(address.slice(2), 'hex')
}

function generatePrefixedMsg(msg: string | Buffer) {
	return keccak256(
		Buffer.concat([
			Buffer.from(`\x19Ethereum Signed Message:\n32`),
			prefixedHexToBuffer(keccak256(Buffer.from(msg)))
		])
	)
}

function generateKeyPairAndAddress() {
	const privateKey = randomBytes(32)
	const publicKey = curve.publicKeyCreate(privateKey)
	const address = ethers.utils.computeAddress(publicKey)

	return { privateKey, publicKey, address }
}

function generateInputForAuthorisation(senderAddress: string, privateKey: Buffer) {
	const msg = generatePrefixedMsg(prefixedHexToBuffer(senderAddress))
	const msgBuffer = prefixedHexToBuffer(msg)
	const { signature, recid } = curve.ecdsaSign(msgBuffer, privateKey)

	return {
		v: recid,
		r: signature.slice(0, 32),
		s: signature.slice(32),
	}
}