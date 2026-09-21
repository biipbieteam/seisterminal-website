const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

function formatTokenBalance(
  rawValue,
  decimals,
  maxFractionDigits = 6
) {
  const value = BigInt(rawValue || 0);
  const tokenDecimals = Number(decimals ?? 18);

  const base = 10n ** BigInt(tokenDecimals);
  const whole = value / base;
  const fraction = value % base;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionText = fraction
    .toString()
    .padStart(tokenDecimals, "0")
    .slice(0, maxFractionDigits)
    .replace(/0+$/, "");

  return fractionText
    ? `${whole}.${fractionText}`
    : whole.toString();
}

async function rpcRequest(
  rpcUrl,
  method,
  params
) {
  if (!rpcUrl) {
    throw new Error(
      "RPC URL is unavailable for this chain."
    );
  }

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const payload =
    await response.json().catch(() => null);

  if (!response.ok || payload?.error) {
    throw new Error(
      payload?.error?.message ||
        `RPC request failed (${response.status}).`
    );
  }

  if (payload?.result == null) {
    throw new Error(
      "RPC returned an invalid response."
    );
  }

  return payload.result;
}

function encodeBalanceOf(address) {
  const cleanAddress = String(address || "")
    .toLowerCase()
    .replace(/^0x/, "");

  if (!/^[0-9a-f]{40}$/.test(cleanAddress)) {
    throw new Error("Invalid wallet address.");
  }

  return (
    "0x70a08231" +
    cleanAddress.padStart(64, "0")
  );
}

export async function getRelayTokenBalance({
  rpcUrl,
  walletAddress,
  token,
}) {
  if (!walletAddress || !token) {
    return null;
  }

  const isNative =
    token.isNative ||
    String(token.address || "").toLowerCase() ===
      ZERO_ADDRESS;

  let rawBalance;

  if (isNative) {
    rawBalance = await rpcRequest(
      rpcUrl,
      "eth_getBalance",
      [walletAddress, "latest"]
    );
  } else {
    rawBalance = await rpcRequest(
      rpcUrl,
      "eth_call",
      [
        {
          to: token.address,
          data: encodeBalanceOf(walletAddress),
        },
        "latest",
      ]
    );
  }

  return formatTokenBalance(
    rawBalance,
    token.decimals
  );
}