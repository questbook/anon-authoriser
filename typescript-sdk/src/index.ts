import { computeAddress } from '@ethersproject/transactions'
import { ec as EC } from 'elliptic'
import type { BytesLike } from 'ethers'
import { keccak256 } from 'js-sha3'
import CONTRACT_ADDRESS_MAP from './contract-address-map.json'
import type { AnonAuthoriser } from './types'

type MinAnonAuthoriser = Pick<AnonAuthoriser, 'anonAuthorise' | 'generateAnonAuthorisation' | 'signer'>

type APIFlag = BytesLike

export type Chain = keyof typeof CONTRACT_ADDRESS_MAP

export type AnonAuthorisationData = {
	/** private key that will be used to sign the authorisation request */
	privateKey: Buffer
	/** API flag to determine what the authorisation can be used for */
	apiFlag: APIFlag
	/** address of the user who wants to authorise another user */
	authoriser: string
}

const makeAnonAuthoriserClient = (contract: MinAnonAuthoriser) => {

	return {
		async generateAnonAuthorisation(apiFlag: APIFlag): Promise<AnonAuthorisationData> {
			const { privateKey, address } = generateKeyPairAndAddress()
			const interaction1 = await contract.generateAnonAuthorisation(address, apiFlag)
			await interaction1.wait()

			return {
				privateKey,
				authoriser: await contract.signer.getAddress(),
				apiFlag
			}
		},
		async anonAuthorise({ privateKey, authoriser, apiFlag }: AnonAuthorisationData) {
			const senderAddress = await contract.signer.getAddress()
			const inp = generateInputForAuthorisation(senderAddress, privateKey)
			await contract.anonAuthorise(authoriser, apiFlag, inp.v, inp.r, inp.s)
		}
	}
}

const ec = new EC('secp256k1')

/**
 * Prepares a message to be signed by an EC private key
 * Mimics behaviour of an ETH signature
 *
 * @param msg
 * @returns
 */
export function generatePrefixedMessage(msg: string | Buffer) {
	return Buffer.from(
		keccak256(
			Buffer.concat([
				Buffer.from('\x19Ethereum Signed Message:\n32'),
				Buffer.from(keccak256(Buffer.from(msg)), 'hex')
			])
		),
		'hex'
	)
}

/**
 * Generates an EC keypair & its ethereum address.
 * Use address to do anon authorisation
 * */
export function generateKeyPairAndAddress() {
	const keyPair = ec.genKeyPair()
	const privateKey = keyPair.getPrivate().toBuffer()
	const publicKey = keyPair.getPublic('array')
	const address = computeAddress(publicKey)

	return { privateKey, publicKey, address }
}

/**
 * Sign the sender using the given EC private key.
 * The sender can then use this to authorise a pending anon authorisation.
 *
 * @param senderAddress
 * @param privateKey
 * @returns
 */
export function generateInputForAuthorisation(senderAddress: string, privateKey: Buffer | number[] | Uint8Array) {
	const msgBuffer = generatePrefixedMessage(prefixedHexToBuffer(senderAddress))
	const sig = ec.sign(msgBuffer, Buffer.from(privateKey))

	return {
		v: sig.recoveryParam!,
		r: sig.r.toBuffer(),
		s: sig.s.toBuffer()
	}
}

/** Get all chains that anon-authoriser is deployed on */
export function getAllDeployedChains() {
	return Object.keys(CONTRACT_ADDRESS_MAP) as Chain[]
}

/**
 * Get the address of anon-authoriser contract for the given chain
 * @param chainName name of the chain, eg. 'rinkeby'
 * @returns
 */
export function getAnonAuthoriserAddress(chainName: Chain) {
	const address = CONTRACT_ADDRESS_MAP[chainName]?.address
	if(!address) {
		throw new Error(`anon-authoriser not available on "${chainName}"`)
	}

	return address
}

function prefixedHexToBuffer(address: string) {
	return Buffer.from(address.slice(2), 'hex')
}

export default makeAnonAuthoriserClient