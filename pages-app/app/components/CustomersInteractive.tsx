"use client";

import { useState, useMemo } from "react";

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "active" | "trial" | "inactive";
}

interface CustomersInteractiveProps {
  initialCustomers: Customer[];
}

export default function CustomersInteractive({ initialCustomers }: CustomersInteractiveProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "warning">("success");

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    company: "",
    status: "trial" as "active" | "trial" | "inactive",
  });

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filter === "all" || customer.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [customers, searchTerm, filter]);

  const showToastMessage = (message: string, type: "success" | "error" | "warning" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCustomer.name || !newCustomer.email || !newCustomer.company) {
      showToastMessage("Please fill in all fields", "error");
      return;
    }

    const customer: Customer = {
      id: Date.now().toString(),
      ...newCustomer,
    };

    setCustomers([...customers, customer]);
    setShowModal(false);
    setNewCustomer({ name: "", email: "", company: "", status: "trial" });
    showToastMessage(`${customer.name} added successfully!`, "success");
  };

  const statusCounts = useMemo(() => {
    return {
      all: customers.length,
      active: customers.filter((c) => c.status === "active").length,
      trial: customers.filter((c) => c.status === "trial").length,
      inactive: customers.filter((c) => c.status === "inactive").length,
    };
  }, [customers]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>Customers</h2>
          <p>Manage and track your customer accounts across Cloudflare</p>
        </div>
        <button onClick={() => setShowModal(true)}>+ Add New Customer</button>
      </div>

      {/* Search Box */}
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({statusCounts.all})
        </button>
        <button
          className={`filter-btn ${filter === "active" ? "active" : ""}`}
          onClick={() => setFilter("active")}
        >
          Active ({statusCounts.active})
        </button>
        <button
          className={`filter-btn ${filter === "trial" ? "active" : ""}`}
          onClick={() => setFilter("trial")}
        >
          Trial ({statusCounts.trial})
        </button>
        <button
          className={`filter-btn ${filter === "inactive" ? "active" : ""}`}
          onClick={() => setFilter("inactive")}
        >
          Inactive ({statusCounts.inactive})
        </button>
      </div>

      {/* Customers List */}
      <div className="customers-list">
        {filteredCustomers.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}>
            <p>No customers found</p>
          </div>
        ) : (
          filteredCustomers.map((customer, index) => (
            <div
              key={customer.id}
              className="customer-card animate-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                <h3>{customer.name}</h3>
                <span className={`status status-${customer.status}`}>{customer.status}</span>
              </div>
              <p style={{ marginBottom: "0.25rem" }}>{customer.company}</p>
              <p style={{ fontSize: "0.875rem" }}>
                <strong>Email:</strong> {customer.email}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Customer</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleAddCustomer}>
              <div className="form-group">
                <label htmlFor="name">Customer Name *</label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Acme Corp"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="contact@acme.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="company">Company/Industry *</label>
                <input
                  id="company"
                  type="text"
                  className="form-input"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                  placeholder="E-commerce"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  className="form-select"
                  value={newCustomer.status}
                  onChange={(e) => setNewCustomer({ ...newCustomer, status: e.target.value as "active" | "trial" | "inactive" })}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="toast-container">
          <div className={`toast ${toastType}`}>
            <span className="toast-icon">
              {toastType === "success" && "✓"}
              {toastType === "error" && "✕"}
              {toastType === "warning" && "⚠"}
            </span>
            <span className="toast-message">{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
