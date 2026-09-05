import Link from "next/link";

export default function FinanceDashboardPage() {
  const financeActions = [
    { label: "Payments", detail: "Manage patient payments", href: "/billing/finance/payment", icon: "cash" },
    { label: "Add Payment", detail: "Create a new payment", href: "/billing/finance/payment/add", icon: "plus" },
    { label: "Expenses", detail: "Manage hospital expenses", href: "/billing/finance/expense", icon: "receipt" },
    { label: "Add Expense", detail: "Record a new expense", href: "/billing/finance/add_expense", icon: "plus" },
    { label: "Payment Categories", detail: "Configure categories", href: "/billing/finance/paymentCategories", icon: "list" },
    { label: "Expense Categories", detail: "Configure categories", href: "/billing/finance/expense_categories", icon: "list" },
    { label: "Doctor Commissions", detail: "Settle commissions", href: "/billing/finance/doctorscommission", icon: "role" },
    { label: "Lab Settlements", detail: "Settle lab referrals", href: "/billing/finance/doctorLabSettlements", icon: "db" },
    { label: "Activity Report", detail: "View activity logs", href: "/billing/finance/useractivityreport", icon: "clock" },
  ];

  return (
    <main className="dashboard-page">
      <section className="dashboard-grid">
        <section className="dashboard-main">
          <div className="hero-card" style={{ marginBottom: "24px" }}>
            <div>
              <p className="section-kicker">Financial Operations</p>
              <h1>Finance Command Center</h1>
              <p>Manage payments, expenses, commissions, and financial reports from one unified workspace.</p>
            </div>
            <div className="hero-actions">
              <Link className="button" href="/billing/finance/payment/add">
                New Payment
              </Link>
              <Link className="button secondary" href="/billing/finance/add_expense">
                New Expense
              </Link>
            </div>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Modules</p>
                <h2>Finance Workflows</h2>
              </div>
            </div>
            <div className="dashboard-widget-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", padding: "16px", gap: "16px" }}>
              {financeActions.map((action) => (
                <Link className="dashboard-widget default" href={action.href} key={action.href} style={{ textDecoration: "none" }}>
                  <p style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontWeight: 600, color: "#0f172a" }}>
                    {action.label}
                  </p>
                  <span style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", display: "block" }}>{action.detail}</span>
                </Link>
              ))}
            </div>
          </section>
        </section>

        <aside className="action-rail">
          <div className="panel compact-panel">
            <p className="section-kicker">Quick Reports</p>
            <h2>Financial Reporting</h2>
            <div className="link-list">
              <Link href="/billing/sales/financialReport">
                <strong>Revenue Report</strong>
                <span>View overall revenue</span>
              </Link>
              <Link href="/billing/finance/useractivityreport">
                <strong>User Activity</strong>
                <span>Audit trail for finance</span>
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
