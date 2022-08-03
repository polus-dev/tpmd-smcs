import { expect } from 'chai'
import { ethers } from 'hardhat'
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
    SORRY_BALC: 'insufficient balance token1',

    // from 'contracts/utils/Ownable.sol'
    NOT_COWNER: 'not owner'
}

describe('team-distributor', () => {
    const zeroAddress = '0x0000000000000000000000000000000000000000'

    // 1000000000000000000000000
    const supply = 1_000_000n * (10n ** 18n)

    let token0: ERC20Token
    let token1: ERC20Token

    let exchange: Exchange

    let deployer: SignerWithAddress
    let projectOwner: SignerWithAddress
    let accountHolder: SignerWithAddress

    beforeEach(async () => {
        [ deployer, projectOwner, accountHolder ] = await ethers.getSigners()

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

    async function setTokens (): Promise<void> {
        await exchange.connect(projectOwner).setToken0(token0.address)
        await exchange.connect(projectOwner).setToken1(token1.address)
    }

    function ethToWei (eth: bigint): bigint {
        return eth * 10n ** 18n
    }

    it('should be deployed', async () => {
        expect(token0.address).to.be.properAddress
        expect(token1.address).to.be.properAddress
        expect(exchange.address).to.be.properAddress

        expect(await token0.balanceOf(projectOwner.address)).to.be.equals(supply)
        expect(await token1.balanceOf(projectOwner.address)).to.be.equals(supply)

        expect(await exchange._token0()).equals(zeroAddress)
        expect(await exchange._token1()).equals(zeroAddress)
    })

    it('should set tokens', async () => {
        await setTokens()
        expect(await exchange._token0()).to.be.equals(token0.address)
        expect(await exchange._token1()).to.be.equals(token1.address)
    })

    it('shouldn\'t set tokens (not owner)', async () => {
        await expect(exchange.connect(deployer).setToken0(token0.address))
            .to.be.revertedWith(ERRORS.NOT_COWNER)

        await expect(exchange.connect(deployer).setToken1(token1.address))
            .to.be.revertedWith(ERRORS.NOT_COWNER)

        expect(await exchange._token0()).equals(zeroAddress)
        expect(await exchange._token1()).equals(zeroAddress)
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
        await token1.connect(projectOwner).transfer(exchange.address, ethToWei(100n))

        await expect(exchange.connect(accountHolder).exchange(ethToWei(10n)))
            .to.be.revertedWith(ERRORS.INV_ALLOWN)
    })

    it('try to exchange with insufficient balance of token1', async () => {
        const base = ethToWei(100n)

        await setTokens()
        await token1.connect(projectOwner).transfer(exchange.address, base)

        await token0.connect(projectOwner).transfer(accountHolder.address, base + 1n)
        await token0.connect(accountHolder).approve(exchange.address, base + 1n)

        await expect(exchange.connect(accountHolder).exchange(base + 1n))
            .to.be.revertedWith(ERRORS.SORRY_BALC)
    })

    it('try to successful exchange token0 -> token1', async () => {
        const base = ethToWei(50n)

        await setTokens()
        await token1.connect(projectOwner).transfer(exchange.address, base)

        await token0.connect(projectOwner).transfer(accountHolder.address, base)
        await token0.connect(accountHolder).approve(exchange.address, base)

        // before exchange
        expect(await token1.balanceOf(accountHolder.address)).equals(0n)
        expect(await token0.balanceOf(accountHolder.address)).equals(base)

        expect(await token0.balanceOf(exchange.address)).equals(0n)
        expect(await token1.balanceOf(exchange.address)).equals(base)
        // ---------------

        // exchange
        await exchange.connect(accountHolder).exchange(base)

        // after exchange
        expect(await token1.balanceOf(accountHolder.address)).equals(base)
        expect(await token0.balanceOf(accountHolder.address)).equals(0n)

        expect(await token0.balanceOf(exchange.address)).equals(base)
        expect(await token1.balanceOf(exchange.address)).equals(0n)
        // ---------------
    })
})
