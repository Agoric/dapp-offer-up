interface Transaction {
  date: string;
  type: string;
  amount: string;
  source: string;
  destination: string;
}

const transactions = [
  {
    date: "2024-11-23 14:30",
    type: "Deposit",
    amount: "10,000",
    source: "agoric1...xyz",
    destination: "pool1...abc",
  },
  {
    date: "2024-11-22 09:15",
    type: "Withdrawal",
    amount: "5,000",
    source: "pool1...abc",
    destination: "agoric1...xyz",
  },
];

const columns = [
  {
    Header: "Date",
    accessor: "date",
  },
  {
    Header: "Type",
    accessor: "type",
    Cell: ({ value }) => (
      <span className={value === "Deposit" ? "text-green-500" : "text-red-500"}>
        {value}
      </span>
    ),
  },
  {
    Header: "Amount (USDC)",
    accessor: "amount",
  },
  {
    Header: "Source",
    accessor: "source",
  },
  {
    Header: "Destination",
    accessor: "destination",
  },
];
const Transactions = () => (
  <div className="card bg-white shadow p-4">
    <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.accessor} className="px-4 py-2 text-left">
                {column.Header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.accessor} className="px-4 py-2">
                  {column.Cell
                    ? column.Cell({
                        value:
                          transaction[column.accessor as keyof Transaction],
                      })
                    : transaction[column.accessor as keyof Transaction]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Transactions;
