import { readFile, writeFile } from 'fs/promises'
import CONTRACT_ADDRESS_MAP from '../src/contract-address-map.json'

const README_PATH = './README.md'

async function main() {
	let readme = await readFile(README_PATH, { encoding: 'utf-8' })
	const addressList = (Object.keys(CONTRACT_ADDRESS_MAP) as (keyof typeof CONTRACT_ADDRESS_MAP)[])
		.map(key => `${key}: ${CONTRACT_ADDRESS_MAP[key].address}`)
		.join('\n')
	const REGEX = /following chains:\n+```\n([a-z:\-0-9\s]+)\n```/gim
	const match = REGEX.exec(readme)
	if(!match) {
		throw new Error('could not find address list in readme')
	}

	readme = readme.replace(match[1], addressList)
	await writeFile(README_PATH, readme)
}

main()