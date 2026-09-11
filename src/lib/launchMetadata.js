import {
    supabase,
  } from "./supabase.js";
  
  export async function getLaunchMetadata() {
    const {
      data,
      error,
    } = await supabase
      .from("launch_tokens")
      .select(
        `
          chain_id,
          launch_id,
          token_address,
          creator_address,
          token_name,
          token_symbol,
          logo_path,
          transaction_hash,
          created_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );
  
    if (error) {
      throw new Error(
        `Unable to read launch metadata: ${error.message}`
      );
    }
  
    return (data || []).map(
      (item) => {
        let logoUrl = null;
  
        if (item.logo_path) {
          const {
            data: publicUrlData,
          } = supabase
            .storage
            .from("token-logos")
            .getPublicUrl(
              item.logo_path
            );
  
          logoUrl =
            publicUrlData?.publicUrl ||
            null;
        }
  
        return {
          ...item,
          logoUrl,
        };
      }
    );
  }