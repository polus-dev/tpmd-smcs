import { task } from 'hardhat/config'

type DeployTokenArgs = { name: string, symbol: string, supply: number, initializer: string }
type DeployExchangeArgs = { owner: string }

task('deploy-token', 'deploy "contracts/ERC20Token.sol" smart contract')
    .addPositionalParam<string>('name', 'name of the token')
    .addPositionalParam<string>('symbol', 'symbol of the token')
    .addPositionalParam<number>('supply', 'initial supply of the token (will be "* 1e18" in smc)')
    .addPositionalParam<string>('initializer', 'address which will receive the initial supply')
    .setAction(async (arg: DeployTokenArgs, hre) => {
        const Token = await hre.ethers.getContractFactory('ERC20Token')
        const token = await Token.deploy(arg.name, arg.symbol, arg.supply, arg.initializer)

        await token.deployed()
        console.log('ERC20Token deployed to:', token.address)
    })

task('deploy-exchange', 'deploy "contracts/Exchange.sol" smart contract')
    .addPositionalParam<string>('owner', 'owner of the Exchange contract')
    .setAction(async (args: DeployExchangeArgs, hre) => {
        const Exchange = await hre.ethers.getContractFactory('Exchange')
        const exchange = await Exchange.deploy(args.owner)

        await exchange.deployed()
        console.log('Exchange deployed to:', exchange.address)
    })
