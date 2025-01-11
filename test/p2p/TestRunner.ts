import { EventEmitter } from "events";
import { createPublicClient, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Logger } from "../../logger";
import { P2PNetwork } from "../../src/p2p";

interface TestMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

interface TestResult {
  success: boolean;
  error?: Error;
  messagesSent: number;
  messagesReceived: number;
  startTime: number;
  endTime: number;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: Map<string, TestResult>;
  duration: number;
}

interface AgentCapabilities {
  canProcess: string[];
}

export class TestRunner extends EventEmitter {
  private bootstrapNodes: P2PNetwork[] = [];
  private agents: Map<string, P2PNetwork> = new Map();
  private messageLog: TestMessage[] = [];
  private results: Map<string, TestResult> = new Map();
  private funderClient: any;

  constructor(
    private readonly registryAddress: string,
    private readonly rpcUrl: string,
    private readonly funderPrivateKey: `0x${string}` // Private key of the wallet with funds
  ) {
    super();
  }

  async init() {
    // Initialize logging
    await Logger.init("p2p-test");

    // Create wallet client for funding transactions
    const funderAccount = privateKeyToAccount(this.funderPrivateKey);
    this.funderClient = createWalletClient({
      account: funderAccount,
      chain: baseSepolia,
      transport: http(this.rpcUrl),
    });
  }

  private async fundAgent(address: string): Promise<boolean> {
    try {
      Logger.info("Test", `Funding agent ${address} from funder wallet`);

      // Send 0.001 ETH to cover registration and messaging costs
      const hash = await this.funderClient.sendTransaction({
        to: address,
        value: BigInt(1000000000000000n), // 0.001 ETH
      });

      // Wait for transaction confirmation
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(this.rpcUrl),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      Logger.info("Test", `Successfully funded agent ${address}`);
      return true;
    } catch (error) {
      Logger.error("Test", "Failed to fund agent", { error, address });
      return false;
    }
  }

  private generateAgentCapabilities(): AgentCapabilities {
    return {
      canProcess: ["market_sentiment", "financial_news", "market_trends"],
    };
  }

  private generatePrivateKey(): `0x${string}` {
    return generatePrivateKey();
  }

  async startBootstrapNodes(count: number = 2) {
    const startPort = 14221;
    for (let i = 0; i < count; i++) {
      const port = startPort + i;
      const privateKey = this.generatePrivateKey();

      // Create bootstrap node
      const node = new P2PNetwork(
        privateKey,
        `bootstrap-${i}`,
        "1.0.0",
        {}, // Bootstrap nodes don't need capabilities
        this.registryAddress,
        this.rpcUrl
      );

      await node.start(port);
      this.bootstrapNodes.push(node);
      Logger.info("Test", `Bootstrap node ${i} started on port ${port}`);
    }
  }

  async createAgents(count: number) {
    const startPort = 14230;
    for (let i = 0; i < count; i++) {
      const port = startPort + i;
      const privateKey = this.generatePrivateKey();

      // Create public client for balance check
      const account = privateKeyToAccount(privateKey);
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(this.rpcUrl),
      });

      // Check balance and fund if needed
      const balance = await client.getBalance({ address: account.address });
      if (balance === 0n) {
        const funded = await this.fundAgent(account.address);
        if (!funded) {
          throw new Error(
            `Failed to fund agent ${i} at address ${account.address}`
          );
        }
        Logger.info("Test", `Funded agent ${i} at address ${account.address}`);
      }

      // Create agent with metadata including capabilities
      const capabilities = this.generateAgentCapabilities();
      const node = new P2PNetwork(
        privateKey,
        `test-agent-${i}`,
        "1.0.0",
        {
          creators: `Test Framework Agent ${i}`,
          tokenAddress: undefined,
          capabilities,
        },
        this.registryAddress,
        this.rpcUrl
      );

      // Register with contract
      await node.registerWithContract();
      Logger.info("Test", `Agent ${i} registered with contract`);

      // Listen for messages
      node.on("message", (msg: any) => {
        this.messageLog.push({
          from: msg.fromAgentId,
          to: msg.toAgentId,
          content: msg.content,
          timestamp: Date.now(),
        });
      });

      await node.start(port);
      this.agents.set(`test-agent-${i}`, node);
      Logger.info("Test", `Agent ${i} started on port ${port}`);
    }
  }

  async runMessageTest() {
    const startTime = Date.now();
    const result: TestResult = {
      success: true,
      messagesSent: 0,
      messagesReceived: 0,
      startTime,
      endTime: 0,
    };

    try {
      // Each agent sends a message to every other agent
      for (const [fromName, fromNode] of this.agents) {
        for (const [toName, toNode] of this.agents) {
          if (fromName === toName) continue;

          const message = `Test message from ${fromName} to ${toName}`;
          await fromNode.sendMessage(toNode.getAddress(), message);
          result.messagesSent++;
        }
      }

      // Wait for messages to be received (adjust timeout as needed)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify messages
      const expectedMessages = this.agents.size * (this.agents.size - 1);
      result.messagesReceived = this.messageLog.length;

      if (result.messagesReceived !== expectedMessages) {
        throw new Error(
          `Expected ${expectedMessages} messages, but received ${result.messagesReceived}`
        );
      }
    } catch (error) {
      result.success = false;
      result.error = error as Error;
    }

    result.endTime = Date.now();
    this.results.set("message-test", result);
    return result;
  }

  generateSummary(): TestSummary {
    const summary: TestSummary = {
      totalTests: this.results.size,
      passedTests: 0,
      failedTests: 0,
      results: this.results,
      duration: 0,
    };

    for (const result of this.results.values()) {
      if (result.success) {
        summary.passedTests++;
      } else {
        summary.failedTests++;
      }
      summary.duration += result.endTime - result.startTime;
    }

    return summary;
  }

  async cleanup() {
    // Stop all agents
    for (const agent of this.agents.values()) {
      await agent.stop();
    }
    this.agents.clear();

    // Stop bootstrap nodes
    for (const node of this.bootstrapNodes) {
      await node.stop();
    }
    this.bootstrapNodes = [];

    // Clear test data
    this.messageLog = [];
    this.results.clear();
  }
}
