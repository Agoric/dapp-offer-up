const Form = ({ makeDepositOffer, makeWithdrawOffer }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
    <div className="card bg-white shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Deposit USDC</h2>
      <div className="flex flex-col form-control">
        <label className="mb-2">
          <span className="label-text">Amount to Deposit</span>
        </label>
        <input
          type="number"
          placeholder="0.00"
          className="pl-1 border border-gray-300 w-full text-lg rounded"
        />
      </div>
      <button
        className="btn btn-error w-full mt-4 bg-[#cd4246] text-white h-8 rounded"
        onClick={() => {
          console.log("clicked deposit");
          makeDepositOffer();
        }}
      >
        Deposit
      </button>
    </div>

    <div className="card bg-white shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Withdraw USDC</h2>
      <div className="flex flex-col form-control">
        <label className="mb-2">
          <span className="label-text">Amount to Withdraw</span>
        </label>
        <input
          type="number"
          placeholder="0.00"
          className="pl-1 border border-gray-300 w-full text-lg rounded"
        />
      </div>
      <p className="text-sm text-gray-500 mt-2 mb-4">
        Max withdrawable: 117,778 USDC
      </p>
      <button 
        className="btn btn-error w-full bg-[#cd4246] text-white h-8 rounded"
        onClick={() => {
            console.log("clicked withdraw");
            makeWithdrawOffer();
          }}
      >
        Withdraw
      </button>
    </div>
  </div>
);

export default Form;
