import { readFile, writeFile } from "fs/promises";
import CONTRACT_ADDRESS_MAP from '../../common/contract-address-map.json'

async function main() {
	let readme = await readFile('../README.md', { encoding: 'utf-8' })
	const addressList = (Object.keys(CONTRACT_ADDRESS_MAP) as (keyof typeof CONTRACT_ADDRESS_MAP)[])
		.map(key => `${key}: ${CONTRACT_ADDRESS_MAP[key].address}`)
		.join('\n')
	const REGEX = /following chains:\n+```\n(.+)\n```/gm
	const match = REGEX.exec(readme)
	if(!match) {
		throw new Error('could not find address list in readme')
	}
	readme = readme.replace(match[1], addressList)
	await writeFile('../README.md', readme)
}

main()