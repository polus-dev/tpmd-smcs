import { expect } from 'chai'
import { ethers, network } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import '@nomicfoundation/hardhat-chai-matchers'

import { ERC20Token } from '../typechain-types/contracts/ERC20Token'
import { Exchange } from '../typechain-types/contracts/Exchange'

const ERRORS = {
    // from 'contracts/Exchange.sol' (Errors)
    NOT_INITED: 'not initialized',

    TOKEN0_SET: 'token0 is already set',
    TOKEN1_SET: 'token1 is already set',

    INV_AMOUNT: 'require: amount > 0',
    INV_ALLOWN: 'require: allowance >= amount',

    INV_BALAN0: 'insufficient balance token0',
    INV_BALAN1: 'insufficient balance token1',

    // from 'contracts/utils/Ownable.sol'
    NOT_COWNER: 'not owner'
}

describe('team-distributor', () => {
    const zeroAddress = '0x0000000000000000000000000000000000000000'

    // 1000000000000000000000000
    const supply = 1_000_000n

    let token0: ERC20Token
    let token1: ERC20Token

    let exchange: Exchange

    let deployer: SignerWithAddress
    let projectOwner: SignerWithAddress
    let accountHolder: SignerWithAddress
    let someNewOwner: SignerWithAddress

    async function setTokens (): Promise<void> {
        await exchange.connect(projectOwner).setToken0(token0.address)
        await exchange.connect(projectOwner).setToken1(token1.address)
    }

    async function determineBlockTimestamp (shiftSec: number = 5): Promise<number> {
        const blockNum = await ethers.provider.getBlockNumber()
        const beforeTs = (await ethers.provider.getBlock(blockNum)).timestamp
        const newBlockTs = beforeTs + shiftSec

        await network.provider.send('evm_setNextBlockTimestamp', [ newBlockTs ])

        return newBlockTs
    }

    function ethToWei (eth: bigint): bigint {
        return eth * 10n ** 18n
    }

    beforeEach(async () => {
        [ deployer, projectOwner, accountHolder, someNewOwner ] = await ethers.getSigners()

        const Token0Factory = await ethers.getContractFactory('ERC20Token', deployer)
        token0 = await Token0Factory.deploy('Token-0', 'T-0', supply, projectOwner.address)
        await token0.deployed()

        const Token1Factory = await ethers.getContractFactory('ERC20Token', deployer)
        token1 = await Token1Factory.deploy('Token-1', 'T-1', supply, projectOwner.address)
        await token1.deployed()

        const ExchangeFactory = await ethers.getContractFactory('Exchange', deployer)
        exchange = await ExchangeFactory.deploy(projectOwner.address)
        await exchange.deployed()
    })

    it('should be deployed', async () => {
        expect(token0.address).to.be.properAddress
        expect(token1.address).to.be.properAddress
        expect(exchange.address).to.be.properAddress

        expect(await token0.balanceOf(projectOwner.address))
            .to.be.equals(supply * (10n ** 18n))

        expect(await token1.balanceOf(projectOwner.address))
            .to.be.equals(supply * (10n ** 18n))

        expect(await exchange.token0()).to.be.equals(zeroAddress)
        expect(await exchange.token1()).to.be.equals(zeroAddress)

        expect(await exchange.owner()).to.be.equal(projectOwner.address)
    })

    it('should transfer ownership', async () => {
        expect(await exchange.owner()).to.be.equal(projectOwner.address)

        const tx = await exchange.connect(projectOwner)
            .transferOwnership(someNewOwner.address)

        await expect(tx).to.be
            .emit(exchange, 'OwnershipTransferred')
            .withArgs(projectOwner.address, someNewOwner.address)

        expect(await exchange.owner()).to.be.equal(someNewOwner.address)
    })

    it('shouldn\'t transfer ownership (not owner)', async () => {
        const ownerBefore = await exchange.owner()

        const tx = exchange.connect(deployer).transferOwnership(someNewOwner.address)
        await expect(tx).to.be.revertedWith(ERRORS.NOT_COWNER)

        expect(await exchange.owner()).to.be.equal(ownerBefore)
    })

    it('should set tokens', async () => {
        const tx1 = await exchange.connect(projectOwner).setToken0(token0.address)
        const tx2 = await exchange.connect(projectOwner).setToken1(token1.address)

        await expect(tx1)
            .to.be.emit(exchange, 'SetUpToken')
            .withArgs(token0.address, 0)

        await expect(tx2)
            .to.be.emit(exchange, 'SetUpToken')
            .withArgs(token1.address, 1)

        expect(await exchange.token0()).to.be.equals(token0.address)
        expect(await exchange.token1()).to.be.equals(token1.address)
    })

    it('shouldn\'t set tokens (not owner)', async () => {
        await expect(exchange.connect(deployer).setToken0(token0.address))
            .to.be.revertedWith(ERRORS.NOT_COWNER)

        await expect(exchange.connect(deployer).setToken1(token1.address))
            .to.be.revertedWith(ERRORS.NOT_COWNER)

        expect(await exchange.token0()).to.be.equals(zeroAddress)
        expect(await exchange.token1()).to.be.equals(zeroAddress)
    })

    it('try exchange before initialization', async () => {
        await expect(exchange.connect(accountHolder).exchange(100))
            .to.be.revertedWith(ERRORS.NOT_INITED)
    })

    it('try to set tokens when they are already set', async () => {
        await setTokens()

        await expect(exchange.connect(projectOwner).setToken0(token0.address))
            .to.be.revertedWith(ERRORS.TOKEN0_SET)

        await expect(exchange.connect(projectOwner).setToken1(token1.address))
            .to.be.revertedWith(ERRORS.TOKEN1_SET)
    })

    it('try to exchange zero amount of tokens', async () => {
        await setTokens()

        await expect(exchange.connect(accountHolder).exchange(0))
            .to.be.revertedWith(ERRORS.INV_AMOUNT)
    })

    it('try to exchange with invalid allowance', async () => {
        await setTokens()

        await token0.connect(projectOwner).transfer(accountHolder.address, ethToWei(10n))
        await token1.connect(projectOwner).transfer(exchange.address, ethToWei(100n))

        await expect(exchange.connect(accountHolder).exchange(ethToWei(10n)))
            .to.be.revertedWith(ERRORS.INV_ALLOWN)
    })

    it('try to exchange with insufficient balance of token1', async () => {
        await setTokens()
        const base = ethToWei(100n)

        await token1.connect(projectOwner).transfer(exchange.address, base)
        await token0.connect(projectOwner).transfer(accountHolder.address, base + 1n)
        await token0.connect(accountHolder).approve(exchange.address, base + 1n)

        await expect(exchange.connect(accountHolder).exchange(base + 1n))
            .to.be.revertedWith(ERRORS.INV_BALAN1)
    })

    it('try to exchange with insufficient balance of token0', async () => {
        await setTokens()
        const base = ethToWei(100n)

        await token1.connect(projectOwner).transfer(exchange.address, base)
        await token0.connect(projectOwner).transfer(accountHolder.address, base - 1n)
        await token0.connect(accountHolder).approve(exchange.address, base)

        await expect(exchange.connect(accountHolder).exchange(base))
            .to.be.revertedWith(ERRORS.INV_BALAN0)
    })

    it('try to successful exchange token0 -> token1', async () => {
        const base = ethToWei(50n)

        await setTokens()
        await token1.connect(projectOwner).transfer(exchange.address, base)

        await token0.connect(projectOwner).transfer(accountHolder.address, base)
        await token0.connect(accountHolder).approve(exchange.address, base)

        // before exchange
        expect(await token1.balanceOf(accountHolder.address)).to.be.equals(0n)
        expect(await token0.balanceOf(accountHolder.address)).to.be.equals(base)

        expect(await token0.balanceOf(exchange.address)).to.be.equals(0n)
        expect(await token1.balanceOf(exchange.address)).to.be.equals(base)
        // ---------------

        const blockts = await determineBlockTimestamp()
        await expect(await exchange.connect(accountHolder).exchange(base))
            .to.be.emit(exchange, 'Exchanged')
            .withArgs(accountHolder.address, base, blockts)

        // after exchange
        expect(await token1.balanceOf(accountHolder.address)).to.be.equals(base)
        expect(await token0.balanceOf(accountHolder.address)).to.be.equals(0n)

        expect(await token0.balanceOf(exchange.address)).to.be.equals(base)
        expect(await token1.balanceOf(exchange.address)).to.be.equals(0n)
        // ---------------
    })
})
