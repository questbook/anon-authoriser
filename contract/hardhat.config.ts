import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types'
import chains from '../common/chains.json'

type Chain = keyof typeof chains

const HARDHAT_CHAIN_ID = 31337

// Ensure that we have all the environment variables we need.
// Private key is a must for any deployment
const privateKey = process.env.PRIVATE_KEY!
// If the network you want to deploy to requires an Infura key
// specify it in the environment variable INFURA_KEY
const infuraApiKey = process.env.INFURA_API_KEY
// If the network to deploy to is specified
// only that specific network will be used in the hardhat config
const selectedNetwork = process.env.NETWORK

const CHAIN_LIST = (selectedNetwork ? [selectedNetwork] : Object.keys(chains)) as Chain[];

function getChainConfig(network: Chain): NetworkUserConfig | undefined {
  const chainData = chains[network];
  if (chainData) {
    let rpcUrl = chains[network].rpcUrl;
    if (rpcUrl.includes("{{infura_key}}")) {
      if (!infuraApiKey) {
        throw new Error("Infura key required to connect to " + network);
      }
      rpcUrl = rpcUrl.replace("{{infura_key}}", infuraApiKey);
    }

    return {
      accounts: [privateKey!],
      chainId: chains[network].id,
      url: rpcUrl,
      gasPrice: 250
    };
  }
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.9',
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/solidity-template/issues/31
        bytecodeHash: 'none',
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 200,
      },
    }
  },
  networks: {
    ...CHAIN_LIST.reduce((dict, chainName) => {
      const config = getChainConfig(chainName);
      if (config) {
        dict[chainName] = config;
      }

      return dict;
    }, {} as { [C in Chain]: NetworkUserConfig }),
    hardhat: {
      chainId: HARDHAT_CHAIN_ID,
    },
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
}

export default config
