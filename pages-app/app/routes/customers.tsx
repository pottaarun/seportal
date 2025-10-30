import type { Route } from "./+types/customers";

// Loader runs on the server, has access to Cloudflare bindings
export async function loader({ context }: Route.LoaderArgs) {
  // Access Cloudflare bindings via context.cloudflare.env
  // const { DB, KV } = context.cloudflare.env;

  // Example: Fetch customers from D1
  // const customers = await DB.prepare('SELECT * FROM customers LIMIT 50').all();

  // For now, return mock data
  const customers = [
    { id: '1', name: 'Acme Corp', email: 'contact@acme.com', status: 'active' },
    { id: '2', name: 'TechStart Inc', email: 'hello@techstart.com', status: 'trial' },
  ];

  return { customers };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Customers - SE Portal" },
    { name: "description", content: "Manage your customers" },
  ];
}

export default function Customers({ loaderData }: Route.ComponentProps) {
  const { customers } = loaderData;

  return (
    <div>
      <h2>Customers</h2>
      <p>Manage and track your customer accounts</p>

      <div className="customers-list">
        {customers.map((customer) => (
          <div key={customer.id} className="customer-card">
            <h3>{customer.name}</h3>
            <p>Email: {customer.email}</p>
            <span className={`status status-${customer.status}`}>
              {customer.status}
            </span>
          </div>
        ))}
      </div>

      <button>Add New Customer</button>
    </div>
  );
}
