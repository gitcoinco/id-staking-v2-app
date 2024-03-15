import React from "react";
import { YourStakeForm } from "./YourStakeForm";
import { StakeSection } from "./StakeSection";
import { YourStakeHistory } from "./YourStakeHistory";
import { ChainConfig } from "@/utils/chains";
import { StakeData, useStakeHistoryQuery } from "@/utils/stakeHistory";
import { useAccount } from "wagmi";
interface YourStakeProps {
  selectedChain: ChainConfig;
}

export const YourStake: React.FC<YourStakeProps> = ({ selectedChain }) => {
  const { address } = useAccount();
  const { data } = useStakeHistoryQuery(address);
  const yourStakeHistory = data?.filter((stake: StakeData) => {
    return stake.stakee === address?.toLowerCase();
  });
  const stakedAmount: string = yourStakeHistory
    ? yourStakeHistory.reduce((acc, stake) => acc + BigInt(stake.amount), 0n).toString()
    : "0";

  return (
    <StakeSection
      icon={{
        src: "/assets/personIcon.svg",
        alt: "Person Icon",
      }}
      heading="Your Stake"
      subheading="Secure your identity by staking GTC. Higher stakes mean more trust in your passport."
      amount={stakedAmount}
    >
      <YourStakeForm />
      <YourStakeHistory />
    </StakeSection>
  );
};
