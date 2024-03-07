// --- React Methods
import React, { useContext, useEffect, useRef, useState } from "react";

import { PLATFORMS } from "../config/platforms";
import { PlatformGroupSpec, STAMP_PROVIDERS } from "../config/providers";

// --- Components
import { LoadingCard } from "./LoadingCard";
import { GenericPlatform } from "./GenericPlatform";

// --- Identity Providers
import { SideBarContent } from "./SideBarContent";

// --- Chakra UI Elements
import { Drawer, DrawerOverlay, useDisclosure } from "@chakra-ui/react";
import { PLATFORM_ID, PROVIDER_ID } from "@gitcoin/passport-types";
import { CeramicContext } from "../context/ceramicContext";
import { PlatformCard } from "./PlatformCard";
import PageWidthGrid from "../components/PageWidthGrid";
import { PlatformScoreSpec, ScorerContext } from "../context/scorerContext";

export type CardListProps = {
  isLoading?: boolean;
  className?: string;
};

const cardClassName = "col-span-2 md:col-span-3 lg:col-span-2 xl:col-span-3";

type SelectedProviders = Record<PLATFORM_ID, PROVIDER_ID[]>;

export const getStampProviderIds = (platform: PLATFORM_ID): PROVIDER_ID[] => {
  return (
    STAMP_PROVIDERS[platform]?.reduce((all, stamp) => {
      return all.concat(stamp.providers?.map((provider) => provider.name as PROVIDER_ID));
    }, [] as PROVIDER_ID[]) || []
  );
};

export const CardList = ({ className, isLoading = false }: CardListProps): JSX.Element => {
  const { allProvidersState, allPlatforms } = useContext(CeramicContext);
  const { scoredPlatforms } = useContext(ScorerContext);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();
  const [currentPlatform, setCurrentPlatform] = useState<PlatformScoreSpec | undefined>();
  const [currentProviders, setCurrentProviders] = useState<PlatformGroupSpec[]>([]);

  // get the selected Providers
  const [selectedProviders, setSelectedProviders] = useState<SelectedProviders>(
    PLATFORMS.reduce((platforms, platform) => {
      // get all providerIds for this platform
      const providerIds = getStampProviderIds(platform.platform);
      // default to empty array for each platform
      platforms[platform.platform] = providerIds.filter(
        (providerId) => typeof allProvidersState[providerId]?.stamp?.credential !== "undefined"
      );
      // return all platforms
      return platforms;
    }, {} as SelectedProviders)
  );

  // update when verifications change...
  useEffect(() => {
    // update all verfied states
    setSelectedProviders(
      PLATFORMS.reduce((platforms, platform) => {
        // get all providerIds for this platform
        const providerIds =
          STAMP_PROVIDERS[platform.platform]?.reduce((all, stamp) => {
            return all.concat(stamp.providers?.map((provider) => provider.name as PROVIDER_ID));
          }, [] as PROVIDER_ID[]) || [];
        // default to empty array for each platform
        platforms[platform.platform] = providerIds.filter(
          (providerId) => typeof allProvidersState[providerId]?.stamp?.credential !== "undefined"
        );
        // return all platforms
        return platforms;
      }, {} as SelectedProviders)
    );
  }, [allProvidersState]);

  // Add the platforms to this switch so the sidebar content can populate dynamically
  const renderCurrentPlatformSelection = () => {
    if (currentPlatform) {
      const platformProps = allPlatforms.get(currentPlatform.platform);
      if (platformProps) {
        return (
          <GenericPlatform
            platform={platformProps.platform}
            platformScoreSpec={currentPlatform}
            platFormGroupSpec={platformProps.platFormGroupSpec}
            onClose={onClose}
          />
        );
      }
    }
    return (
      <SideBarContent
        verifiedProviders={undefined}
        selectedProviders={undefined}
        setSelectedProviders={undefined}
        currentPlatform={undefined}
        currentProviders={undefined}
        isLoading={undefined}
        verifyButton={undefined}
        onClose={onClose}
      />
    );
  };

  useEffect(() => {
    // set providers for the current platform
    if (currentPlatform) {
      setCurrentProviders(STAMP_PROVIDERS[currentPlatform.platform]);
    }
  }, [currentPlatform]);

  const [verified, unverified] = scoredPlatforms.reduce(
    ([verified, unverified], platform): [PlatformScoreSpec[], PlatformScoreSpec[]] => {
      return platform.earnedPoints === 0 && selectedProviders[platform.platform].length === 0
        ? [verified, [...unverified, platform]]
        : [[...verified, platform], unverified];
    },
    [[], []] as [PlatformScoreSpec[], PlatformScoreSpec[]]
  );

  const sortedPlatforms = [
    ...unverified.sort((a, b) => b.possiblePoints - a.possiblePoints),
    ...verified.sort((a, b) => b.possiblePoints - b.earnedPoints - (a.possiblePoints - a.earnedPoints)),
  ];

  return (
    <>
      <PageWidthGrid className={className}>
        {sortedPlatforms.map((platform, i) => {
          return isLoading ? (
            <LoadingCard key={i} className={cardClassName} />
          ) : (
            <PlatformCard
              i={i}
              key={i}
              platform={platform}
              onOpen={onOpen}
              selectedProviders={selectedProviders}
              setCurrentPlatform={setCurrentPlatform}
              className={cardClassName}
            />
          );
        })}
      </PageWidthGrid>
      {/* sidebar */}
      {currentProviders && (
        <Drawer isOpen={isOpen} placement="right" size="sm" onClose={onClose} finalFocusRef={btnRef.current}>
          <DrawerOverlay />
          {renderCurrentPlatformSelection()}
        </Drawer>
      )}
    </>
  );
};
