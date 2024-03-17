// --- React Methods
import React, { useMemo } from "react";

// --- Wallet connection utilities
import { Web3Provider } from "@ethersproject/providers";

import { isServerOnMaintenance } from "../utils/helpers";
import { onboard } from "../utils/onboard";

// --- Utils & configs
import { create } from "zustand";
import { WalletState } from "@web3-onboard/core/dist/types";
import { Eip1193Provider } from "ethers";

const getPreviouslyUsedWalletLabel = () => window.localStorage.getItem("previouslyUsedWalletLabel") || "";

type ConnectCallback = (address: string, provider: Eip1193Provider) => Promise<void>;

const walletStore = create<{
  connect: (callback: ConnectCallback) => Promise<void>;
  disconnect: () => Promise<void>;
  setChain: (chain: number) => Promise<boolean>;
  provider?: Eip1193Provider;
  error?: any;
  chain?: number;
  address?: `0x${string}`;
}>((set) => ({
  chain: undefined,
  address: undefined,
  provider: undefined,
  error: undefined,
  connect: async (callback: ConnectCallback) => {
    if (!isServerOnMaintenance()) {
      try {
        const previouslyUsedWalletLabel = getPreviouslyUsedWalletLabel();
        const connectOptions = previouslyUsedWalletLabel
          ? {
              autoSelect: {
                label: previouslyUsedWalletLabel,
                disableModals: true,
              },
            }
          : undefined;
        let wallet = (await onboard.connectWallet(connectOptions))[0];

        if (!wallet) {
          // This error can be caused if the user changed the wallet he is using in the mean time,
          // for example he switched from MM -> Rabby
          // So let's try first without the previouslyUsedWalletLabel
          console.debug(
            "No wallet selected when trying to connect with `previouslyUsedWalletLabel`. Retrying without it."
          );

          wallet = (await onboard.connectWallet())[0];
        }

        if (!wallet) {
          throw new Error("No wallet selected");
        }

        window.localStorage.setItem("previouslyUsedWalletLabel", wallet.label);

        const walletData = parseWeb3OnboardWallet(wallet);

        set({ ...walletData, address: walletData.address as `0x${string}` });
        await callback(walletData.address, walletData.provider);
      } catch (e) {
        console.error("Error connecting wallet", e);
        set({ error: e });
      }
    }
  },
  disconnect: async () => {
    const previouslyUsedWalletLabel = getPreviouslyUsedWalletLabel();
    let error;
    try {
      await onboard.disconnectWallet({
        label: previouslyUsedWalletLabel || "",
      });
    } catch (e) {
      error = e;
      console.error("Error disconnecting wallet", e);
    }
    window.localStorage.setItem("previouslyUsedWalletLabel", "");

    set({ address: undefined, chain: undefined, provider: undefined, error });
  },
  setChain: async (chainId: number) => {
    const success = await onboard.setChain({ chainId });
    if (success) set({ chain: chainId });
    else console.error("Error setting chain");
    return success;
  },
}));

const parseWeb3OnboardWallet = (wallet: WalletState) => {
  const address = wallet?.accounts?.[0]?.address;
  const chainAsStr = wallet?.chains?.[0]?.id;
  const chain = chainAsStr
    ? chainAsStr.startsWith("0x")
      ? parseInt(chainAsStr.substring(2), 16)
      : parseInt(chainAsStr.substring(2), 10)
    : 1;
  const provider = wallet?.provider;
  return { address, chain, provider };
};

onboard.state.select("wallets").subscribe((wallets) => {
  if (wallets.length) {
    const walletState = walletStore.getState();
    // Disconnect if the wallet has been changed
    if (walletState.address && walletState.address !== wallets?.[0]?.accounts?.[0]?.address) {
      walletState.disconnect();
      return;
    }
  }
  const walletState = parseWeb3OnboardWallet(wallets[0]);
  walletStore.setState({ ...walletState, address: walletState.address as `0x${string}` });
});

// Export as hook
export const useWalletStore = walletStore;
