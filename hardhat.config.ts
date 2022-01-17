import dotenv from 'dotenv'
declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    timeAndMine: {
      mine(blocks: number): Promise<void>
      setTime(timestamp: number): Promise<void>
      setTimeNextBlock(timestamp: number): Promise<void>
      increaseTime(seconds: number): Promise<void>
      setTimeIncrease(seconds: number): Promise<void>
    }
  }
}

dotenv.config()

import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import '@nomiclabs/hardhat-etherscan'
import 'solidity-coverage'
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import '@atixlabs/hardhat-time-n-mine'

import { HardhatUserConfig, NetworksUserConfig } from 'hardhat/types'

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

let networks: NetworksUserConfig = {}

if (process.env.GOERLI) {
  networks['goerli'] = {
    url: process.env.GOERLI,
  }
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.8.10',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      deploy: ['./deploy/hardhat'],
    },
    localhost: {},
    coverage: {
      url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    },
    ...networks,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: 0,
  },
}

export default config
