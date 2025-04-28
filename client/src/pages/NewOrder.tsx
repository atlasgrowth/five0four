// client/src/pages/NewOrder.tsx
import React, { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  square_id: string;
  name: string;
  category: string;
  price_cents: number;
};

export const NewOrder: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({}); // square_id -> qty
  const [category, setCategory] = useState<string>("Shareables");

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  const cats = Array.from(new Set(items.map((i) => i.category)));

  const add = (id: string) =>
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));

  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1">
        <div className="mb-2">
          {cats.map((c) => (
            <button
              key={c}
              className={`mr-1 px-2 py-1 ${
                c === category ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items
            .filter((i) => i.category === category)
            .map((i) => (
              <button
                key={i.square_id}
                className="border p-2 text-left"
                onClick={() => add(i.square_id)}
              >
                <div>{i.name}</div>
                <div className="text-sm">${(i.price_cents / 100).toFixed(2)}</div>
              </button>
            ))}
        </div>
      </div>

      <div className="w-56 border-l pl-2">
        <h2 className="font-bold mb-2">Cart</h2>
        {Object.entries(cart).map(([id, qty]) => {
          const item = items.find((i) => i.square_id === id)!;
          return (
            <div key={id} className="flex justify-between">
              <span>
                {qty}× {item.name}
              </span>
              <span>${((item.price_cents * qty) / 100).toFixed(2)}</span>
            </div>
          );
        })}
        <hr className="my-2" />
        <div className="text-right font-bold">
          $
          {(
            Object.entries(cart).reduce(
              (sum, [id, qty]) =>
                sum + items.find((i) => i.square_id === id)!.price_cents * qty,
              0
            ) / 100
          ).toFixed(2)}
        </div>
        <button className="mt-4 w-full bg-green-600 text-white py-2 rounded">
          SEND (not wired yet)
        </button>
      </div>
    </div>
  );
};