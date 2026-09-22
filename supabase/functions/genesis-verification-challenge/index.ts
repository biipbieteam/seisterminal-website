import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";


const ARC_CHAIN_ID = 5042;

const VERIFY_DOMAIN =
  "seisterminal.xyz";

const VERIFY_PURPOSE =
  "SEIS TERMINAL Genesis Holder Verification";


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


    if (
      !supabaseUrl ||
      !serviceRoleKey
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


    const body =
      await req.json();


    const session =
      String(
        body?.session ?? "",
      ).trim();


    const walletAddress =
      String(
        body?.walletAddress ?? "",
      ).trim();


    /*
     * --------------------------------------------------
     * BASIC INPUT VALIDATION
     * --------------------------------------------------
     */

    if (
      !/^[a-fA-F0-9]{64}$/.test(
        session,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid verification session.",
        },
        400,
      );
    }


    if (
      !isAddress(
        walletAddress,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid wallet address.",
        },
        400,
      );
    }


    /*
     * --------------------------------------------------
     * HASH RAW SESSION TOKEN
     *
     * The raw token is never stored in Supabase.
     * --------------------------------------------------
     */

    const tokenHash =
      await sha256Hex(
        session,
      );


    /*
     * --------------------------------------------------
     * LOAD VERIFICATION SESSION
     * --------------------------------------------------
     */

    const {
      data:
        verificationSession,

      error:
        sessionError,
    } =
      await supabase
        .from(
          "genesis_verification_sessions",
        )
        .select(
          [
            "id",
            "discord_user_id",
            "guild_id",
            "expires_at",
            "used_at",
          ].join(","),
        )
        .eq(
          "token_hash",
          tokenHash,
        )
        .maybeSingle();


    if (
      sessionError
    ) {
      console.error(
        "genesis-verification-challenge session lookup:",
        sessionError,
      );

      throw new Error(
        "Unable to validate verification session.",
      );
    }


    if (
      !verificationSession
    ) {
      return jsonResponse(
        {
          error:
            "Verification session not found.",
        },
        404,
      );
    }


    if (
      verificationSession.used_at
    ) {
      return jsonResponse(
        {
          error:
            "Verification session has already been used.",
        },
        409,
      );
    }


    const expiresAt =
      new Date(
        verificationSession.expires_at,
      );


    if (
      Number.isNaN(
        expiresAt.getTime(),
      ) ||
      expiresAt.getTime() <=
        Date.now()
    ) {
      return jsonResponse(
        {
          error:
            "Verification session has expired.",
        },
        410,
      );
    }


    /*
     * --------------------------------------------------
     * BUILD DETERMINISTIC SIGNATURE CHALLENGE
     *
     * Important:
     * - binds the signature to SEIS TERMINAL
     * - binds it to this Discord verification session
     * - binds it to this wallet
     * - binds it to Arc Mainnet
     * - binds it to the server-side session expiry
     *
     * Discord user ID / guild ID are deliberately not
     * exposed to the browser.
     * --------------------------------------------------
     */

    const normalizedAddress =
      walletAddress.toLowerCase();


    const message =
      [
        VERIFY_PURPOSE,
        "",
        `Domain: ${VERIFY_DOMAIN}`,
        `Wallet: ${normalizedAddress}`,
        `Chain ID: ${ARC_CHAIN_ID}`,
        `Session: ${tokenHash}`,
        `Expires At: ${expiresAt.toISOString()}`,
        "",
        "Sign this message to prove ownership of this wallet.",
        "This request does not create a blockchain transaction.",
      ].join(
        "\n",
      );


    return jsonResponse(
      {
        success: true,

        challenge: {
          message,

          walletAddress:
            normalizedAddress,

          chainId:
            ARC_CHAIN_ID,

          expiresAt:
            expiresAt.toISOString(),
        },
      },
      200,
    );

  } catch (error) {

    console.error(
      "genesis-verification-challenge:",
      error,
    );


    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create verification challenge.",
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


async function sha256Hex(
  value: string,
) {

  const encoded =
    new TextEncoder()
      .encode(
        value,
      );


  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      encoded,
    );


  return Array.from(
    new Uint8Array(
      digest,
    ),
  )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
    )
    .join("");
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