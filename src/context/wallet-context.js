import { createContext, useContext } from "react";

export const WalletContext =
  createContext(null);

export function useWallet() {
  const context =
    useContext(WalletContext);

  if (!context) {
    throw new Error(
      "useWallet must be used inside WalletProvider"
    );
  }

  return context;
}