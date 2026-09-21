const RELAY_API_URL = "https://api.relay.link";

export async function getRelayQuote({
  user,
  originChainId,
  destinationChainId,
  originCurrency,
  destinationCurrency,
  amount,
  recipient = user,
  slippageTolerance,
}) {
  if (!user) {
    throw new Error("Wallet address is required.");
  }

  if (!originChainId || !destinationChainId) {
    throw new Error("Origin and destination chains are required.");
  }

  if (!originCurrency || !destinationCurrency) {
    throw new Error("Origin and destination currencies are required.");
  }

  if (!amount || BigInt(amount) <= 0n) {
    throw new Error("Swap amount must be greater than zero.");
  }

  if (
    slippageTolerance !== undefined &&
    !/^\d+$/.test(String(slippageTolerance))
  ) {
    throw new Error(
      "Slippage tolerance must be an integer basis-point value."
    );
  }

  const requestBody = {
    user,
    recipient,
    originChainId,
    destinationChainId,
    originCurrency,
    destinationCurrency,
    amount: String(amount),
    tradeType: "EXACT_INPUT",
  };
  
  if (slippageTolerance !== undefined) {
    requestBody.slippageTolerance =
      String(slippageTolerance);
  }

  const response = await fetch(
    `${RELAY_API_URL}/quote`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      payload?.error ||
      `Relay quote failed (${response.status}).`;

    throw new Error(
      typeof message === "string"
        ? message
        : `Relay quote failed (${response.status}).`
    );
  }

  if (!payload?.details) {
    throw new Error("Relay returned an invalid quote.");
  }

  return payload;
}

export function getRelayQuoteSummary(quote) {
  const details = quote?.details;

  if (!details) {
    return null;
  }

  return {
    operation: details.operation || "",
    sender: details.sender || "",
    recipient: details.recipient || "",

    rate: details.rate || "",

    timeEstimate:
      details.timeEstimate ?? null,

    slippagePercent:
      details.slippageTolerance?.total
        ? Number(details.slippageTolerance.total) / 100
        : null,

    amountIn:
      details.currencyIn?.amount || "",

    amountInFormatted:
      details.currencyIn?.amountFormatted || "",

    amountInUsd:
      details.currencyIn?.amountUsd || "",

    amountOut:
      details.currencyOut?.amount || "",

    amountOutFormatted:
      details.currencyOut?.amountFormatted || "",

    amountOutUsd:
      details.currencyOut?.amountUsd || "",

    minimumAmountOut:
      details.currencyOut?.minimumAmount || "",

    requestId:
      quote?.steps?.[0]?.requestId || "",

    gasFeeFormatted:
      quote?.fees?.gas?.amountFormatted || "",
    
    gasFeeUsd:
      quote?.fees?.gas?.amountUsd || "",
    
    gasFeeSymbol:
      quote?.fees?.gas?.currency?.symbol || "",
    
    relayerFeeUsd:
      quote?.fees?.relayer?.amountUsd || "",
    
    appFeeUsd:
      quote?.fees?.app?.amountUsd || "",
  };
}

export function getRelayExecutionItem(quote) {
  const steps = Array.isArray(quote?.steps)
    ? quote.steps
    : [];

  for (const step of steps) {
    const items = Array.isArray(step?.items)
      ? step.items
      : [];

    for (const item of items) {
      if (
        item?.status === "incomplete" &&
        item?.data?.to &&
        item?.data?.chainId
      ) {
        return {
          stepId: step.id || "",
          kind: step.kind || "",
          requestId: step.requestId || "",
          transaction: item.data,
          check: item.check || null,
        };
      }
    }
  }

  return null;
}

export async function getRelayExecutionStatus(
    check
  ) {
    if (!check?.endpoint) {
      throw new Error(
        "Relay status endpoint is missing."
      );
    }
  
    const method =
      String(check.method || "GET").toUpperCase();
  
    if (method !== "GET") {
      throw new Error(
        `Unsupported Relay status method: ${method}`
      );
    }
  
    const endpoint =
      check.endpoint.startsWith("http")
        ? check.endpoint
        : `${RELAY_API_URL}${check.endpoint}`;
  
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  
    const payload =
      await response.json().catch(() => null);
  
    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error?.message ||
        payload?.error ||
        `Relay status failed (${response.status}).`;
  
      throw new Error(
        typeof message === "string"
          ? message
          : `Relay status failed (${response.status}).`
      );
    }
  
    return payload;
  }
  
  export async function waitForRelayExecution({
    check,
    intervalMs = 1000,
    timeoutMs = 120000,
    onStatus,
  }) {
    const startedAt = Date.now();
  
    while (Date.now() - startedAt < timeoutMs) {
      const result =
        await getRelayExecutionStatus(check);
  
      const status =
        String(result?.status || "").toLowerCase();
  
      onStatus?.(status, result);
  
      if (status === "success") {
        return result;
      }
  
      if (
        status === "failure" ||
        status === "refund" ||
        status === "refunded"
      ) {
        const error = new Error(
          `Relay execution ended with status: ${status}`
        );
  
        error.relayStatus = status;
        error.relayResult = result;
  
        throw error;
      }
  
      await new Promise((resolve) => {
        setTimeout(resolve, intervalMs);
      });
    }
  
    throw new Error(
      "Relay execution status timed out."
    );
}