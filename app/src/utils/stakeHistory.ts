import React, { ComponentPropsWithRef, useEffect, useMemo } from "react";
import { useDatastoreConnectionContext } from "@/context/datastoreConnectionContext";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type StakeData = {
  chain: string;
  staker: string;
  stakee: string;
  amount: string;
  unlock_time: string;
  lock_time: string;
};

export const useStakeHistoryQueryKey = (address: string | undefined): string[] => {
  return useMemo(() => ["stakeHistory", address || ""], [address]);
};

export const useStakeHistoryQuery = (address: string | undefined) => {
  const { dbAccessToken, dbAccessTokenStatus } = useDatastoreConnectionContext();
  const queryKey = useStakeHistoryQueryKey(address);
  return useQuery({
    queryKey,
    queryFn: async (): Promise<StakeData[]> => {
      // TODO filter by chain here or somewhere else
      const address = queryKey[1];
      const response = await axios.get(`${process.env.NEXT_PUBLIC_CERAMIC_CACHE_ENDPOINT}/stake/gtc`, {
        headers: {
          Authorization: `Bearer ${dbAccessToken}`,
        },
      });
      return response.data;
    },
    enabled: Boolean(address) && dbAccessTokenStatus === "connected",
  });
};