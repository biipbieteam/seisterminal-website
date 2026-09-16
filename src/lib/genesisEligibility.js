import {
    supabase,
  } from "./supabase";
  
  
  export async function getGenesisEligibility(
    address
  ) {
    if (!address) {
      return {
        ogEligible: false,
        fcfsEligible: false,
        ogProof: [],
        fcfsProof: [],
      };
    }
  
  
    const wallet =
      address.toLowerCase();
  
  
    const [
      ogResult,
      fcfsResult,
    ] =
      await Promise.all([
        supabase
          .from("genesis_og_whitelist")
          .select("address,proof")
          .eq("address", wallet)
          .maybeSingle(),
  
        supabase
          .from("genesis_fcfs_whitelist")
          .select("address,proof")
          .eq("address", wallet)
          .maybeSingle(),
      ]);
  
  
    if (ogResult.error) {
      throw new Error(
        `OG eligibility query failed: ${ogResult.error.message}`
      );
    }
  
  
    if (fcfsResult.error) {
      throw new Error(
        `FCFS eligibility query failed: ${fcfsResult.error.message}`
      );
    }
  
  
    const ogEntry =
      ogResult.data;
  
    const fcfsEntry =
      fcfsResult.data;
  
  
    const ogProof =
      Array.isArray(
        ogEntry?.proof
      )
        ? ogEntry.proof
        : [];
  
  
    const fcfsProof =
      Array.isArray(
        fcfsEntry?.proof
      )
        ? fcfsEntry.proof
        : [];
  
  
    return {
  
      ogEligible:
        !!ogEntry &&
        Array.isArray(
          ogEntry.proof
        ),
  
      fcfsEligible:
        !!fcfsEntry &&
        Array.isArray(
          fcfsEntry.proof
        ),
  
      ogProof,
  
      fcfsProof,
    };
  }


  export async function getGenesisWhitelistCounts() {
    const [
      ogResult,
      fcfsResult,
    ] = await Promise.all([
      supabase
        .from("genesis_og_whitelist")
        .select("*", {
          count: "exact",
          head: true,
        }),
  
      supabase
        .from("genesis_fcfs_whitelist")
        .select("*", {
          count: "exact",
          head: true,
        }),
    ]);
  
    if (ogResult.error) {
      throw ogResult.error;
    }
  
    if (fcfsResult.error) {
      throw fcfsResult.error;
    }
  
    return {
      og: ogResult.count ?? 0,
      fcfs: fcfsResult.count ?? 0,
    };
  }