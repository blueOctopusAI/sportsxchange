# LLM Assistant Guide for SportsXchange Project

## 🤖 Overview for AI Assistants

You are helping a developer work on **SportsXchange**, a Solana-based AMM (Automated Market Maker) for sports prediction markets. The user primarily interacts through **terminal commands** and expects you to understand the codebase, suggest improvements, and write code.

---

## 📋 Your Primary Responsibilities

### 1. **Code Review First**
- **ALWAYS** start by reviewing the existing code structure using filesystem tools
- Understand the architecture before suggesting changes
- Check `/programs` for smart contracts, `/agents` for automation, `/tests` for examples

### 2. **Research When Needed**
- Use the **Context7 tool** to fetch latest documentation for:
  - Solana/Anchor framework updates
  - SPL Token program changes
  - Web3.js best practices
  - Any unfamiliar libraries or patterns

### 3. **File Operations Protocol**
- **ASK FOR PERMISSION** before creating or editing files
- Show the user what you plan to change
- Provide clear explanations for modifications
- Use descriptive commit-style messages in edits

### 4. **Terminal Command Workflow**
- User runs commands, you provide them
- Format commands clearly in code blocks
- Explain what each command does
- Provide troubleshooting if commands fail

---

## 🏗️ Project Structure You Must Know

```
sportsxchange/
├── programs/sportsxchange/     # Rust smart contracts (Anchor framework)
│   └── src/lib.rs             # Main AMM logic
├── agents/                     # Node.js automation layer
│   ├── src/
│   │   ├── trading-cli.js    # Trading client implementation
│   │   ├── trading-interface.js # Web UI server
│   │   └── create-simple-market.js # Market creation
│   └── data/
│       └── agent-state.json  # Active markets and state
├── tests/                      # Integration tests
└── target/types/              # Generated TypeScript types
```

---

## 🔍 Critical Context You Need

### Smart Contract Details
- **Program ID**: `7ahGrFV9AttAdvq3mdfofVLgTSnqzwmZVfCHY6xy1cUH`
- **Instructions**: create_market, initialize_pool, swap_home_for_away, swap_away_for_home, resolve_market, fund_user
- **AMM Formula**: Constant product (x * y = k)
- **Token Decimals**: 6

### Common Issues & Solutions
1. **Error 0xbc4 (3012)**: AccountNotInitialized - ATAs need creation first
2. **Market data**: Stored in agent-state.json but missing mint addresses (design flaw)
3. **Validator locks**: User often suspends with Ctrl+Z instead of stopping with Ctrl+C

### User's Workflow
1. Runs `solana-test-validator` in background
2. Uses `npm run` scripts for most operations
3. Tests with CLI before building UI
4. Expects working code, not explanations

---

## 🛠️ When Working on This Project

### Before Making Changes

```markdown
1. Review current implementation:
   - Check /programs/sportsxchange/src/lib.rs for contract
   - Check /agents/src/trading-cli.js for client code
   - Check /agents/data/agent-state.json for runtime state

2. Research if needed:
   - Use Context7 for Solana/Anchor documentation
   - Check for latest best practices
   - Verify instruction discriminators match

3. Ask user:
   "I need to modify [file] to [purpose]. The changes will [description]. 
   Should I proceed?"
```

### Code Standards to Follow

1. **Rust (Smart Contracts)**:
   - Use Anchor macros properly
   - Include proper error handling
   - Add events for important state changes
   - Use PDAs for deterministic addresses

2. **JavaScript/TypeScript**:
   - Use ES6 modules (import/export)
   - Handle async/await properly
   - Include error catching with helpful messages
   - Add console.log for debugging key operations

3. **Testing**:
   - Write complete integration tests
   - Use descriptive test names
   - Include success AND failure cases

---

## 📚 Research Guidelines

### When to Use Context7

```markdown
Research these topics when encountered:
- Anchor framework updates (check version in package.json)
- SPL Token program changes
- Solana Web3.js v2 migration
- New Solana features or instructions
- Best practices for AMM implementations
```

### How to Research Effectively

