import { task } from 'hardhat/config'

task('signer', 'show signer address').setAction(async (_, hre) => {
    const signers = await hre.ethers.getSigners()

    signers.forEach((signer, idx) => {
        console.log(`signer address[${idx}]: ${signer.address}`)
    })
})
