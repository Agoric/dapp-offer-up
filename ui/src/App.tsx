import './App.css';
import { Logos } from './components/Logos';
import { Inventory } from './components/Inventory';
import { Trade } from './components/Trade';
import { ContractProvider } from './providers/Contract';
import { AgoricProvider, AmountInput } from '@agoric/react-components';
import { wallets } from 'cosmos-kit';
import '@agoric/react-components/dist/style.css';
import { useState } from 'react';

const App = () => {
  const [value, setValue] = useState(0n);

  return (
    <AgoricProvider
      wallets={wallets.extension}
      defaultNetworkConfig={{
        testChain: {
          chainId: 'agoriclocal',
          chainName: 'agoric-local',
        },
        apis: {
          rest: ['http://localhost:1317'],
          rpc: ['http://localhost:26657'],
        },
      }}
    >
      <ContractProvider>
        <Logos />
        <h1>Items Listed on Offer Up</h1>
        <div className="card">
          <Trade />
          <hr />
          <Inventory />
          <AmountInput
            value={value}
            onChange={v => {
              console.log(v);
              setValue(v);
            }}
            decimalPlaces={6}
          />
        </div>
      </ContractProvider>
    </AgoricProvider>
  );
};

export default App;
