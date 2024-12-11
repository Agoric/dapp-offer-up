interface CardData {
  title: string;
  value: string;
  description: string;
}

interface CardsProps {
  data: CardData[];
}

const Cards: React.FC<CardsProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    {data.map((item, index) => (
      <div key={index} className="card bg-white shadow p-4">
        <h2 className="text-lg font-semibold">{item.title}</h2>
        <p className="text-2xl font-bold">{item.value}</p>
        <p className="text-sm text-gray-500">{item.description}</p>
      </div>
    ))}
  </div>
);

export default Cards;
