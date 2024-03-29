import React, { useCallback, useEffect, useState } from "react";
import { StakeModal, DataLine } from "./StakeModal";
import { DisplayAddressOrENS, DisplayDuration, formatAmount, formatDate } from "@/utils/helpers";
import { StakeData } from "@/utils/stakeHistory";
import { parseEther } from "viem";
import { useStakeTxWithApprovalCheck } from "@/hooks/hooks_staking/useStakeTxWithApprovalCheck";
import { all } from "axios";

export const TosModal = ({
  isOpen,
  onClose,
  onButtonClick,
  buttonDisabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  onButtonClick: () => void;
  buttonDisabled?: boolean;
}) => {
  const terms = [
    <>
      I acknowledge that I may be subject to slashing for non-compliant behavior. The rules governing such behavior may
      change. Learn more about slashing.{" "}
      <a href="https://github.com/gitcoinco/id-staking-v2/blob/main/README.md" target="blank" className="text-color-6">
        Learn more about slashing.
      </a>
    </>,
    <>
      I understand that using specific Passport Stamps (e.g., Holonym, Civic, and Google Stamps) are allowed only in one
      active Passport that I use in Passport-protected apps, and misuse may lead to slashing.{" "}
      <a
        href="https://docs.passport.gitcoin.co/building-with-passport/major-concepts/deduplicating-stamps"
        target="blank"
        className="text-color-6"
      >
        Learn more about Passport Stamps and wallets.
      </a>
    </>,
    <>
      I have read, understood, and agree to the{" "}
      <a href="#/terms" className="text-color-6">
        Terms and Conditions
      </a>{" "}
      of Passport&apos;s Identity Staking.
    </>,
  ];

  const [acceptedTerms, setAcceptedTerms] = useState(terms.map(() => false));
  const termsCheckBoxes = terms.map((t, index) => (
    <label key={index}>
      <div className="flex justify-start gap-2 pb-4">
        <div className="flex-1 min-w-6 max-w-6 pt-1">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={acceptedTerms[index]}
            onChange={(e) => {
              console.log(e.target.value);
              const newacceptedTerms = [...acceptedTerms];
              newacceptedTerms[index] = !newacceptedTerms[index];
              setAcceptedTerms(newacceptedTerms);
            }}
          />
        </div>
        <div className="flex-grow">{t}</div>
      </div>
    </label>
  ));
  const allTermsAccepted = acceptedTerms.every((t) => t);
  return (
    <StakeModal
      title={"Acknowledge and Agree to Continue"}
      buttonText={"Proceed"}
      onButtonClick={onButtonClick}
      buttonLoading={false}
      isOpen={isOpen}
      onClose={onClose}
      buttonDisabled={buttonDisabled || !allTermsAccepted}
    >
      <div>
        Before Staking Your Identity, Please Agree to the Following:
        <div className="flex flex-col pt-12 pb-4 w-full">{termsCheckBoxes}</div>
        <b>Please note:</b> All three boxes must be checked to enable the &quot;Proceed&quot; button and continue to the app.
      </div>
    </StakeModal>
  );
};
