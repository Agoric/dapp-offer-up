import './App.css';
import { Logos } from './components/Logos';
import { Inventory } from './components/Inventory';
import { Trade } from './components/Trade';
import { ContractProvider } from './providers/Contract';
import {
  AgoricProvider,
  NetworkDropdown,
  NodeSelectorModal,
  OnboardIstModal,
} from '@agoric/react-components';
import { wallets } from 'cosmos-kit';
import '@agoric/react-components/dist/style.css';
import { useState } from 'react';
import { ThemeProvider, useTheme } from '@interchain-ui/react';

const localnet = {
  testChain: {
    chainId: 'agoriclocal',
    chainName: 'agoric-local',
  },
  apis: {
    rest: ['http://localhost:1317'],
    rpc: ['http://localhost:26657'],
  },
};

const emerynet = {
  testChain: {
    chainId: 'agoric-emerynet-8',
    chainName: 'agoric-emerynet',
  },
  apis: {
    rest: ['https://emerynet.api.agoric.net'],
    rpc: ['https://emerynet.rpc.agoric.net'],
  },
};

const mainnet = {
  apis: {
    rest: ['https://main.api.agoric.net'],
    rpc: ['https://main.rpc.agoric.net'],
  },
};
const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { themeClass } = useTheme();
  return (
    <ThemeProvider>
      <div className={themeClass}>
        <AgoricProvider
          wallets={wallets.extension}
          defaultNetworkConfig={localnet}
        >
          <ContractProvider>
            <Logos />
            <NetworkDropdown networkConfigs={[mainnet, emerynet, localnet]} />
            <OnboardIstModal />
            <NodeSelectorModal
              onClose={() => setIsOpen(false)}
              isOpen={isOpen}
            />
            <button className="button" onClick={() => setIsOpen(true)}>
              Change Endpoints
            </button>
            <h1>Items Listed on Offer Up</h1>
            <div className="card">
              <Trade />
              <hr />
              <Inventory />
            </div>
          </ContractProvider>
        </AgoricProvider>
      </div>
    </ThemeProvider>
  );
};

export default App;
