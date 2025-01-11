# Multi-Agent Testing Framework

> ⚠️ **IMPORTANT NOTICE**: The Base Sepolia P2P network used by this framework is currently not open to the public. The underlying node implementation will be open-sourced soon. Stay tuned for updates!

A testing framework for simulating multiple agents in a P2P network environment, specifically designed for testing agent interactions on the Base Sepolia network.

## Features

- Create and manage multiple test agents
- Automatic agent funding with Base Sepolia ETH
- Agent registration with on-chain registry contract
- Message passing between agents
- Comprehensive test reporting
- Built-in logging system

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Access to Base Sepolia network
- A funded wallet for test agent distribution

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd multi-agent

# Install dependencies
pnpm install
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:

- `RPC_URL`: Base Sepolia RPC URL
- `REGISTRY_ADDRESS`: Agent Registry contract address
- `FUNDER_PRIVATE_KEY`: Private key of wallet with funds
- `AGENT_COUNT`: Number of test agents to create
- `TEST_TIMEOUT`: Test timeout in milliseconds

## Usage

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build the project
pnpm build

# Lint the code
pnpm lint
```

## Project Structure

```
multi-agent/
├── test/
│   └── p2p/
│       ├── TestRunner.ts    # Core test orchestration
│       ├── run-test.ts      # Test execution entry point
│       └── logger.ts        # Logging functionality
├── .env.example
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── README.md
└── tsconfig.json
```

## Test Structure

The framework creates:

1. Local bootstrap nodes for P2P network simulation
2. Multiple test agents that:
   - Get funded with Base Sepolia ETH
   - Register with the registry contract
   - Connect to bootstrap nodes
   - Exchange messages with other agents

### Test Flow

1. Initialize bootstrap nodes
2. Create and fund test agents
3. Register agents with contract
4. Establish P2P connections
5. Run message passing tests
6. Generate test summary
7. Clean up resources

## Test Output

The test runner provides detailed output including:

- Number of tests run
- Pass/fail status
- Message statistics
- Duration metrics
- Detailed error information if tests fail

Example output:

```
========================================
           Test Summary
========================================
Total Tests:      1
Passed:           1
Failed:           0
Total Duration:   15000ms
----------------------------------------

Detailed Results:
message-test:
  Status:            ✅ Passed
  Messages Sent:     2
  Messages Received: 2
  Duration:          5000ms
```

## Development

The test framework is organized in the `test/p2p` directory:

1. Main components:

   - `TestRunner.ts`: Core test orchestration
   - `logger.ts`: Logging functionality
   - `run-test.ts`: Test execution entry point

2. Key classes:
   - `TestRunner`: Manages test lifecycle
   - `Logger`: Handles logging and output

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC
