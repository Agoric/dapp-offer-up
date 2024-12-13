import Form from './Form';
import Cards from './Cards';
import Transactions from './Transactions';

const headerData = [
  { title: 'Total Pool Balance', value: '$1,234,567', description: 'USDC' },
  { title: 'Your Pool Share', value: '$123,456', description: '10% of pool' },
  { title: 'Awaiting Settlement', value: '$5,678', description: 'USDC' },
  { title: 'Fees Earned (24h)', value: '$890', description: 'USDC' },
];

const Dashboard = ({
  makeDepositOffer,
  makeWithdrawOffer,
}: Record<string, Function>) => (
  <div className="p-6 bg-gray-100 min-h-screen">
    <Cards data={headerData} />
    <Form
      makeDepositOffer={makeDepositOffer}
      makeWithdrawOffer={makeWithdrawOffer}
    />
    <Transactions />
  </div>
);

export default Dashboard;
