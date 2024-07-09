import "@/styles/globals.css";

import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

import { themes, ThemeWrapper } from "../utils/theme";

import { DatastoreConnectionContextProvider } from "../context/datastoreConnectionContext";

import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/utils/wagmi";

import { datadogLogs } from "@datadog/browser-logs";
import Script from "next/script";

const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID || "";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

datadogLogs.init({
  clientToken: `${process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN}`,
  site: "us3.datadoghq.com",
  forwardErrorsToLogs: true,
  sessionSampleRate: 100,
  service: `${process.env.NEXT_PUBLIC_DATADOG_SERVICE}`,
  env: `${process.env.NEXT_PUBLIC_DATADOG_ENV}`,
});

const RenderOnlyOnClient = ({ children }: { children: React.ReactNode }) => {
  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
};

const queryClient = new QueryClient();

declare global {
  interface Window {
    intercomSettings?: {
      api_base: string;
      app_id: string;
    };
    Intercom: any;
  }
}

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.intercomSettings = {
        api_base: "https://api-iam.intercom.io",
        app_id: INTERCOM_APP_ID,
      };
      (function () {
        var w: any = window;
        var ic = w.Intercom;
        if (typeof ic === "function") {
          ic("reattach_activator");
          ic("update", w.intercomSettings);
        } else {
          var d = document;
          var i = function () {
            // @ts-ignore
            i.c(arguments);
          };
          // @ts-ignore
          i.q = [];
          // @ts-ignore
          i.c = function (args) {
            // @ts-ignore
            i.q.push(args);
          };
          w.Intercom = i;
          var l = function () {
            var s = d.createElement("script");
            s.type = "text/javascript";
            s.async = true;
            s.src = "https://widget.intercom.io/widget/" + INTERCOM_APP_ID;
            var x = d.getElementsByTagName("script")[0];
            x.parentNode?.insertBefore(s, x);
          };
          if (document.readyState === "complete") {
            l();
          } else if (w.attachEvent) {
            w.attachEvent("onload", l);
          } else {
            w.addEventListener("load", l, false);
          }
        }
      })();
    }
  }, []);
  return (
    <>
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />
        <title>Gitcoin Passport Identity Staking</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0" />
      </Head>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DatastoreConnectionContextProvider>
            <RenderOnlyOnClient>
              <ThemeWrapper initChakra={true} defaultTheme={themes.LUNARPUNK_DARK_MODE}>
                <Component {...pageProps} />
              </ThemeWrapper>
            </RenderOnlyOnClient>
          </DatastoreConnectionContextProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}
