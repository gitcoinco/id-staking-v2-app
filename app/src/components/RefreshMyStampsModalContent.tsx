// --- React & ReactDOM hooks
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";

// --- Types
import { PlatformGroupSpec } from "@gitcoin/passport-platforms";

// --- Identity tools
import { Stamp, PROVIDER_ID, PLATFORM_ID } from "@gitcoin/passport-types";
import { fetchVerifiableCredential } from "@gitcoin/passport-identity";

// --- Contexts
import { useWalletStore } from "../context/walletStore";
import { CeramicContext } from "../context/ceramicContext";

// --- Datadog
import { datadogLogs } from "@datadog/browser-logs";

// --- App components
import { RefreshMyStampsModalContentCardList } from "../components/RefreshMyStampsModalContentCardList";
import { createSignedPayload, reduceStampResponse } from "../utils/helpers";
import { ValidatedPlatform } from "../signer/utils";
import Checkbox from "./Checkbox";
import { Button } from "./Button";
import { LoadButton } from "./LoadButton";

// -- Utils
import { IAM_SIGNATURE_TYPE, iamUrl } from "../config/stamp_config";
import { useDatastoreConnectionContext } from "../context/datastoreConnectionContext";

export type RefreshMyStampsModalContentProps = {
  resetStampsAndProgressState: () => void;
  onClose: () => void;
  validPlatforms: ValidatedPlatform[];
  dashboardCustomizationKey: string | null;
};

export type evmPlatformProvider = {
  checked: boolean;
  platformId: PLATFORM_ID;
  platformGroup: PlatformGroupSpec[];
};

