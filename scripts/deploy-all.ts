import { exec } from 'child_process'
import { promisify } from 'util'
import chains from '../chains.json'
import contractAddresses from '../src/contract-address-map.json'

const ignoreFailures = process.argv.includes('--ignore-failures')

async function main() {
	// specify a list of chains to skip
	const skip = (process.env.SKIP || '').split(',')
	const chainList = Object.keys(chains)
	for(const chainName of chainList) {
		if(chainName in contractAddresses || skip.includes(chainName)) {
			console.log(`skipping "${chainName}"`)
			continue
		}

		try {
			console.log(`deploying contract to "${chainName}"`)
			await execPromise(
				'yarn deploy',
				{
					env: {
						...process.env,
						NETWORK: chainName
					},
				}
			)
			console.log(`Contract deployed to "${chainName}"`)
		} catch(error) {
			console.error(`error in deploying contract to "${chainName}": ${error}`)
			if(!ignoreFailures) {
				throw error
			}
		}
	}
}

const execPromise = promisify(exec)

main()