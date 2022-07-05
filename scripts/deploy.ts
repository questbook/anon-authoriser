import { readFile, writeFile } from 'fs/promises'
import { ethers, network } from 'hardhat'
import type { AnonAuthoriser__factory } from '../src/types'

async function main() {
	console.log(`deploying contract to "${network.name}"`)
	// We get the contract to deploy
	const factory = await ethers.getContractFactory('AnonAuthoriser',) as AnonAuthoriser__factory
	const contract = await factory.deploy()

	await contract.deployed()

	console.log(`Contract deployed to "${contract.address}" on "${network.name}"`)
	await updateContractAddressInJson(contract.address)
}

async function updateContractAddressInJson(address: string) {
	const filename = '.src/contract-address-map.json'
	let json: any = { }
	try {
		const jsonStr = await readFile(filename, { encoding: 'utf-8' })
		json = JSON.parse(jsonStr)
	} catch(error) {
		console.log(`Could not read ${filename} due to ${error}, overwriting...`)
	}

	json[network.name] = { address }
	await writeFile(filename, JSON.stringify(json, undefined, 2))
}

main()