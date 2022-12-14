import { HardhatUserConfig } from 'hardhat/config'
import * as dotenv from 'dotenv'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-gas-reporter'

import './tasks/deploy'
import './tasks/info'

dotenv.config({ path: '.env' })

const config: HardhatUserConfig = {
    defaultNetwork: 'mumbai',
    networks: {
        hardhat: {},
        mumbai: {
            chainId: parseInt(process.env.CHAIN_ID, 10),
            url: process.env.RPC_URL,
            accounts: [ `0x${process.env.PRIVATE_KEY}` ]
        }
    },
    solidity: {
        version: '0.8.9',
        settings: {
            optimizer: {
                enabled: false,
                runs: 0
            }
        }
    },
    paths: {
        sources: './contracts',
        tests: './test',
        cache: './cache',
        artifacts: './artifacts'
    },
    gasReporter: {
        enabled: process.env.GAS_REPORTER_ENABLED === 'true',
        token: process.env.GAS_REPORTER_TOKEN,
        currency: process.env.GAS_REPORTER_CURRENCY,
        gasPriceApi: process.env.GAS_REPORTER_GASPRICEAPI,
        coinmarketcap: process.env.GAS_REPORTER_COINMARKETCAP
    },
    etherscan: { apiKey: { polygon: process.env.ETHERSCAN_KEY } }
}

// eslint-disable-next-line import/no-default-export
export default config
