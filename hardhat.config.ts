import { HardhatUserConfig } from 'hardhat/config'
import * as dotenv from 'dotenv'
import '@nomicfoundation/hardhat-toolbox'

import './tasks/deploy'

dotenv.config({ path: '.env' })

const config: HardhatUserConfig = {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {},
        mumbai: {
            chainId: parseInt(process.env.CHAIN_ID, 10),
            url: process.env.RPC_URL,
            accounts: [ process.env.PRIVATE_KEY ]
        }
    },
    solidity: {
        version: '0.8.9',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    paths: {
        sources: './contracts',
        tests: './test',
        cache: './cache',
        artifacts: './artifacts'
    }
}

// eslint-disable-next-line import/no-default-export
export default config