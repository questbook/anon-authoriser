import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import { HardhatUserConfig } from 'hardhat/types';

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
}

export default config
