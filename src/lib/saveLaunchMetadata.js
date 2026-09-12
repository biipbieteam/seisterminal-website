import { supabase } from "./supabase";

const ARC_TESTNET_CHAIN_ID = 5042002;

/*
 * --------------------------------------------------
 * TOKEN LOGO OPTIMIZATION
 * --------------------------------------------------
 *
 * Market logos are rendered at a very small size.
 * Never upload the original multi-MB image when a
 * small optimized WEBP is sufficient.
 */

const TOKEN_LOGO_SIZE = 128;
const TOKEN_LOGO_WEBP_QUALITY = 0.82;

async function optimizeTokenLogo(file) {
  if (!(file instanceof File)) {
    return null;
  }

  const objectUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await loadImage(objectUrl);

    const canvas =
      document.createElement("canvas");

    canvas.width =
      TOKEN_LOGO_SIZE;

    canvas.height =
      TOKEN_LOGO_SIZE;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to create logo canvas.",
      );
    }

    /*
     * Preserve the entire image and its
     * aspect ratio instead of cropping it.
     */

    const scale =
      Math.min(
        TOKEN_LOGO_SIZE /
          image.naturalWidth,

        TOKEN_LOGO_SIZE /
          image.naturalHeight,
      );

    const drawWidth =
      Math.max(
        1,
        Math.round(
          image.naturalWidth *
            scale,
        ),
      );

    const drawHeight =
      Math.max(
        1,
        Math.round(
          image.naturalHeight *
            scale,
        ),
      );

    const drawX =
      Math.round(
        (
          TOKEN_LOGO_SIZE -
          drawWidth
        ) / 2,
      );

    const drawY =
      Math.round(
        (
          TOKEN_LOGO_SIZE -
          drawHeight
        ) / 2,
      );

    context.clearRect(
      0,
      0,
      TOKEN_LOGO_SIZE,
      TOKEN_LOGO_SIZE,
    );

    context.drawImage(
      image,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    const blob =
      await canvasToWebp(
        canvas,
        TOKEN_LOGO_WEBP_QUALITY,
      );

    const optimizedName =
      createOptimizedLogoName(
        file.name,
      );

    return new File(
      [blob],
      optimizedName,
      {
        type: "image/webp",
        lastModified: Date.now(),
      },
    );
  } finally {
    URL.revokeObjectURL(
      objectUrl,
    );
  }
}

function loadImage(src) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const image =
        new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            "Unable to process token logo.",
          ),
        );
      };

      image.src = src;
    },
  );
}

function canvasToWebp(
  canvas,
  quality,
) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Unable to optimize token logo.",
              ),
            );

            return;
          }

          resolve(blob);
        },

        "image/webp",
        quality,
      );
    },
  );
}

function createOptimizedLogoName(
  originalName,
) {
  const baseName =
    String(
      originalName || "token-logo",
    )
      .replace(
        /\.[^/.]+$/,
        "",
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      )
      .slice(
        0,
        64,
      );

  return `${
    baseName || "token-logo"
  }.webp`;
}

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
    throw new Error(
      "Missing launch metadata.",
    );
  }

  const formData =
    new FormData();

  formData.append(
    "chainId",
    String(
      ARC_TESTNET_CHAIN_ID,
    ),
  );

  formData.append(
    "launchId",
    String(
      launchId,
    ),
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

  /*
   * --------------------------------------------------
   * OPTIMIZE LOGO BEFORE UPLOAD
   * --------------------------------------------------
   */

  if (
    logoFile instanceof File
  ) {
    const optimizedLogo =
      await optimizeTokenLogo(
        logoFile,
      );

    if (optimizedLogo) {
      formData.append(
        "logo",
        optimizedLogo,
      );
    }
  }

  const {
    data,
    error,
  } =
    await supabase
      .functions
      .invoke(
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