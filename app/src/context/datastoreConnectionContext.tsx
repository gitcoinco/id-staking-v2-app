import React, { createContext, useContext, useEffect, useMemo, useCallback, useRef } from "react";
import { datadogRum } from "@datadog/browser-rum";
import { createSiweMessage } from "viem/siwe";
import type { WalletClient } from "viem";
import axios from "axios";
import { useAccount, useDisconnect } from "wagmi";
import { create } from "zustand";

export type DbAuthTokenStatus = "idle" | "failed" | "connected";

const CERAMIC_CACHE_ENDPOINT = process.env.NEXT_PUBLIC_SCORER_ENDPOINT + "/ceramic-cache";

export type DatastoreConnectionContextState = {
  dbAccessTokenStatus: DbAuthTokenStatus;
  dbAccessToken?: string;
  connect: (address: string, walletClient: WalletClient) => Promise<void>;
  connectedAddress?: string;
};

export const DatastoreConnectionContext = createContext<DatastoreConnectionContextState>({
  dbAccessTokenStatus: "idle",
  connect: async () => {},
});

const useDatastoreConnectionStore = create<
  Pick<DatastoreConnectionContextState, "dbAccessTokenStatus" | "dbAccessToken" | "connectedAddress"> & {
    update: (
      data: Partial<
        Pick<DatastoreConnectionContextState, "dbAccessTokenStatus" | "dbAccessToken" | "connectedAddress">
      >
    ) => void;
  }
>((set) => ({
  dbAccessTokenStatus: "idle",
  dbAccessToken: undefined,
  connectedAddress: undefined,
  update: (
    data: Partial<
      Pick<DatastoreConnectionContextState, "dbAccessTokenStatus" | "dbAccessToken" | "connectedAddress">
    >
  ) => set(data),
}));

type NonceResponse = { nonce: string };
type AuthResponse = { access: string };

const getPassportDatabaseAccessToken = async (
  address: string,
  walletClient: WalletClient
): Promise<string> => {
  const { data: { nonce } } = await axios.get<NonceResponse>(
    `${process.env.NEXT_PUBLIC_SCORER_ENDPOINT}/account/nonce`
  );

  const siweParams = {
    domain: window.location.host,
    address: address as `0x${string}`,
    statement: "Sign in to Human Passport",
    uri: window.location.origin,
    version: "1" as const,
    chainId: 1,
    nonce,
    issuedAt: new Date(),
    expirationTime: new Date(Date.now() + 5 * 60 * 1000),
  };

  const message = createSiweMessage(siweParams);

  const signature = await walletClient.signMessage({
    account: address as `0x${string}`,
    message,
  });

  let authResponse;
  try {
    authResponse = await axios.post<AuthResponse>(
      `${CERAMIC_CACHE_ENDPOINT}/authenticate/v2`,
      { message: siweParams, signature }
    );
  } catch (e: any) {
    const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.message;
    throw new Error(`Sign-in failed: ${detail}`);
  }

  return authResponse.data.access;
};

// In the app, the context hook should be used. This is only exported for testing
export const useDatastoreConnection = () => {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  const { dbAccessTokenStatus, dbAccessToken, connectedAddress, update } = useDatastoreConnectionStore();

  /**
   * The purpose of this useEffect is to disconnect the user if the address of the wallet changes
   * We want to avoid being connected to the BE with 1 address and with another address in the wallet
   * as this is an undesired state
   */
  useEffect(() => {
    if (address !== connectedAddress && dbAccessTokenStatus !== "idle") {
      disconnect();
    }
  }, [address, connectedAddress, dbAccessTokenStatus, disconnect]);

  useEffect(() => {
    // Clear status when wallet disconnected
    if (!isConnected && dbAccessTokenStatus === "connected") {
      update({
        dbAccessTokenStatus: "idle",
        dbAccessToken: undefined,
      });
    }
  }, [isConnected, dbAccessTokenStatus, update]);

  const connectInFlightRef = useRef<Promise<void> | null>(null);

  const connect = useCallback(
    async (address: string, walletClient: WalletClient) => {
      if (connectInFlightRef.current) return connectInFlightRef.current;
      connectInFlightRef.current = (async () => {
        try {
          if (!address) return;

          const cacheKey = `dbcache-token-${address}`;
          const cached = window.localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const payload = JSON.parse(atob(cached.split(".")[1]));
              if (payload.exp && payload.exp * 1000 > Date.now() + 60_000) {
                update({
                  dbAccessToken: cached,
                  dbAccessTokenStatus: "connected",
                  connectedAddress: address,
                });
                return;
              }
            } catch {
              // malformed token, fall through to re-auth
            }
          }

          const newAccessToken = await getPassportDatabaseAccessToken(address, walletClient);
          window.localStorage.setItem(cacheKey, newAccessToken);
          update({
            dbAccessToken: newAccessToken,
            dbAccessTokenStatus: "connected",
            connectedAddress: address,
          });
        } catch (error) {
          update({
            dbAccessTokenStatus: "failed",
            dbAccessToken: undefined,
            connectedAddress: undefined,
          });
          datadogRum.addError(error);
          throw error;
        } finally {
          connectInFlightRef.current = null;
        }
      })();
      return connectInFlightRef.current;
    },
    [update]
  );

  return {
    connect,
    dbAccessToken,
    dbAccessTokenStatus,
    connectedAddress,
  };
};

export const DatastoreConnectionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { dbAccessToken, dbAccessTokenStatus, connect, connectedAddress } = useDatastoreConnection();

  const providerProps = useMemo(
    () => ({
      connect,
      dbAccessToken,
      dbAccessTokenStatus,
      connectedAddress,
    }),
    [dbAccessToken, dbAccessTokenStatus, connect, connectedAddress]
  );

  return <DatastoreConnectionContext.Provider value={providerProps}>{children}</DatastoreConnectionContext.Provider>;
};

export const useDatastoreConnectionContext = () => useContext(DatastoreConnectionContext);
