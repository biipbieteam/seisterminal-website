import {
    BrowserProvider,
    Contract,
    Interface,
    isAddress,
  } from "ethers";
  
  import {
    GENESIS_CONTRACT_ADDRESS,
    ARC_MAINNET_CHAIN_ID,
  } from "./genesisReader.js";
  
  
  const GENESIS_WRITE_ABI = [
    "function teamMint(address to, uint256 quantity)",
    "function ogMint(uint256 quantity, bytes32[] proof) payable",
    "function fcfsMint(uint256 quantity, bytes32[] proof) payable",
    "function publicMint(uint256 quantity) payable",
  ];
  
  
  const genesisInterface =
    new Interface(
      GENESIS_WRITE_ABI
    );
  
  
  /*
   * -------------------------------------------------------
   * WALLET PREFLIGHT
   * -------------------------------------------------------
   */
  
  async function verifyWallet({
    eip1193Provider,
    expectedAddress,
  }) {
    if (
      !eip1193Provider ||
      typeof eip1193Provider.request !==
        "function"
    ) {
      throw new Error(
        "Wallet provider unavailable."
      );
    }
  
    /*
     * Read existing permission only.
     * Never request accounts here.
     */
    const accounts =
      await eip1193Provider.request({
        method: "eth_accounts",
      });
  
    const walletAddress =
      accounts?.[0];
  
    if (!walletAddress) {
      throw new Error(
        "Wallet is not connected."
      );
    }
  
    if (
      expectedAddress &&
      walletAddress.toLowerCase() !==
        expectedAddress.toLowerCase()
    ) {
      throw new Error(
        "Connected wallet account changed."
      );
    }
  
    /*
     * Read current chain directly
     * from the already selected wallet.
     */
    const rawChainId =
      await eip1193Provider.request({
        method: "eth_chainId",
      });
  
    const currentChainId =
      BigInt(rawChainId);
  
      if (
        currentChainId !==
        BigInt(ARC_MAINNET_CHAIN_ID)
      ) {
        throw new Error(
          "Switch wallet to ARC Mainnet before minting."
        );
      }
  
    return walletAddress;
  }
  
  
  /*
   * -------------------------------------------------------
   * TEAM MINT
   * -------------------------------------------------------
   */
  
  export async function mintGenesisTeam({
    eip1193Provider,
    expectedAddress,
    to,
    quantity = 1,
  }) {
    if (
      !to ||
      !isAddress(to)
    ) {
      throw new Error(
        "Invalid mint address."
      );
    }
  
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 55
    ) {
      throw new Error(
        "Invalid mint quantity."
      );
    }
  
    const walletAddress =
      await verifyWallet({
        eip1193Provider,
        expectedAddress,
      });
  
    /*
     * The provider comes from the wallet
     * already selected by the App.
     *
     * Do not read window.ethereum here.
     */
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const signer =
      await provider.getSigner(
        walletAddress
      );
  
    const contract =
      new Contract(
        GENESIS_CONTRACT_ADDRESS,
        GENESIS_WRITE_ABI,
        signer
      );
  
    /*
     * Build the exact transaction before
     * asking the wallet to submit it.
     */
    const txRequest =
      await contract
        .teamMint
        .populateTransaction(
          to,
          quantity
        );
  
    /*
     * Defensive recipient check.
     */
    if (
      !txRequest.to ||
      txRequest.to.toLowerCase() !==
        GENESIS_CONTRACT_ADDRESS.toLowerCase()
    ) {
      throw new Error(
        "Invalid Genesis transaction recipient."
      );
    }
  
    /*
     * Defensive calldata selector check.
     */
    const expectedSelector =
      genesisInterface
        .getFunction(
          "teamMint"
        )
        .selector;
  
    if (
      !txRequest.data ||
      !txRequest.data
        .toLowerCase()
        .startsWith(
          expectedSelector.toLowerCase()
        )
    ) {
      throw new Error(
        "Invalid Genesis transaction data."
      );
    }
  
    /*
     * Preflight.
     *
     * If the contract would revert,
     * stop before submitting the transaction.
     */
    const gasEstimate =
      await provider.estimateGas({
        ...txRequest,
        from: walletAddress,
      });
  
    if (gasEstimate <= 0n) {
      throw new Error(
        "Genesis mint preflight failed."
      );
    }
  
    /*
     * Add a small gas buffer.
     */
    txRequest.gasLimit =
      (
        gasEstimate *
        120n
      ) /
      100n;
  
    /*
     * ONE explicit wallet write request.
     */
    const tx =
      await signer.sendTransaction(
        txRequest
      );
  
    const receipt =
      await tx.wait();
  
    if (
      !receipt ||
      receipt.status !== 1
    ) {
      throw new Error(
        "Genesis mint transaction failed."
      );
    }
  
  
    return {
      receipt,
      txHash:
        tx.hash,
      transactionHash:
        tx.hash,
    };
  }

/*
 * -------------------------------------------------------
 * OG MINT
 * -------------------------------------------------------
 */

