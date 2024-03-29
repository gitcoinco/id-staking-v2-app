import React, { ChangeEvent, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/Button";
import { useAccount } from "wagmi";
import { StakeFormInputSection } from "./StakeFormInputSection";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { parseEther } from "viem";
import { StakeForOthersModal } from "./StakeForOthersModal";
import { useCommunityStakeHistoryQuery } from "@/utils/stakeHistory";
import { getLockSeconds } from "@/utils/helpers";

type CommunityStakeInputs = {
  uuid: string;
  stakeeInput: string;
  amountInput: string;
  lockedPeriodMonths: number;
};

type CommunityStakeChainParams = {
  stakee: `0x${string}`;
  amount: bigint;
  lockedPeriodsSeconds: bigint;
};

type CommunityStake = CommunityStakeInputs & CommunityStakeChainParams;

const createEmptyCommunityStake = (): CommunityStake => ({
  uuid: uuidv4(),
  stakeeInput: "",
  amountInput: "",
  lockedPeriodMonths: 3,
  amount: 0n,
  lockedPeriodsSeconds: BigInt(getLockSeconds(new Date(), 3)),
  stakee: "0x0",
});

const initialEmptyStake = createEmptyCommunityStake();

export const useCommunityStakesStore = create<{
  communityStakes: CommunityStake[];
  communityStakesById: Record<string, CommunityStake>;
  resetCommunityStakes: () => void;
  stakeSections: (typeof StakeForOthersFormSection)[];
  updateCommunityStake: (uuid: string, communityStake: Partial<CommunityStake>) => void;
  removeCommunityStake: (uuid: string) => void;
  addCommunityStake: () => void;
}>((set) => ({
  communityStakes: [initialEmptyStake],
  communityStakesById: { [initialEmptyStake.uuid]: initialEmptyStake },
  resetCommunityStakes: () =>
    set((state) => ({
      ...state,
      communityStakes: [initialEmptyStake],
      communityStakesById: { [initialEmptyStake.uuid]: initialEmptyStake },
    })),
  stakeSections: [],
  addCommunityStake: () =>
    set((state) => {
      const communityStake = createEmptyCommunityStake();
      return {
        ...state,
        communityStakes: [...state.communityStakes, communityStake],
        communityStakesById: { ...state.communityStakesById, [communityStake.uuid]: communityStake },
      };
    }),
  updateCommunityStake: (uuid: string, communityStake: Partial<CommunityStake>) =>
    set((state) => {
      if (communityStake.amountInput !== undefined) {
        communityStake.amount = parseEther(communityStake.amountInput);
      }

      if (communityStake.lockedPeriodMonths !== undefined) {
        communityStake.lockedPeriodsSeconds = BigInt(getLockSeconds(new Date(), communityStake.lockedPeriodMonths));
      }

      if (communityStake.stakeeInput !== undefined) {
        // TODO: shall we resolve ENS names here ???
        communityStake.stakee = communityStake.stakeeInput as `0x${string}`;
      }

      const newCommunityStake = {
        ...state.communityStakesById[uuid],
        ...communityStake,
      };
      return {
        ...state,
        communityStakes: state.communityStakes.map((cStake) => {
          return newCommunityStake.uuid === cStake.uuid ? newCommunityStake : cStake;
        }),
        communityStakesById: { ...state.communityStakesById, [uuid]: newCommunityStake },
      };
    }),
  removeCommunityStake: (uuid: string) =>
    set((state) => {
      const newCommunityStakesById = { ...state.communityStakesById };
      delete newCommunityStakesById[uuid];
      return {
        ...state,
        communityStakes: state.communityStakes.filter((cStake) => {
          return cStake.uuid !== uuid;
        }),
        communityStakesById: newCommunityStakesById,
      };
    }),
}));

const StakeForOthersFormSection = ({
  showClose,
  uuid,
  alreadyStakedOnAddress,
}: {
  showClose: boolean;
  uuid: string;
  alreadyStakedOnAddress: boolean;
}) => {
  const communityStake = useCommunityStakesStore((state) => state.communityStakesById[uuid]);
  const updateCommunityStake = useCommunityStakesStore((state) => state.updateCommunityStake);
  const removeCommunityStake = useCommunityStakesStore((state) => state.removeCommunityStake);

  const setInputValue = useCallback(
    (value: string) => {
      updateCommunityStake(uuid, { amountInput: value });
    },
    [updateCommunityStake, uuid]
  );

  const setStakeeAddress = useCallback(
    (address: string) => {
      updateCommunityStake(uuid, { stakeeInput: address as `0x${string}` });
    },
    [updateCommunityStake, uuid]
  );

  const setLockedPeriod = useCallback(
    (lockPeriod: number) => {
      updateCommunityStake(uuid, { lockedPeriodMonths: lockPeriod });
    },
    [updateCommunityStake, uuid]
  );

  const handleStakeeInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setStakeeAddress(event.target.value);
    },
    [setStakeeAddress]
  );

  return (
    <div className="w-full rounded-lg bg-gradient-to-b from-background to-background-5">
      <div className="w-full rounded-t-lg border-r flex-col border-l border-t items-center border-foreground-4 bg-background-6 flex gap-4 py-6 pl-4 md:pl-14">
        <div className="w-full items-center flex gap-4">
          <div className="text-color-6 shrink-0 text-right font-bold w-[72px]">Address</div>
          <input
            className={`px-4 py-1 w-full rounded-lg border ${
              alreadyStakedOnAddress ? "border-focus" : "border-foreground-4"
            } bg-background text-color-2`}
            type="text"
            value={communityStake.stakeeInput}
            placeholder="anotherperson.eth"
            onChange={handleStakeeInputChange}
          />
          <div
            className={`cursor-pointer ${showClose ? "visible" : "invisible"} w-4 mr-5`}
            onClick={() => {
              removeCommunityStake(uuid);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 1L1.00007 14.9999" stroke="#4C817A" />
              <path d="M15 15L1.00007 1.00006" stroke="#4C817A" />
            </svg>
          </div>
        </div>
        <div className={`${alreadyStakedOnAddress ? "block" : "hidden"} text-center text-focus`}>
          You have already staked on this address
        </div>
      </div>
      <StakeFormInputSection
        className="rounded-t-none"
        amount={communityStake.amountInput}
        lockedMonths={communityStake.lockedPeriodMonths}
        handleAmountChange={setInputValue}
        handleLockedMonthsChange={setLockedPeriod}
      />
    </div>
  );
};

export const StakeForOthersForm = () => {
  const { address } = useAccount();
  const { data } = useCommunityStakeHistoryQuery(address);

  const communityStakes = useCommunityStakesStore((state) => state.communityStakes);
  const addCommunityStake = useCommunityStakesStore((state) => state.addCommunityStake);

  const previousStakedAddresses = useMemo(() => data?.map((stake) => stake.stakee.toLowerCase()) ?? [], [data]);
  const hasDuplicateAddresses = useMemo(
    () =>
      communityStakes
        .map((cStake) => cStake.stakee.toLowerCase())
        .find((address, idx, arr) => arr.indexOf(address) !== idx && address !== "0x0"),
    [communityStakes]
  );

  const stakeSections = useMemo(
    () =>
      communityStakes.map((communityStake, idx) => (
        <StakeForOthersFormSection
          key={idx}
          showClose={idx != 0}
          uuid={communityStake.uuid}
          alreadyStakedOnAddress={
            previousStakedAddresses.includes(communityStake.stakee.toLowerCase()) ||
            (communityStake.stakee !== "0x0" &&
              communityStakes.findIndex(
                (cStake) => cStake.stakee.toLowerCase() === communityStake.stakee.toLowerCase()
              ) !== idx)
          }
        />
      )),
    [communityStakes, previousStakedAddresses]
  );

  const anyIncomplete: boolean = useMemo(
    () =>
      Boolean(
        hasDuplicateAddresses ||
          communityStakes.find(
            (cStake) =>
              !(parseFloat(cStake.amountInput) > 0) || previousStakedAddresses.includes(cStake.stakee.toLowerCase())
          )
      ),
    [communityStakes, hasDuplicateAddresses, previousStakedAddresses]
  );

  const [modalIsOpen, setModalIsOpen] = useState(false);

  const onClose = useCallback(() => {
    setModalIsOpen(false);
  }, []);

  const communityStakeModal = useMemo(
    () =>
      address ? (
        <StakeForOthersModal
          address={address}
          stakees={communityStakes.map((cStake) => cStake.stakee)}
          amounts={communityStakes.map((cStake) => cStake.amount)}
          lockedPeriodsSeconds={communityStakes.map((cStake) => cStake.lockedPeriodsSeconds)}
          isOpen={modalIsOpen}
          onClose={onClose}
        />
      ) : null,
    [address, communityStakes, modalIsOpen, onClose]
  );

  return (
    <div className="flex flex-col gap-4">
      {stakeSections}
      <div className="flex">
        <button className="flex-1 w-1/2 flex items-center" onClick={addCommunityStake}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="15.5" stroke="#6CB6AD" />
            <path d="M16 8V24" stroke="#6CB6AD" />
            <path d="M24 16L8 16" stroke="#6CB6AD" />
          </svg>
          <span className="pl-4">Add another address</span>
        </button>
        <Button className="flex-1 w-1/2 font-bold" onClick={() => setModalIsOpen(true)} disabled={anyIncomplete}>
          Stake
        </Button>
      </div>

      {communityStakeModal}
    </div>
  );
};
