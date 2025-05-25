/**
 * MIT License
 * Copyright (c) 2022 DevRel Team & Community
 *
 * From Celo Composer
 */
'use client'

import '@rainbow-me/rainbowkit/styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  connectorsForWallets,
  lightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';

import Layout from '../components/Layout';
import { injectedWallet } from '@rainbow-me/rainbowkit/wallets';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [injectedWallet],
    },
  ],
  {
    appName: 'stable-sl',
    projectId: process.env.WC_PROJECT_ID ?? '044601f65212332475a09bc14ceb3c34',
  }
);

var config = createConfig({
  connectors,
  chains: (process.env.NEXT_PUBLIC_NETWORK == "CELO" ? [celo] : [celo, celoAlfajores]),
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

const queryClient = new QueryClient();

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={lightTheme({
            accentColor: '#06955f',
            accentColorForeground: 'white',
            borderRadius: 'small',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          <Layout>{children}</Layout>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