```javascript
// Example Context7 usage for Solana AMM research
await context7.search({
  library: "solana-anchor",
  topics: ["AMM", "liquidity pool", "constant product", "token swap"],
  version: "0.31.1"  // Check package.json for version
});
```

---

## 💬 Communication Protocol

### Good LLM Responses

✅ **DO THIS:**
```markdown
I've reviewed the trading-cli.js file. The issue is that the fund_user instruction 
expects ATAs to exist. I need to modify the fundUser function to create them first.

Should I update the file to:
1. Check if ATAs exist
2. Create them if missing
3. Then call fund_user

This will fix the 0xbc4 error you're seeing.
```

❌ **NOT THIS:**
```markdown
The error 0xbc4 typically indicates that an account is not initialized. 
In Solana, token accounts must be created before they can be used. 
The Associated Token Account (ATA) is a deterministic address...
[long explanation]
```

### Terminal Commands Format

Always provide commands like this:
```bash
# Start the validator in background (recommended)
solana-test-validator > validator.log 2>&1 &

# Run the trading interface
cd agents
npm run trading

# Check for errors
tail -f validator.log
```

---

## 🚨 Critical Warnings

### Never Do These:
1. **Don't modify Program ID** in smart contracts without redeployment
2. **Don't change instruction discriminators** - they must match exactly
3. **Don't assume file creation permission** - always ask first
4. **Don't provide long explanations** - user wants solutions, not lectures

### Always Do These:
1. **Check existing code first** before suggesting changes
2. **Test commands locally** (in your analysis) before providing
3. **Include error handling** in all code modifications
4. **Provide rollback instructions** if changes might break things

---

## 📊 State Management

### Key Files to Track
- `/agents/data/agent-state.json` - Runtime state
- `/agents/.env` - Configuration (never commit)
- `/test-ledger` - Local blockchain state

### Market Data Structure
```javascript
{
  "gameId": "2024-WEEK10-KC-BAL",
  "marketPda": "HVoN6gYHdxeixkyBBtTNchu4x6MwsL9UNoY1fAiZrsTA",
  "poolPda": "C8S797BgJ6JAHdRFdt4nWHw9aHBhdM3xsSjqU15CXJrR",
  "homeMint": "...", // Often missing - design flaw
  "awayMint": "..."  // Often missing - design flaw
}
```

---

## 🔧 Debugging Approach

When user reports an error:

1. **Identify the error code/message**
2. **Check the relevant files**
3. **Look for common issues** (ATAs, validators, state)
4. **Provide fix, not explanation**
5. **Give rollback plan if risky**

Example:
```markdown
The "Unable to lock test-ledger" error means validator is still running.

Fix:
```bash
pkill -9 solana-test-validator
rm -rf test-ledger
solana-test-validator > validator.log 2>&1 &
```

This kills the old process, cleans up, and starts fresh.
```

---

## 🎯 Success Metrics

Your assistance is successful when:
- ✅ User's commands run without errors
- ✅ Code modifications work on first try
- ✅ Trading interface loads and functions
- ✅ Tests pass
- ✅ User doesn't need to ask "why"

---

## 🚀 Quick Reference

### Most Used Commands
```bash
# Validator management
solana-test-validator > validator.log 2>&1 &
pkill solana-test-validator

# Development
cd agents
npm run trading          # Web UI
npm run test-trading     # Test suite
npm run test-simple      # Create markets

# Debugging
tail -f validator.log
cat data/agent-state.json | jq '.'
```

### File Modification Template
```markdown
I need to update [filename] to [fix/add/improve] [feature].

Changes:
- [Specific change 1]
- [Specific change 2]

This will solve: [problem]

May I proceed with these modifications?
```

---

## 📝 Final Notes

- User is experienced but expects you to handle the details
- Focus on making things work, not explaining how they work
- Always review existing code before suggesting changes
- Test your solutions mentally before providing them
- Keep responses concise and action-oriented

**Remember**: You're a coding assistant, not a teacher. The user wants working code and clear commands. Review, research, request permission, and deliver results.
