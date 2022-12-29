const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

//Only runs locally
!developmentChains.includes(network.name) ? describe.skip : 
describe("FundMe", async function () {
    let fundMe
    let deployer
    let MockV3Aggregator
    let sendValue = ethers.utils.parseEther("1") // 1 ETH

    beforeEach(async () => {
        // const accounts = await ethers.getSigners()
        // const account0 = accounts[0]
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        fundMe = await ethers.getContract("FundMe", deployer)
        MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
    })

    describe("constructor", async () => {
        it("sets the aggregator address correctly", async () => {
            const response = await fundMe.getPriceFeed()
            assert.equal(response, MockV3Aggregator.address)
        })
    })

    describe("fund", async () => {
        it("Fails if you don't send enough ETH", async () => {
            await expect(fundMe.fund()).to.be.revertedWith("Didn't send enough")
        })
        it("Updates the amount funded data structure", async () => {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.getAddressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })
        it("Adds funder to array of funders", async () => {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.getFunder(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", async () => {
        beforeEach(async () => {
            await fundMe.fund({value: sendValue})
        })

        it("it can withdraw ETH from a single founder", async () => {
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)

            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)
            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance), endingDeployerBalance.add(gasCost).toString())
        })

        it("cheaperWithdraw - it can withdraw ETH from a single founder", async () => {
            const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
            const startingDeployerBalance = await fundMe.provider.getBalance(deployer)

            const transactionResponse = await fundMe.cheaperWithdraw()
            const transactionReceipt = await transactionResponse.wait(1)
            
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)

            const endingDeployerBalance = await fundMe.provider.getBalance(deployer)
            assert.equal(endingFundMeBalance, 0)
            assert.equal(startingFundMeBalance.add(startingDeployerBalance), endingDeployerBalance.add(gasCost).toString())
        })

        it("allows us to withdraw with multiple funders", async () => {
            const accounts = await ethers.getSigners()
            for(i = 1; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(accounts[i])
                await fundMeConnectedContract.fund({ value: sendValue })
            }

                const startingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                const startingDeployerBalance = await fundMe.provider.getBalance(deployer)
                console.log(`startingFundMeBalance: ${ethers.utils.formatEther(startingFundMeBalance)}`)
                console.log(`startingDeployerBalance: ${ethers.utils.formatEther(startingDeployerBalance)}`)

                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                console.log(`GasCost: ${ethers.utils.formatEther(withdrawGasCost)}`)
                console.log(`GasUsed: ${ethers.utils.formatEther(gasUsed)}`)
                console.log(`GasPrice: ${ethers.utils.formatEther(effectiveGasPrice)}`)

                const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address)
                const endingDeployerBalance = await fundMe.provider.getBalance(deployer)
                console.log(`endingFundMeBalance: ${ethers.utils.formatEther(endingFundMeBalance)}`)
                console.log(`endingDeployerBalance: ${ethers.utils.formatEther(endingDeployerBalance)}`)

                console.log(`starting fund me + starting deployer: ${ethers.utils.formatEther(startingFundMeBalance.add(startingDeployerBalance))}`)

                assert.equal(endingFundMeBalance, 0)
                assert.equal(startingFundMeBalance.add(startingDeployerBalance), endingDeployerBalance.add(gasCost).toString())
                await expect(fundMe.getFunder(0)).to.be.reverted

                for (i = 1; i < 6; i++) {
                    assert.equal(await fundMe.getAddressToAmountFunded(accounts[i].address), 0)
                }          
        })


        it("Only allows the owner to withdraw", async () => {
            const accounts = await ethers.getSigners()
            const fundMeConnectedContract = await fundMe.connect(accounts[1])
            await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith("FundMe__NotOwner")
        })
    })
})