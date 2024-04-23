import React, { ComponentPropsWithRef, useCallback, useEffect, useRef, useState } from "react";
import { PanelDiv } from "./PanelDiv";
import { useWalletStore } from "@/context/walletStore";
import { DisplayAddressOrENS, DisplayDuration, formatAmount, formatDate } from "@/utils/helpers";
import { StakeData, useCommunityStakeHistoryQuery } from "@/utils/stakeHistory";
import { CommunityUpdateButton } from "./CommunityUpdateButton";
import { Popover } from "@headlessui/react";
import { CommunityRestakeModal } from "./CommunityRestakeModal";
import { CommunityUnstakeModal } from "./CommunityUnstakeModal";

const Th = ({ className, children, ...props }: ComponentPropsWithRef<"th"> & { children: React.ReactNode }) => (
  <th className={`${className} p-2 pb-4 text-center`} {...props}>
    {children}
  </th>
);

const Td = ({ className, ...props }: ComponentPropsWithRef<"td">) => (
  <td className={`${className} p-2 py-4 text-center`} {...props} />
);

const CommunityRestakeButton = ({ stake, address }: { stake: StakeData; address: string }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const onClose = useCallback(() => setModalIsOpen(false), []);

  return (
    <>
      <CommunityRestakeModal address={address} stakedData={[stake]} isOpen={modalIsOpen} onClose={onClose} />
      <button onClick={() => setModalIsOpen(true)}>Restake</button>
    </>
  );
};

const CommunityRestakeAllButton = ({ stake, address }: { stake: StakeData[]; address: string }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const onClose = useCallback(() => setModalIsOpen(false), []);

  return (
    <>
      <CommunityRestakeModal address={address} stakedData={stake} isOpen={modalIsOpen} onClose={onClose} />
      <button className="px-1 border rounded text-color-6 font-bold" onClick={() => setModalIsOpen(true)}>
        Restake all{" "}
      </button>
    </>
  );
};

const CommunityUnstakeButton = ({
  stake,
  address,
  unlocked,
}: {
  stake: StakeData;
  address: string;
  unlocked: boolean;
}) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  return (
    <>
      <CommunityUnstakeModal
        address={address}
        stakedData={[stake]}
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
      />
      <button
        className="disabled:text-color-5 disabled:cursor-not-allowed"
        onClick={() => setModalIsOpen(true)}
        disabled={!unlocked}
      >
        Unstake
      </button>
    </>
  );
};

const Tbody = ({ presetAddress, clearPresetAddress }: { presetAddress?: string; clearPresetAddress: () => void }) => {
  const address = useWalletStore((state) => state.address);

  const { isPending, isError, data, error } = useCommunityStakeHistoryQuery(address);

  useEffect(() => {
    isError && console.error("Error getting StakeHistory:", error);
  }, [error, isError]);

  let tbody_contents;
  if (!isPending && !isError && address && data && data.length > 0) {
    tbody_contents = (
      <>
        {data
          .sort((a, b) => new Date(b.lock_time).valueOf() - new Date(a.lock_time).valueOf())
          .map((stake, index) => (
            <StakeLine
              key={index}
              stake={stake}
              address={address}
              isPresetAddress={presetAddress?.toLowerCase() === stake.stakee.toLowerCase()}
              clearPresetAddress={clearPresetAddress}
            />
          ))}
      </>
    );
  } else {
    const status = isError ? "Error loading stakes" : isPending ? "Loading..." : "No stakes found";
    tbody_contents = (
      <tr>
        <Td colSpan={5} className="text-center">
          {status}
        </Td>
      </tr>
    );
  }
  return <tbody>{tbody_contents}</tbody>;
};

const StakeLine = ({
  stake,
  address,
  isPresetAddress,
  clearPresetAddress,
}: {
  stake: StakeData;
  address: string;
  isPresetAddress: boolean;
  clearPresetAddress: () => void;
}) => {
  const ref = useRef<HTMLTableRowElement>(null);
  const unlockTime = new Date(stake.unlock_time);
  const unlockTimeStr = formatDate(unlockTime);

  const lockTime = new Date(stake.lock_time);
  const lockTimeStr = formatDate(lockTime);

  const lockSeconds = Math.floor((unlockTime.getTime() - lockTime.getTime()) / 1000);
  const unlocked = unlockTime < new Date();

  const amount = formatAmount(stake.amount);

  useEffect(() => {
    if (isPresetAddress && ref.current) {
      ref.current.scrollIntoView({ behavior: "instant", block: "center" });
    }
  });

  return (
    <tr ref={ref}>
      <Td>
        <DisplayAddressOrENS user={stake.stakee} />
      </Td>
      <Td>{amount} GTC</Td>
      <Td className="hidden lg:table-cell">{unlocked ? "Unlocked" : "Locked"}</Td>
      <Td className="hidden lg:table-cell">
        <DisplayDuration seconds={lockSeconds} />
      </Td>
      <Td className="">
        {lockTimeStr}
        <br />
        <span className={unlocked ? "text-color-2" : "text-focus"}>{unlockTimeStr}</span>
      </Td>
      <Td className="pr-8 py-1">
        <CommunityUpdateButton stake={stake} isOpenInitial={isPresetAddress} onClose={clearPresetAddress} />
      </Td>
      <Td>
        <Popover className="flex ">
          <Popover.Button className={"h-5 w-5"}>
            <img src="/assets/vertical-submenu.svg" />
          </Popover.Button>

          <Popover.Panel className="absolute z-10 inline-block">
            <div className="grid grid-rows-2 mx-10 rounded p-1 border border-foreground-4 bg-gradient-to-b from-background to-background-6">
              <CommunityRestakeButton address={address} stake={stake} />
              <CommunityUnstakeButton address={address} stake={stake} unlocked={unlocked} />
            </div>
          </Popover.Panel>
        </Popover>
      </Td>
    </tr>
  );
};

export const StakeForOthersHistory = ({
  presetAddress,
  clearPresetAddress,
}: {
  presetAddress?: string;
  clearPresetAddress: () => void;
}) => {
  const address = useWalletStore((state) => state.address);

  const { isPending, isError, data } = useCommunityStakeHistoryQuery(address);

  let restakeAllBtn;
  if (!isPending && !isError && address && data && data.length > 0) {
    restakeAllBtn = <CommunityRestakeAllButton address={address} stake={data} />;
  } else {
    restakeAllBtn = (
      <button className="px-1 border rounded text-color-6 font-bold disabled:text-color-5 disabled:cursor-not-allowed">
        Restake all{" "}
      </button>
    );
  }

  return (
    <PanelDiv className="flex flex-col">
      <div className="m-8 text-color-6 font-bold text-xl">Stake for Others</div>
      <table className="w-full">
        <thead>
          <tr className="border-b pb-6 border-foreground-4">
            <Th>Address</Th>
            <Th>Amount</Th>
            <Th className="hidden lg:table-cell">Status</Th>
            <Th className="hidden lg:table-cell">Lockup</Th>
            <Th>Start/End</Th>
            <Th>{restakeAllBtn}</Th>
          </tr>
        </thead>
        <Tbody presetAddress={presetAddress} clearPresetAddress={clearPresetAddress} />
      </table>
    </PanelDiv>
  );
};
