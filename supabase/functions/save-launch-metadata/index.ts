import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";

import {
  Interface,
  JsonRpcProvider,
} from "https://esm.sh/ethers@6.15.0";

const ARC_CHAIN_ID = 5042n;

const LAUNCH_FACTORY_ADDRESS =
  "0x56FC882244f8FB1d05C2171d180872B38800706F";

  const LAUNCH_FACTORY_ABI = [
    "function launchFairToken(string name_, string symbol_) payable returns (uint256 launchId, address tokenAddress)",
  
    "event FairLaunchCreated(uint256 indexed launchId, address indexed token, address indexed creator, uint256 totalSupply, uint256 bondingSupply, uint256 liquiditySupply)",
  ];

const launchInterface =
  new Interface(
    LAUNCH_FACTORY_ABI,
  );

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "*",

  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};


Deno.serve(async (req) => {
  if (
    req.method ===
    "OPTIONS"
  ) {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      },
    );
  }

  if (
    req.method !==
    "POST"
  ) {
    return jsonResponse(
      {
        error:
          "Method not allowed.",
      },
      405,
    );
  }


  try {
    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const rpcUrl =
      Deno.env.get(
        "ARC_MAINNET_RPC_URL",
      );


    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !rpcUrl
    ) {
      throw new Error(
        "Server configuration unavailable.",
      );
    }


    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        },
      );


    const provider =
      new JsonRpcProvider(
        rpcUrl,
        ARC_CHAIN_ID,
        {
          staticNetwork:
            true,
        },
      );


    const formData =
      await req.formData();


    const chainId =
      BigInt(
        String(
          formData.get(
            "chainId",
          ) ?? "0",
        ),
      );


    const launchIdRaw =
      String(
        formData.get(
          "launchId",
        ) ?? "",
      ).trim();


    const tokenAddress =
      String(
        formData.get(
          "tokenAddress",
        ) ?? "",
      ).trim();


    const creatorAddress =
      String(
        formData.get(
          "creatorAddress",
        ) ?? "",
      ).trim();


    const tokenName =
      String(
        formData.get(
          "tokenName",
        ) ?? "",
      ).trim();


    const tokenSymbol =
      String(
        formData.get(
          "tokenSymbol",
        ) ?? "",
      ).trim();


    const transactionHash =
      String(
        formData.get(
          "transactionHash",
        ) ?? "",
      ).trim();


    const logo =
      formData.get(
        "logo",
      );


    /*
     * --------------------------------------------------
     * BASIC INPUT VALIDATION
     * --------------------------------------------------
     */

    if (
      chainId !==
      ARC_CHAIN_ID
    ) {
      return jsonResponse(
        {
          error:
            "Invalid chain.",
        },
        400,
      );
    }


    if (
      !/^\d+$/.test(
        launchIdRaw,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid launch ID.",
        },
        400,
      );
    }


    if (
      !isAddress(
        tokenAddress,
      ) ||
      !isAddress(
        creatorAddress,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid address.",
        },
        400,
      );
    }


    if (
      !/^0x[a-fA-F0-9]{64}$/.test(
        transactionHash,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid transaction hash.",
        },
        400,
      );
    }


    if (
      !tokenName ||
      new TextEncoder()
        .encode(
          tokenName,
        ).length >
        32
    ) {
      return jsonResponse(
        {
          error:
            "Invalid token name.",
        },
        400,
      );
    }


    if (
      !tokenSymbol ||
      new TextEncoder()
        .encode(
          tokenSymbol,
        ).length >
        10
    ) {
      return jsonResponse(
        {
          error:
            "Invalid token symbol.",
        },
        400,
      );
    }


    /*
     * --------------------------------------------------
     * VERIFY TRANSACTION
     * --------------------------------------------------
     */

    const tx =
      await provider
        .getTransaction(
          transactionHash,
        );


    if (!tx) {
      return jsonResponse(
        {
          error:
            "Launch transaction not found.",
        },
        400,
      );
    }


    if (
      !tx.to ||
      tx.to.toLowerCase() !==
        LAUNCH_FACTORY_ADDRESS
          .toLowerCase()
    ) {
      return jsonResponse(
        {
          error:
            "Transaction did not call the official LaunchFactory.",
        },
        400,
      );
    }


    if (
      !tx.from ||
      tx.from.toLowerCase() !==
        creatorAddress
          .toLowerCase()
    ) {
      return jsonResponse(
        {
          error:
            "Creator does not match transaction sender.",
        },
        400,
      );
    }

    /*
 * --------------------------------------------------
 * VERIFY LAUNCH CALLDATA
 * --------------------------------------------------
 */

let decodedLaunch;

try {
  decodedLaunch =
    launchInterface.parseTransaction({
      data: tx.data,
      value: tx.value,
    });
} catch {
  return jsonResponse(
    {
      error:
        "Unable to decode launch transaction.",
    },
    400,
  );
}

if (
  !decodedLaunch ||
  decodedLaunch.name !==
    "launchFairToken"
) {
  return jsonResponse(
    {
      error:
        "Transaction is not a Fair Launch creation.",
    },
    400,
  );
}

const onChainName =
  String(
    decodedLaunch.args.name_,
  );

const onChainSymbol =
  String(
    decodedLaunch.args.symbol_,
  );

if (
  onChainName !==
  tokenName
) {
  return jsonResponse(
    {
      error:
        "Token name does not match launch transaction.",
    },
    400,
  );
}

