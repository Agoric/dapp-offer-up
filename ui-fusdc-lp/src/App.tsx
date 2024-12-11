import { AgoricProvider } from '@agoric/react-components';
import { wallets } from 'cosmos-kit';
import { ThemeProvider, useTheme } from '@interchain-ui/react';
import './index.css';
import '@agoric/react-components/dist/style.css';
import { Navbar } from './components/Navbar';
import Dashboard from './components/Dashboard';

function App() {
  const { themeClass } = useTheme();
  return (
    <ThemeProvider>
      <div className={themeClass}>
        <AgoricProvider
          wallets={wallets.extension}
          agoricNetworkConfigs={[
            {
              testChain: {
                chainId: 'agoriclocal',
                chainName: 'agoric-local'
              },
              apis: {
                rest: ['http://localhost:1317'],
                rpc: ['http://localhost:26657']
              }
            }
          ]}
          defaultChainName="agoric-local"
        >
          <Navbar/>
          <Dashboard/>
        </AgoricProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;