export async function mintGenesisOG({
    eip1193Provider,
    expectedAddress,
    quantity = 1,
    proof,
    price = 0n,
  }) {
    if (
      !Number.isInteger(quantity) ||
      quantity !== 1
    ) {
      throw new Error(
        "OG mint quantity must be 1."
      );
    }
  
    if (!Array.isArray(proof)) {
      throw new Error(
        "Invalid OG Merkle proof."
      );
    }
  
    if (
      typeof price !== "bigint" ||
      price < 0n
    ) {
      throw new Error(
        "Invalid OG mint price."
      );
    }
  
    const walletAddress =
      await verifyWallet({
        eip1193Provider,
        expectedAddress,
      });
  
    /*
     * Use only the wallet provider
     * already selected by the App.
     */
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const signer =
      await provider.getSigner(
        walletAddress
      );
  
    const contract =
      new Contract(
        GENESIS_CONTRACT_ADDRESS,
        GENESIS_WRITE_ABI,
        signer
      );
  
    /*
     * Native USDC value comes directly
     * from the on-chain Genesis price.
     */
    const value =
      price * BigInt(quantity);
  
    /*
     * Build exact OG transaction.
     */
    const txRequest =
      await contract
        .ogMint
        .populateTransaction(
          quantity,
          proof,
          {
            value,
          }
        );
  
    /*
     * Defensive recipient check.
     */
    if (
      !txRequest.to ||
      txRequest.to.toLowerCase() !==
        GENESIS_CONTRACT_ADDRESS.toLowerCase()
    ) {
      throw new Error(
        "Invalid Genesis transaction recipient."
      );
    }
  
    /*
     * Defensive calldata selector check.
     */
    const expectedSelector =
      genesisInterface
        .getFunction(
          "ogMint"
        )
        .selector;
  
    if (
      !txRequest.data ||
      !txRequest.data
        .toLowerCase()
        .startsWith(
          expectedSelector.toLowerCase()
        )
    ) {
      throw new Error(
        "Invalid Genesis transaction data."
      );
    }
  
    /*
     * Defensive native value check.
     */
    if (
      BigInt(txRequest.value ?? 0n) !==
      value
    ) {
      throw new Error(
        "Invalid Genesis transaction value."
      );
    }
  
    /*
     * Contract preflight.
     */
    const gasEstimate =
      await provider.estimateGas({
        ...txRequest,
        from: walletAddress,
      });
  
    if (gasEstimate <= 0n) {
      throw new Error(
        "Genesis mint preflight failed."
      );
    }
  
    txRequest.gasLimit =
      (
        gasEstimate *
        120n
      ) /
      100n;
  
    /*
     * ONE explicit wallet write request.
     */
    const tx =
      await signer.sendTransaction(
        txRequest
      );
  
  
    const receipt =
      await tx.wait();
  
    if (
      !receipt ||
      receipt.status !== 1
    ) {
      throw new Error(
        "Genesis OG mint transaction failed."
      );
    }
  
  
    return {
      receipt,
      txHash:
        tx.hash,
      transactionHash:
        tx.hash,
    };
}

/*
 * -------------------------------------------------------
 * FCFS MINT
 * -------------------------------------------------------
 */

