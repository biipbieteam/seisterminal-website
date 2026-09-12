import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "token-logos";

const TARGET_SIZE = 128;
const WEBP_QUALITY = 82;

const APPLY =
  process.argv.includes("--apply");

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

function isLegacyLogoPath(path) {
  if (!path) {
    return false;
  }

  return /\.(png|jpe?g|gif)$/i.test(
    path,
  );
}

function toWebpPath(path) {
  return path.replace(
    /\.(png|jpe?g|gif)$/i,
    ".webp",
  );
}

async function loadLegacyRows() {
  const {
    data,
    error,
  } = await supabase
    .from("launch_tokens")
    .select(
      [
        "id",
        "launch_id",
        "token_symbol",
        "token_address",
        "logo_path",
      ].join(","),
    )
    .not(
      "logo_path",
      "is",
      null,
    )
    .order(
      "launch_id",
      {
        ascending: true,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load launch_tokens: ${error.message}`,
    );
  }

  return (
    data || []
  ).filter(
    (row) =>
      isLegacyLogoPath(
        row.logo_path,
      ),
  );
}

async function migrateLogo(row) {
  const oldPath =
    row.logo_path;

  const newPath =
    toWebpPath(
      oldPath,
    );

  console.log("");
  console.log(
    `[${row.launch_id}] ${row.token_symbol || "?"}`,
  );

  console.log(
    `  old: ${oldPath}`,
  );

  console.log(
    `  new: ${newPath}`,
  );

  if (!APPLY) {
    console.log(
      "  DRY RUN — no changes",
    );

    return {
      status: "dry-run",
    };
  }

  /*
   * 1. Download original.
   */

  const {
    data: originalFile,
    error: downloadError,
  } =
    await supabase
      .storage
      .from(BUCKET)
      .download(oldPath);

  if (
    downloadError ||
    !originalFile
  ) {
    throw new Error(
      `Download failed: ${
        downloadError?.message ||
        "file unavailable"
      }`,
    );
  }

  const originalBytes =
    Buffer.from(
      await originalFile.arrayBuffer(),
    );

  /*
   * 2. Convert to optimized WEBP.
   *
   * fit: "contain" preserves the entire logo.
   * Transparent padding is retained around
   * non-square images.
   */

  const optimizedBytes =
    await sharp(
      originalBytes,
      {
        animated: false,
      },
    )
      .resize(
        TARGET_SIZE,
        TARGET_SIZE,
        {
          fit: "contain",
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0,
          },
          withoutEnlargement:
            false,
        },
      )
      .webp({
        quality:
          WEBP_QUALITY,
      })
      .toBuffer();

  console.log(
    `  original: ${(
      originalBytes.length /
      1024
    ).toFixed(2)} KB`,
  );

  console.log(
    `  optimized: ${(
      optimizedBytes.length /
      1024
    ).toFixed(2)} KB`,
  );

  /*
   * 3. Upload NEW file first.
   *
   * Never delete the old file before
   * the new file exists.
   */

  const {
    error: uploadError,
  } =
    await supabase
      .storage
      .from(BUCKET)
      .upload(
        newPath,
        optimizedBytes,
        {
          contentType:
            "image/webp",

          upsert:
            false,

          cacheControl:
            "31536000",
        },
      );

  if (uploadError) {
    throw new Error(
      `WEBP upload failed: ${uploadError.message}`,
    );
  }

  /*
   * 4. Update DB only after upload succeeds.
   */

  const {
    data: updatedRow,
    error: updateError,
  } =
    await supabase
      .from("launch_tokens")
      .update({
        logo_path:
          newPath,
      })
      .eq(
        "id",
        row.id,
      )
      .eq(
        "logo_path",
        oldPath,
      )
      .select(
        "id, logo_path",
      )
      .single();

  if (
    updateError ||
    !updatedRow
  ) {
    /*
     * DB update failed.
     * Remove only the new WEBP.
     * Keep original untouched.
     */

    await supabase
      .storage
      .from(BUCKET)
      .remove([
        newPath,
      ]);

    throw new Error(
      `DB update failed: ${
        updateError?.message ||
        "row was not updated"
      }`,
    );
  }

  /*
   * 5. Verify DB points to WEBP.
   */

  if (
    updatedRow.logo_path !==
    newPath
  ) {
    throw new Error(
      "Database verification failed.",
    );
  }

  /*
   * 6. Only now remove original file.
   */

  const {
    error: removeError,
  } =
    await supabase
      .storage
      .from(BUCKET)
      .remove([
        oldPath,
      ]);

  if (removeError) {
    console.warn(
      `  WARNING: migrated successfully, but old file could not be removed: ${removeError.message}`,
    );
  }

  console.log(
    "  MIGRATED ✓",
  );

  return {
    status:
      "migrated",
  };
}

async function main() {
  console.log(
    "SEIS TERMINAL — Legacy Logo Optimization",
  );

  console.log(
    APPLY
      ? "MODE: APPLY"
      : "MODE: DRY RUN",
  );

  const rows =
    await loadLegacyRows();

  console.log("");
  console.log(
    `Legacy logos found: ${rows.length}`,
  );

  if (
    rows.length === 0
  ) {
    console.log(
      "Nothing to migrate.",
    );

    return;
  }

  let migrated = 0;
  let failed = 0;

  for (
    const row of rows
  ) {
    try {
      const result =
        await migrateLogo(
          row,
        );

      if (
        result.status ===
        "migrated"
      ) {
        migrated += 1;
      }
    } catch (error) {
      failed += 1;

      console.error(
        `  FAILED: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  console.log("");
  console.log(
    "--------------------------------",
  );

  console.log(
    `Total legacy logos: ${rows.length}`,
  );

  console.log(
    `Migrated: ${migrated}`,
  );

  console.log(
    `Failed: ${failed}`,
  );

  console.log(
    `Mode: ${
      APPLY
        ? "APPLY"
        : "DRY RUN"
    }`,
  );
}

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);