import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

type Item = {
  id: number;
  square_id: string;
  name: string;
  price_cents: number;
  category: string;
};

export default function ServerPad() {
  const [floor, setFloor] = useState<number | null>(null);
  const [bay, setBay] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cat, setCat] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [, navigate] = useLocation();

  /* -------- fetch menu once -------- */
  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data: Item[]) => {
        setItems(data);
        if (data.length) setCat(data[0].category);
      });
  }, []);

  /* -------- early UI: pick floor/bay -------- */
  if (floor === null)
    return (
      <div className="p-4">
        <h1 className="text-xl mb-2">Select Floor</h1>
        {[1, 2, 3].map((f) => (
          <button key={f} className="px-4 py-2 m-1 bg-gray-200" onClick={() => setFloor(f)}>
            Floor {f}
          </button>
        ))}
      </div>
    );

  if (bay === null)
    return (
      <div className="p-4">
        <h1 className="text-xl mb-2">Floor {floor} – Pick Bay</h1>
        {Array.from({ length: 26 }, (_, i) => 100 * floor + 1 + i).map((b) => (
          <button key={b} className="px-3 py-1 m-1 bg-gray-200" onClick={() => setBay(b)}>
            {b}
          </button>
        ))}
    </div>
    );

  /* -------- main menu UI -------- */
  // Get unique categories using a different approach to avoid Set iteration issues
  const cats = items
    .map(i => i.category)
    .filter((cat, index, self) => self.indexOf(cat) === index);
  
  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const total = Object.entries(cart).reduce(
    (sum, [id, q]) => sum + (items.find((i) => i.square_id === id)?.price_cents || 0) * q,
    0
  );

  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1">
        {/* category tabs */}
        <div className="mb-2">
          {cats.map((c) => (
            <button
              key={c}
              className={`mr-1 px-2 py-1 ${c === cat ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* items grid */}
        <div className="grid grid-cols-2 gap-2">
          {items
            .filter((i) => i.category === cat)
            .map((i) => (
              <button
                key={i.square_id}
                onClick={() => add(i.square_id)}
                className="border p-2 text-left"
              >
                <div>{i.name}</div>
                <div className="text-sm">${(i.price_cents / 100).toFixed(2)}</div>
              </button>
            ))}
        </div>
      </div>

      {/* cart */}
      <div className="w-56 border-l pl-2">
        <h2 className="font-bold mb-2">Bay {bay}</h2>
        {Object.entries(cart).length === 0 && <div>No items</div>}
        {Object.entries(cart).map(([id, q]) => {
          const itm = items.find((i) => i.square_id === id)!;
          return (
            <div key={id} className="flex justify-between">
              <span>{q}× {itm.name}</span>
              <span>${((itm.price_cents * q) / 100).toFixed(2)}</span>
            </div>
          );
        })}
        <hr className="my-2" />
        <div className="text-right font-bold">
          ${ (total / 100).toFixed(2) }
        </div>
        <button
          className={`mt-4 w-full py-2 rounded ${sending ? 'bg-gray-400' : 'bg-green-600 text-white'}`}
          onClick={async () => {
            if (sending || Object.keys(cart).length === 0) return;
            
            setSending(true);
            try {
              const payload = {
                floor,
                bay,
                items: Object.entries(cart).map(([sid, qty]) => {
                  const itm = items.find((i) => i.square_id === sid)!;
                  return { id: itm.id, name: itm.name, price_cents: itm.price_cents, qty };
                }),
              };
              
              const resp = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }).then((r) => r.json());
              
              console.log("Square order:", resp.squareOrderId);
              setCart({});
              alert(`Order sent! Square ID: ${resp.squareOrderId}`);
              // Optional: Navigate to kitchen view
              // navigate("/kitchen");
            } catch (err) {
              console.error("Error sending order:", err);
              alert("Error sending order. Please try again.");
            } finally {
              setSending(false);
            }
          }}
          disabled={sending || Object.keys(cart).length === 0}
        >
          {sending ? "SENDING..." : "SEND ORDER"}
        </button>
      </div>
    </div>
  );
}
