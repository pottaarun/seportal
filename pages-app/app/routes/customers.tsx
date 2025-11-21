import CustomersInteractive from "../components/CustomersInteractive";

export function meta() {
  return [
    { title: "Customers - SolutionHub" },
    { name: "description", content: "Manage your customers" },
  ];
}

export default function Customers() {
  // Mock data - in SPA mode, could fetch from API
  const customers = [
    { id: '1', name: 'Acme Corp', email: 'contact@acme.com', company: 'E-commerce', status: 'active' as const },
    { id: '2', name: 'TechStart Inc', email: 'hello@techstart.com', company: 'SaaS Startup', status: 'trial' as const },
    { id: '3', name: 'Global Finance Ltd', email: 'info@globalfinance.com', company: 'Financial Services', status: 'active' as const },
    { id: '4', name: 'MediaStream Co', email: 'support@mediastream.com', company: 'Media & Entertainment', status: 'active' as const },
    { id: '5', name: 'CloudNine Solutions', email: 'hello@cloudnine.com', company: 'Cloud Services', status: 'trial' as const },
    { id: '6', name: 'DataDrive Systems', email: 'contact@datadrive.com', company: 'Data Analytics', status: 'inactive' as const },
  ];

  return <CustomersInteractive initialCustomers={customers} />;
}
