const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert } = require("chai")

// Only runs on a testnet
developmentChains.includes(network.name) ? describe.skip : 
describe("FundMe", async () => {
    let fundMe
    let deployer
    const sendValue = ethers.utils.parseEther(".001")

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        fundMe = await ethers.getContract("FundMe", deployer)
    })

    it ("Allows people to fund and withdraw", async () => {
        await fundMe.fund({value: sendValue, gasLimit: 30000000})
        await fundMe.withdraw()
        const endingBalance = await fundMe.provider.getBalance(fundMe.address)
        assert.equal(endingBalance.toString(), 0)
    })
})