'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Expense {
  id: number;
  category: string;
  amount: number;
  date: string;
  remarks: string;
  status: string;
}

const ExpenseListPage = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (user?.token) {
        try {
          // TODO: Fetch from API
          setExpenses([]);
        } catch (error) {
          console.error('Failed to fetch expenses:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchExpenses();
  }, [user]);

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Expenses</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item">Finance</li>
                <li className="breadcrumb-item active">Expenses</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Expense List</h3>
              <div className="card-tools">
                <Link href="/finance/add_expense" className="btn btn-primary btn-sm">
                  <i className="fa fa-plus"></i> Add Expense
                </Link>
                <Link href="/finance/expense_categories" className="btn btn-info btn-sm ml-2">
                  <i className="fa fa-list"></i> Categories
                </Link>
              </div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <table id="expensesTable" className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Remarks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">No expenses found</td>
                      </tr>
                    ) : (
                      expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td>{expense.date}</td>
                          <td>{expense.category}</td>
                          <td>${expense.amount.toFixed(2)}</td>
                          <td>{expense.remarks}</td>
                          <td>
                            <span className={`badge badge-${expense.status === 'Approved' ? 'success' : 'warning'}`}>
                              {expense.status}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-primary btn-sm" title="Edit">
                              <i className="fa fa-edit"></i>
                            </button>
                            {' '}
                            <button className="btn btn-danger btn-sm" title="Delete">
                              <i className="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ExpenseListPage;