if (
  onChainSymbol !==
  tokenSymbol
) {
  return jsonResponse(
    {
      error:
        "Token symbol does not match launch transaction.",
    },
    400,
  );
}


    const receipt =
      await provider
        .getTransactionReceipt(
          transactionHash,
        );


    if (
      !receipt ||
      receipt.status !== 1
    ) {
      return jsonResponse(
        {
          error:
            "Launch transaction is not confirmed successfully.",
        },
        400,
      );
    }


    /*
     * --------------------------------------------------
     * VERIFY FairLaunchCreated EVENT
     * --------------------------------------------------
     */

    let verifiedLaunchId:
      bigint | null =
      null;

    let verifiedToken:
      string | null =
      null;

    let verifiedCreator:
      string | null =
      null;


    for (
      const log of
        receipt.logs
    ) {
      if (
        log.address.toLowerCase() !==
          LAUNCH_FACTORY_ADDRESS
            .toLowerCase()
      ) {
        continue;
      }


      try {
        const parsed =
          launchInterface
            .parseLog(
              log,
            );


        if (
          parsed?.name ===
          "FairLaunchCreated"
        ) {
          verifiedLaunchId =
            parsed.args
              .launchId;

          verifiedToken =
            parsed.args
              .token;

          verifiedCreator =
            parsed.args
              .creator;

          break;
        }
      } catch {
        // Ignore unrelated Factory logs.
      }
    }


    if (
      verifiedLaunchId ===
        null ||
      !verifiedToken ||
      !verifiedCreator
    ) {
      return jsonResponse(
        {
          error:
            "FairLaunchCreated event not found.",
        },
        400,
      );
    }


    const launchId =
      BigInt(
        launchIdRaw,
      );


    if (
      verifiedLaunchId !==
      launchId
    ) {
      return jsonResponse(
        {
          error:
            "Launch ID does not match transaction.",
        },
        400,
      );
    }


    if (
      verifiedToken
        .toLowerCase() !==
      tokenAddress
        .toLowerCase()
    ) {
      return jsonResponse(
        {
          error:
            "Token address does not match transaction.",
        },
        400,
      );
    }


    if (
      verifiedCreator
        .toLowerCase() !==
      creatorAddress
        .toLowerCase()
    ) {
      return jsonResponse(
        {
          error:
            "Creator does not match launch event.",
        },
        400,
      );
    }


    /*
     * --------------------------------------------------
     * LOGO VALIDATION + UPLOAD
     * --------------------------------------------------
     */

    let logoPath:
      string | null =
      null;


    if (
      logo instanceof File &&
      logo.size > 0
    ) {
      const allowedTypes =
        new Set([
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/gif",
        ]);


      if (
        !allowedTypes.has(
          logo.type,
        )
      ) {
        return jsonResponse(
          {
            error:
              "Unsupported logo type.",
          },
          400,
        );
      }


      if (
        logo.size >
        2 * 1024 * 1024
      ) {
        return jsonResponse(
          {
            error:
              "Logo exceeds 2 MB.",
          },
          400,
        );
      }


      const extension =
        getExtension(
          logo.type,
        );


      logoPath =
        `arc-mainnet/${tokenAddress.toLowerCase()}.${extension}`;


      const bytes =
        await logo
          .arrayBuffer();


      const {
        error:
          uploadError,
      } =
        await supabase
          .storage
          .from(
            "token-logos",
          )
          .upload(
            logoPath,
            bytes,
            {
              contentType:
                logo.type,

              upsert:
                false,
            },
          );


      if (
        uploadError
      ) {
        throw new Error(
          `Logo upload failed: ${uploadError.message}`,
        );
      }
    }


    /*
     * --------------------------------------------------
     * INSERT METADATA
     * --------------------------------------------------
     */

    const {
      data,
      error:
        insertError,
    } =
      await supabase
        .from(
          "launch_tokens",
        )
        .insert({
          chain_id:
            Number(
              ARC_CHAIN_ID,
            ),

          launch_id:
            launchIdRaw,

          token_address:
            tokenAddress
              .toLowerCase(),

          creator_address:
            creatorAddress
              .toLowerCase(),

          token_name:
            tokenName,

          token_symbol:
            tokenSymbol,

          logo_path:
            logoPath,

          transaction_hash:
            transactionHash
              .toLowerCase(),
        })
        .select()
        .single();


    if (
      insertError
    ) {
      /*
       * Avoid orphaned Storage file
       * when DB insert fails.
       */

      if (
        logoPath
      ) {
        await supabase
          .storage
          .from(
            "token-logos",
          )
          .remove([
            logoPath,
          ]);
      }


      throw new Error(
        `Metadata insert failed: ${insertError.message}`,
      );
    }


    return jsonResponse(
      {
        success:
          true,

        metadata:
          data,
      },
      200,
    );
  } catch (error) {
    console.error(
      "save-launch-metadata:",
      error,
    );


    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save launch metadata.",
      },
      500,
    );
  }
});


function isAddress(
  value: string,
) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    value,
  );
}


function getExtension(
  mimeType: string,
) {
  switch (
    mimeType
  ) {
    case "image/png":
      return "png";

    case "image/jpeg":
      return "jpg";

    case "image/webp":
      return "webp";

    case "image/gif":
      return "gif";

    default:
      throw new Error(
        "Unsupported logo type.",
      );
  }
}


function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status,

      headers: {
        ...corsHeaders,

        "Content-Type":
          "application/json",
      },
    },
  );
}