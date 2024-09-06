const OfferTile = () => {
  return (
    <div
      style={{
        backgroundColor: 'gray',
        textAlign: 'left',
        margin: '10px',
        maxWidth: '300px',
      }}
    >
      <div>Offer Tile</div>
      <div>Property Name:</div>
      <div>Property Value:</div>
      <div>IST demanded:</div>
      <input
        type="text"
        placeholder="Property Demanded"
        style={{ width: '300px' }}
      />
      <button>Submit offer</button>
    </div>
  );
};

export default OfferTile;