export async function mintGenesisFCFS({
    eip1193Provider,
    expectedAddress,
    quantity = 1,
    proof,
    price,
  }) {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 2
    ) {
      throw new Error(
        "FCFS mint quantity must be between 1 and 2."
      );
    }
  
    if (!Array.isArray(proof)) {
      throw new Error(
        "Invalid FCFS Merkle proof."
      );
    }
  
    if (
      typeof price !== "bigint" ||
      price < 0n
    ) {
      throw new Error(
        "Invalid FCFS mint price."
      );
    }
  
    const walletAddress =
      await verifyWallet({
        eip1193Provider,
        expectedAddress,
      });
  
    /*
     * Use only the wallet provider
     * already selected by the App.
     */
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const signer =
      await provider.getSigner(
        walletAddress
      );
  
    const contract =
      new Contract(
        GENESIS_CONTRACT_ADDRESS,
        GENESIS_WRITE_ABI,
        signer
      );
  
    /*
     * Arc native USDC uses the native
     * transaction value path.
     *
     * price is the exact uint256 read
     * from fcfsPrice() on the contract.
     */
    const value =
      price * BigInt(quantity);
  
    /*
     * Build exact FCFS transaction.
     */
    const txRequest =
      await contract
        .fcfsMint
        .populateTransaction(
          quantity,
          proof,
          {
            value,
          }
        );
  
    /*
     * Defensive recipient check.
     */
    if (
      !txRequest.to ||
      txRequest.to.toLowerCase() !==
        GENESIS_CONTRACT_ADDRESS.toLowerCase()
    ) {
      throw new Error(
        "Invalid Genesis transaction recipient."
      );
    }
  
    /*
     * Defensive calldata selector check.
     */
    const expectedSelector =
      genesisInterface
        .getFunction(
          "fcfsMint"
        )
        .selector;
  
    if (
      !txRequest.data ||
      !txRequest.data
        .toLowerCase()
        .startsWith(
          expectedSelector.toLowerCase()
        )
    ) {
      throw new Error(
        "Invalid Genesis transaction data."
      );
    }
  
    /*
     * Defensive payment check.
     *
     * For current on-chain price:
     * quantity 1 = 5.55 USDC
     * quantity 2 = 11.10 USDC
     */
    if (
      BigInt(
        txRequest.value ?? 0n
      ) !== value
    ) {
      throw new Error(
        "Invalid Genesis FCFS transaction value."
      );
    }
  
    /*
     * Contract preflight.
     *
     * This also catches invalid proof,
     * phase closed, wallet limit,
     * insufficient payment, etc.
     * before submitting.
     */
    const gasEstimate =
      await provider.estimateGas({
        ...txRequest,
        from: walletAddress,
      });
  
    if (gasEstimate <= 0n) {
      throw new Error(
        "Genesis FCFS mint preflight failed."
      );
    }
  
    /*
     * Add the same 20% gas buffer
     * already validated by TEAM / OG.
     */
    txRequest.gasLimit =
      (
        gasEstimate *
        120n
      ) /
      100n;
  
    /*
     * ONE explicit wallet write request.
     */
    const tx =
      await signer.sendTransaction(
        txRequest
      );
  
  
    const receipt =
      await tx.wait();
  
    if (
      !receipt ||
      receipt.status !== 1
    ) {
      throw new Error(
        "Genesis FCFS mint transaction failed."
      );
    }
  
  
    return {
      receipt,
      txHash:
        tx.hash,
      transactionHash:
        tx.hash,
    };
}

/*
 * -------------------------------------------------------
 * PUBLIC MINT
 * -------------------------------------------------------
 */

export async function mintGenesisPublic({
    eip1193Provider,
    expectedAddress,
    quantity = 1,
    price,
  }) {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 2
    ) {
      throw new Error(
        "Public mint quantity must be between 1 and 2."
      );
    }
  
    if (
      typeof price !== "bigint" ||
      price < 0n
    ) {
      throw new Error(
        "Invalid Public mint price."
      );
    }
  
    const walletAddress =
      await verifyWallet({
        eip1193Provider,
        expectedAddress,
      });
  
    /*
     * Use only the wallet provider
     * already selected by the App.
     */
    const provider =
      new BrowserProvider(
        eip1193Provider
      );
  
    const signer =
      await provider.getSigner(
        walletAddress
      );
  
    const contract =
      new Contract(
        GENESIS_CONTRACT_ADDRESS,
        GENESIS_WRITE_ABI,
        signer
      );
  
    /*
     * Exact native USDC value read
     * from publicPrice() on-chain.
     */
    const value =
      price * BigInt(quantity);
  
    /*
     * Public mint has no Merkle proof.
     */
    const txRequest =
      await contract
        .publicMint
        .populateTransaction(
          quantity,
          {
            value,
          }
        );
  
    /*
     * Defensive recipient check.
     */
    if (
      !txRequest.to ||
      txRequest.to.toLowerCase() !==
        GENESIS_CONTRACT_ADDRESS.toLowerCase()
    ) {
      throw new Error(
        "Invalid Genesis transaction recipient."
      );
    }
  
    /*
     * Defensive calldata selector check.
     */
    const expectedSelector =
      genesisInterface
        .getFunction(
          "publicMint"
        )
        .selector;
  
    if (
      !txRequest.data ||
      !txRequest.data
        .toLowerCase()
        .startsWith(
          expectedSelector.toLowerCase()
        )
    ) {
      throw new Error(
        "Invalid Genesis transaction data."
      );
    }
  
    /*
     * Defensive native payment check.
     */
    if (
      BigInt(
        txRequest.value ?? 0n
      ) !== value
    ) {
      throw new Error(
        "Invalid Genesis Public transaction value."
      );
    }
  
    /*
     * Contract preflight.
     */
    const gasEstimate =
      await provider.estimateGas({
        ...txRequest,
        from: walletAddress,
      });
  
    if (gasEstimate <= 0n) {
      throw new Error(
        "Genesis Public mint preflight failed."
      );
    }
  
    /*
     * Same 20% gas buffer already
     * validated by TEAM / OG / FCFS.
     */
    txRequest.gasLimit =
      (
        gasEstimate *
        120n
      ) /
      100n;
  
    /*
     * ONE explicit wallet write request.
     */
    const tx =
      await signer.sendTransaction(
        txRequest
      );
  
  
    const receipt =
      await tx.wait();
  
    if (
      !receipt ||
      receipt.status !== 1
    ) {
      throw new Error(
        "Genesis Public mint transaction failed."
      );
    }
  
  
    return {
      receipt,
      txHash:
        tx.hash,
      transactionHash:
        tx.hash,
    };
}