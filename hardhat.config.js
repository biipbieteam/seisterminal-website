import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "dotenv/config";

const ARC_TESTNET_RPC_URL =
  process.env.ARC_TESTNET_RPC_URL ||
  "https://rpc.testnet.arc.network";

const ARC_MAINNET_RPC_URL =
  process.env.ARC_MAINNET_RPC_URL ||
  "https://rpc.mainnet.arc.io";

const DEPLOYER_PRIVATE_KEY =
  process.env.DEPLOYER_PRIVATE_KEY;

export default {
  plugins: [
    hardhatToolboxMochaEthersPlugin,
  ],

  solidity: {
    version: "0.8.24",

    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    arcTestnet: {
      type: "http",
      chainType: "l1",
      url: ARC_TESTNET_RPC_URL,
      chainId: 5042002,

      accounts:
        DEPLOYER_PRIVATE_KEY
          ? [DEPLOYER_PRIVATE_KEY]
          : [],
    },

    arcMainnet: {
      type: "http",
      chainType: "l1",
      url: ARC_MAINNET_RPC_URL,
      chainId: 5042,

      accounts:
        DEPLOYER_PRIVATE_KEY
          ? [DEPLOYER_PRIVATE_KEY]
          : [],
    },
  },
};