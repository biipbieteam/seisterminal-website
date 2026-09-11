import {
    supabase,
  } from "./supabase.js";
  
  export async function saveTradeEvent({
    transactionHash,
    launchId,
    tokenAddress,
    traderAddress,
  }) {
    if (
      !transactionHash ||
      launchId === undefined ||
      launchId === null ||
      !tokenAddress ||
      !traderAddress
    ) {
      throw new Error(
        "Missing trade event data."
      );
    }
  
    const {
      data,
      error,
    } =
      await supabase
        .functions
        .invoke(
          "save-trade-event",
          {
            body: {
              transactionHash,
              launchId:
                String(
                  launchId
                ),
              tokenAddress,
              traderAddress,
            },
          }
        );
  
    if (error) {
      throw new Error(
        error.message ||
          "Failed to save trade event."
      );
    }
  
    if (!data?.success) {
      throw new Error(
        data?.error ||
          "Trade event was not saved."
      );
    }
  
    return data.trade;
  }