export const RefreshMyStampsModalContent = ({
  onClose,
  validPlatforms,
  resetStampsAndProgressState,
  dashboardCustomizationKey,
}: RefreshMyStampsModalContentProps): JSX.Element => {
  const address = useWalletStore((state) => state.address);
  const { handleAddStamps, handleDeleteStamps } = useContext(CeramicContext);
  const [isLoading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [showDataInfo, setShowDataInfo] = useState(false);
  const [disableOnboard, setDisplayOnboard] = useState(false);
  const { did } = useDatastoreConnectionContext();
  const navigate = useNavigate();

  // TODO: update comments
  // SelectedProviders will be passed in to the sidebar to be filled there...
  const [verifiedProviders, setVerifiedProviders] = useState<PROVIDER_ID[]>([]);

  // TODO: update comments
  // SelectedProviders will be passed in to the sidebar to be filled there...
  const [selectedProviders, setSelectedProviders] = useState<PROVIDER_ID[]>([...verifiedProviders]);

  useEffect(() => {
    if (selectedProviders.length !== 0) {
      setCanSubmit(true);
    } else {
      setCanSubmit(false);
    }
  }, [selectedProviders.length]);

  const handleRefreshSelectedStamps = async () => {
    try {
      setLoading(true);
      await handleFetchCredential(selectedProviders);
      datadogLogs.logger.info("Successfully saved Stamp, onboard one step verification", {
        providers: selectedProviders,
      });
      localStorage.setItem("successfulRefresh", "true");
    } catch (e) {
      datadogLogs.logger.error("Verification Error, onboard one step verification", { error: e });
      localStorage.setItem("successfulRefresh", "false");
    }
    setLoading(false);
    navigate(`/dashboard${dashboardCustomizationKey ? `/${dashboardCustomizationKey}` : ""}`);
    resetStampsAndProgressState();
  };

  const handleFetchCredential = async (providerIDs: PROVIDER_ID[]): Promise<void> => {
    try {
      if (!did) throw new Error("No DID found");
      if (selectedProviders.length > 0) {
        const verified = await fetchVerifiableCredential(
          iamUrl,
          {
            type: "EVMBulkVerify",
            types: selectedProviders,
            version: "0.0.0",
            address: address || "",
            proofs: {},
            signatureType: IAM_SIGNATURE_TYPE,
          },
          (data: any) => createSignedPayload(did, data)
        );

        const vcs = reduceStampResponse(selectedProviders, verified.credentials);

        // Delete all stamps ...
        await handleDeleteStamps(providerIDs as PROVIDER_ID[]);

        // .. and now add all newly validate stamps
        if (vcs.length > 0) {
          await handleAddStamps(vcs);
        }

        // grab all providers who are verified from the verify response
        const actualVerifiedProviders = providerIDs.filter(
          (providerId) =>
            !!vcs.find((vc: Stamp | undefined) => vc?.credential?.credentialSubject?.provider === providerId)
        );
        // both verified and selected should look the same after save
        setVerifiedProviders([...actualVerifiedProviders]);
        setSelectedProviders([...actualVerifiedProviders]);
      }
    } catch (e: unknown) {
      // TODO: update datadog logger
      // datadogLogs.logger.error("Verification Error", { error: e, platform: platform.platformId });
      console.log(e);
      throw new Error();
    }
  };

  useEffect(() => {
    const providerNames: string[] = validPlatforms
      .map(({ groups }) => groups.map(({ providers }) => providers.map(({ name }) => name)))
      .flat(3);

    setSelectedProviders(providerNames as PROVIDER_ID[]);
  }, [validPlatforms]);

  return (
    <div className="flex grow flex-col items-center pb-6">
      <div className="w-full grow px-4 md:px-8">
        {validPlatforms.length > 0 ? (
          <div className="flex flex-col text-color-1">
            <div className="my-4 font-heading text-2xl md:my-6">Stamps Found</div>
            <div>
              {" "}
              {/* TODO: update comments */}
              {/* container for platforms so user can scroll if they have a lot */}
              <RefreshMyStampsModalContentCardList
                selectedProviders={selectedProviders}
                validPlatforms={validPlatforms}
                setSelectedProviders={setSelectedProviders}
              />
            </div>
            <div className="mt-8 cursor-pointer text-center text-color-2 underline">
              <a onClick={() => setShowDataInfo(!showDataInfo)}>How is my data stored?</a>
            </div>
            {showDataInfo && (
              <div className="pt-3 text-justify">
                <p>
                  The only information in your passport is the Decentralized Identifier (DID) associated with your
                  Ethereum address and the Verifiable Credentials (VCs) issued for each service you connect to your
                  passport. No identifiable details are stored in your passport as we encrypt the account details when
                  creating your VCs. You can inspect the data yourself in the Gitcoin Passport by clicking the &lt;/&gt;
                  Passport JSON button in the upper right of the Passport dashboard.
                </p>
              </div>
            )}
            <div className="mt-8 grid grid-cols-2 items-center justify-center gap-6">
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(`/dashboard${dashboardCustomizationKey ? `/${dashboardCustomizationKey}` : ""}`)
                }
              >
                Cancel
              </Button>
              <LoadButton
                onClick={() => {
                  handleRefreshSelectedStamps();
                }}
                disabled={!canSubmit || isLoading}
                isLoading={isLoading}
              >
                Confirm Stamps
              </LoadButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center text-color-1">
            <div className="mb-6 mt-4 flex h-10 w-10"></div>
            <div className="w-3/4 text-3xl">No New Web3 Stamps Detected</div>
            <div className="my-20 text-xl text-color-2">
              We did not find any new Web3 stamps to add to your passport. Completing the actions for a web3 stamp and
              resubmitting will ensure that stamp is added (for example: Obtain an ENS name, NFT, etc.). Please return
              to the dashboard and select additional stamps to verify your unique humanity by connecting to external
              accounts (for example: Gmail, Discord, etc).
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigate(`/dashboard${dashboardCustomizationKey ? `/${dashboardCustomizationKey}` : ""}`);
                resetStampsAndProgressState();
              }}
            >
              Explore Stamps
            </Button>
          </div>
        )}
      </div>
      <div className="mb-2 mt-8 flex text-color-1">
        <Checkbox
          data-testid="checkbox-onboard-hide"
          id="checkbox-onboard-hide"
          checked={disableOnboard}
          onChange={(checked: boolean) => {
            if (checked) {
              const now = Math.floor(Date.now() / 1000);
              localStorage.setItem("onboardTS", now.toString());
              setDisplayOnboard(true);
            } else {
              localStorage.removeItem("onboardTS");
              setDisplayOnboard(false);
            }
          }}
        />
        <label className="pl-2" htmlFor="checkbox-onboard-hide">
          Skip welcome onboarding until stamps expire
        </label>
      </div>
    </div>
  );
};
