# Solidity Security Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Solidity Security

Master smart contract security best practices, vulnerability prevention, and secure Solidity development patterns.

## When to Use This Skill

- Writing secure smart contracts
- Auditing existing contracts for vulnerabilities
- Implementing secure DeFi protocols
- Preventing reentrancy, overflow, and access control issues
- Optimizing gas usage while maintaining security
- Preparing contracts for professional audits
- Understanding common attack vectors

## Critical Vulnerabilities

### 1. Reentrancy

Attacker calls back into your contract before state is updated.

**Vulnerable Code:**

```solidity
// VULNERABLE TO REENTRANCY
contract VulnerableBank {
    mapping(address => uint256) public balances;

    function withdraw() public {
        uint256 amount = balances[msg.sender];

        // DANGER: External call before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);

        balances[msg.sender] = 0;  // Too late!
    }
}
```

**Secure Pattern (Checks-Effects-Interactions):**

```solidity
contract SecureBank {
    mapping(address => uint256) public balances;

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Insufficient balance");

        // EFFECTS: Update state BEFORE external call
        balances[msg.sender] = 0;

        // INTERACTIONS: External call last
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

**Alternative: ReentrancyGuard**

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecureBank is ReentrancyGuard {
    mapping(address => uint256) public balances;

    function withdraw() public nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Insufficient balance");

        balances[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

### 2. Integer Overflow/Underflow

**Vulnerable Code (Solidity < 0.8.0):**

```solidity
// VULNERABLE
contract VulnerableToken {
    mapping(address => uint256) public balances;

    function transfer(address to, uint256 amount) public {
        // No overflow check - can wrap around
        balances[msg.sender] -= amount;  // Can underflow!
        balances[to] += amount;          // Can overflow!
    }
}
```

**Secure Pattern (Solidity >= 0.8.0):**

```solidity
// Solidity 0.8+ has built-in overflow/underflow checks
contract SecureToken {
    mapping(address => uint256) public balances;

    function transfer(address to, uint256 amount) public {
        // Automatically reverts on overflow/underflow
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
```

Legacy contracts below Solidity 0.8 need a separately pinned compiler-compatible arithmetic library and explicit migration review. OpenZeppelin 5.x requires modern Solidity and does not provide the legacy SafeMath path; do not mix the versions shown in older examples.

### 3. Access Control

**Vulnerable Code:**

```solidity
// VULNERABLE: Anyone can call critical functions
contract VulnerableContract {
    address public owner;

    function withdraw(uint256 amount) public {
        // No access control!
        payable(msg.sender).transfer(amount);
    }
}
```

**Secure Pattern:**

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract SecureContract is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}
    function withdraw(uint256 amount) public onlyOwner {
        payable(owner()).transfer(amount);
    }
}

// Or implement custom role-based access
contract RoleBasedContract {
    mapping(address => bool) public admins;

    modifier onlyAdmin() {
        require(admins[msg.sender], "Not an admin");
        _;
    }

    function criticalFunction() public onlyAdmin {
        // Protected function
    }
}
```

### 4. Front-Running

**Vulnerable:**

```solidity
// VULNERABLE TO FRONT-RUNNING
contract VulnerableDEX {
    function swap(uint256 amount, uint256 minOutput) public {
        // Attacker sees this in mempool and front-runs
        uint256 output = calculateOutput(amount);
        require(output >= minOutput, "Slippage too high");
        // Perform swap
    }
}
```

**Mitigation:**

```solidity
contract SecureDEX {
    mapping(address => mapping(bytes32 => uint256)) public committedAt;

    // Step 1: Commit to trade
    function commitTrade(bytes32 commitment) public {
        require(committedAt[msg.sender][commitment] == 0, "Already committed");
        committedAt[msg.sender][commitment] = block.number;
    }

    // Step 2: Reveal trade (next block)
    function revealTrade(
        uint256 amount,
        uint256 minOutput,
        bytes32 secret
    ) public {
        bytes32 commitment = keccak256(abi.encode(
            address(this), block.chainid, msg.sender, amount, minOutput, secret
        ));
        uint256 committedBlock = committedAt[msg.sender][commitment];
        require(committedBlock != 0 && block.number > committedBlock, "Missing or same-block commitment");
        delete committedAt[msg.sender][commitment]; // consume before any interaction
        // Perform swap
    }
}
```

## Security Best Practices

### Checks-Effects-Interactions Pattern

```solidity
contract SecurePattern {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) public {
        // 1. CHECKS: Validate conditions
        require(amount <= balances[msg.sender], "Insufficient balance");
        require(amount > 0, "Amount must be positive");

        // 2. EFFECTS: Update state
        balances[msg.sender] -= amount;

        // 3. INTERACTIONS: External calls last
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

### Pull Over Push Pattern

```solidity
// Prefer this (pull)
contract SecurePayment {
    mapping(address => uint256) public pendingWithdrawals;

    function recordPayment(address recipient, uint256 amount) internal {
        pendingWithdrawals[recipient] += amount;
    }

    function withdraw() public {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

// Over this (push)
contract RiskyPayment {
    function distributePayments(address[] memory recipients, uint256[] memory amounts) public {
        for (uint i = 0; i < recipients.length; i++) {
            // If any transfer fails, entire batch fails
            payable(recipients[i]).transfer(amounts[i]);
        }
    }
}
```

### Input Validation

```solidity
contract SecureContract {
    mapping(address => uint256) public balances;

    function transfer(address to, uint256 amount) public {
        // Validate inputs
        require(to != address(0), "Invalid recipient");
        require(to != address(this), "Cannot send to contract");
        require(amount > 0, "Amount must be positive");
        require(amount <= balances[msg.sender], "Insufficient balance");

        // Proceed with transfer
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
```

### Emergency Stop (Circuit Breaker)

```solidity
import "@openzeppelin/contracts/utils/Pausable.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract EmergencyStop is Pausable, Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}
    function criticalFunction() public whenNotPaused {
        // Function logic
    }

    function emergencyStop() public onlyOwner {
        _pause();
    }

    function resume() public onlyOwner {
        _unpause();
    }
}
```

## Gas Optimization

### Use `uint256` Instead of Smaller Types

```solidity
// More gas efficient
contract GasEfficient {
    uint256 public value;  // Optimal

    function set(uint256 _value) public {
        value = _value;
    }
}

// Less efficient
contract GasInefficient {
    uint8 public value;  // Still uses 256-bit slot

    function set(uint8 _value) public {
        value = _value;  // Extra gas for type conversion
    }
}
```

### Pack Storage Variables

```solidity
// Gas efficient (3 variables in 1 slot)
contract PackedStorage {
    uint128 public a;  // Slot 0
    uint64 public b;   // Slot 0
    uint64 public c;   // Slot 0
    uint256 public d;  // Slot 1
}

// Gas inefficient (each variable in separate slot)
contract UnpackedStorage {
    uint256 public a;  // Slot 0
    uint256 public b;  // Slot 1
    uint256 public c;  // Slot 2
    uint256 public d;  // Slot 3
}
```

### Use `calldata` Instead of `memory` for Function Arguments

```solidity
contract GasOptimized {
    // More gas efficient
    function processData(uint256[] calldata data) public pure returns (uint256) {
        return data[0];
    }

    // Less efficient
    function processDataMemory(uint256[] memory data) public pure returns (uint256) {
        return data[0];
    }
}
```

### Use Events for Data Storage (When Appropriate)

```solidity
contract EventStorage {
    // Emitting events is cheaper than storage
    event DataStored(address indexed user, uint256 indexed id, bytes data);

    function storeData(uint256 id, bytes calldata data) public {
        emit DataStored(msg.sender, id, data);
        // Don't store in contract storage unless needed
    }
}
```

## Common Vulnerabilities Checklist

```solidity
// Security Checklist Contract
contract SecurityChecklist {
    /**
     * [ ] Reentrancy protection (ReentrancyGuard or CEI pattern)
     * [ ] Integer overflow/underflow (Solidity 0.8+ or SafeMath)
     * [ ] Access control (Ownable, roles, modifiers)
     * [ ] Input validation (require statements)
     * [ ] Front-running mitigation (commit-reveal if applicable)
     * [ ] Gas optimization (packed storage, calldata)
     * [ ] Emergency stop mechanism (Pausable)
     * [ ] Pull over push pattern for payments
     * [ ] No delegatecall to untrusted contracts
     * [ ] No tx.origin for authentication (use msg.sender)
     * [ ] Proper event emission
     * [ ] External calls at end of function
     * [ ] Check return values of external calls
     * [ ] No hardcoded addresses
     * [ ] Upgrade mechanism (if proxy pattern)
     */
}
```

## Testing for Security

The earlier Hardhat test referenced an absent attacker contract and deposit method, mixed ethers v5/v6 APIs, used an out-of-scope signer and asserted an OpenZeppelin v4 revert string against modern contracts. It was not an executable regression test. Build a local test fixture for the selected exact contract/compiler/OpenZeppelin/Hardhat/ethers versions, then verify:

- deposits and successful withdrawals preserve the accounting invariant;
- adversarial callback/reentry cannot withdraw more than the recorded entitlement;
- unauthorized callers fail with the installed version’s actual custom error;
- insufficient balances and boundary arithmetic revert for the intended reason;
- commit reveal rejects same-block reveal, another caller and replay, and consumes before interactions;
- pause/resume roles and upgrade/storage-layout invariants match the threat model.

Use deterministic fixtures, fuzzing and invariant testing. No deployed funds or mainnet calls are required to test these patterns.

## Audit Preparation

```solidity
contract WellDocumentedContract {
    /**
     * @title Well Documented Contract
     * @dev Example of proper documentation for audits
     * @notice This contract handles user deposits and withdrawals
     */

    /// @notice Mapping of user balances
    mapping(address => uint256) public balances;

    /**
     * @dev Deposits ETH into the contract
     * @notice Anyone can deposit funds
     */
    function deposit() public payable {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
    }

    /**
     * @dev Withdraws user's balance
     * @notice Follows CEI pattern to prevent reentrancy
     * @param amount Amount to withdraw in wei
     */
    function withdraw(uint256 amount) public {
        // CHECKS
        require(amount <= balances[msg.sender], "Insufficient balance");

        // EFFECTS
        balances[msg.sender] -= amount;

        // INTERACTIONS
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

## Resources

- **references/reentrancy.md**: Comprehensive reentrancy prevention
- **references/access-control.md**: Role-based access patterns
- **references/overflow-underflow.md**: SafeMath and integer safety
- **references/gas-optimization.md**: Gas saving techniques
- **references/vulnerability-patterns.md**: Common vulnerability catalog
- **assets/solidity-contracts-templates.sol**: Secure contract templates
- **assets/security-checklist.md**: Pre-audit checklist
- **scripts/analyze-contract.sh**: Static analysis tools

## Tools for Security Analysis

- **Slither**: Static analysis tool
- **Mythril**: Security analysis tool
- **Echidna**: Fuzzing tool
- **Manticore**: Symbolic execution
- **Securify**: Automated security scanner

## Common Pitfalls

1. **Using `tx.origin` for Authentication**: Use `msg.sender` instead
2. **Unchecked External Calls**: Always check return values
3. **Delegatecall to Untrusted Contracts**: Can hijack your contract
4. **Floating Pragma**: Pin to specific Solidity version
5. **Missing Events**: Emit events for state changes
6. **Excessive Gas in Loops**: Can hit block gas limit
7. **No Upgrade Path**: Consider proxy patterns if upgrades needed

## Version and scope limits

Independent teaching fragments, not deployable audited contracts. Modern examples assume a pinned compatible Solidity 0.8.x compiler and OpenZeppelin 5.x; add project-approved SPDX metadata without inventing a source license. Duplicate contract names belong in separate files. Balance examples omit funding/token-standard behavior; custom admins need a controlled initialization/grant/revoke design. Commit/reveal here demonstrates ownership, delay and one-time consumption only; actual trading needs escrow, expiry, settlement, slippage/deadline and griefing analysis and remains exposed to MEV. Logs cannot be read by contracts as a storage substitute; storage packing and integer gas costs depend on access patterns/compiler. Listed references/assets/scripts are absent from this package. No security, gas-saving or audit result is established by the snippets.

Primary version references: [OpenZeppelin utils](https://docs.openzeppelin.com/contracts/5.x/api/utils), [access control](https://docs.openzeppelin.com/contracts/5.x/access-control).
