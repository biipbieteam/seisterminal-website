import { supabase } from "./supabase";

const ARC_TESTNET_CHAIN_ID = 5042002;

export async function saveLaunchMetadata({
  launchId,
  tokenAddress,
  creatorAddress,
  tokenName,
  tokenSymbol,
  transactionHash,
  logoFile = null,
}) {
  if (
    launchId === undefined ||
    launchId === null ||
    !tokenAddress ||
    !creatorAddress ||
    !tokenName ||
    !tokenSymbol ||
    !transactionHash
  ) {
    throw new Error("Missing launch metadata.");
  }

  const formData = new FormData();

  formData.append(
    "chainId",
    String(ARC_TESTNET_CHAIN_ID),
  );

  formData.append(
    "launchId",
    String(launchId),
  );

  formData.append(
    "tokenAddress",
    tokenAddress,
  );

  formData.append(
    "creatorAddress",
    creatorAddress,
  );

  formData.append(
    "tokenName",
    tokenName,
  );

  formData.append(
    "tokenSymbol",
    tokenSymbol,
  );

  formData.append(
    "transactionHash",
    transactionHash,
  );

  if (logoFile instanceof File) {
    formData.append(
      "logo",
      logoFile,
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    "save-launch-metadata",
    {
      body: formData,
    },
  );

  if (error) {
    throw new Error(
      error.message ||
        "Failed to save launch metadata.",
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        "Launch metadata was not saved.",
    );
  }

  return data.metadata;
}