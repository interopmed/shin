'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/helpers/currency';

interface Doctor {
  id: number;
  name: string;
  phone?: string;
  department?: string;
}

interface SettlementStats {
  total_amount?: number;
  total_paid?: number;
  total_balance?: number;
  payment_count?: number;
  total_settled?: number;
  total_commission?: number;
  settlement_count?: number;
  due?: number;
}

interface DoctorCommissionRow {
  doctorId: number;
  doctorName: string;
  phone?: string;
  department?: string;
  totalAmount: number;
  totalSettled: number;
  totalCommission: number;
  due: number;
  paymentCount: number;
  settlementCount: number;
}

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

const pageSize = 50;

const DoctorsCommissionPage = () => {
  const { user } = useAuth();

  const [rows, setRows] = useState<DoctorCommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  const fetchAllDoctors = async (token: string): Promise<Doctor[]> => {
    const allDoctors: Doctor[] = [];
    let page = 1;

    while (true) {
      const response = await api.getDoctorsPaginated(token, {
        page: String(page),
        page_size: String(pageSize),
        ordering: 'name',
      });

      if (Array.isArray(response)) {
        allDoctors.push(...response);
        break;
      }

      const pageRows: Doctor[] = response?.results || [];
      allDoctors.push(...pageRows);

      if (!response?.next) break;
      page += 1;
    }

    return allDoctors;
  };

  const fetchDoctorStats = async (token: string, doctorId: number): Promise<SettlementStats> => {
    return api.getDoctorSettlementStats(token, {
      doctor: String(doctorId),
      date_from: dateFrom,
      date_to: dateTo,
    });
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const doctors = await fetchAllDoctors(user.token);

        const statsResults = await Promise.allSettled(
          doctors.map(async (doctor) => {
            const stats = await fetchDoctorStats(user.token, doctor.id);

            return {
              doctorId: doctor.id,
              doctorName: doctor.name || `Doctor #${doctor.id}`,
              phone: doctor.phone,
              department: doctor.department,
              totalAmount: Number(stats?.total_amount || 0),
              totalSettled: Number(stats?.total_settled || 0),
              totalCommission: Number(stats?.total_commission || 0),
              due: Number(stats?.due || 0),
              paymentCount: Number(stats?.payment_count || 0),
              settlementCount: Number(stats?.settlement_count || 0),
            } as DoctorCommissionRow;
          })
        );

        const mapped = statsResults
          .filter((result): result is PromiseFulfilledResult<DoctorCommissionRow> => result.status === 'fulfilled')
          .map((result) => result.value)
          .filter((row) => (
            row.paymentCount > 0 ||
            row.settlementCount > 0 ||
            row.totalAmount > 0 ||
            row.totalSettled > 0 ||
            row.totalCommission > 0 ||
            row.due !== 0
          ))
          .sort((a, b) => b.due - a.due);

        setRows(mapped);
      } catch (err: any) {
        console.error('Failed to load doctors commission report:', err);
        setError(err?.message || 'Failed to load doctors commission report.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, dateFrom, dateTo]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      return (
        row.doctorName.toLowerCase().includes(term) ||
        String(row.doctorId).includes(term) ||
        (row.phone || '').toLowerCase().includes(term) ||
        (row.department || '').toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Doctors Commission</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link href="/">Home</Link></li>
                <li className="breadcrumb-item"><Link href="/finance/payment">Finance</Link></li>
                <li className="breadcrumb-item active">Doctors Commission</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Doctor Commission Summary</h3>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-3 mb-2">
                  <label>Date From</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                </div>
                <div className="col-md-3 mb-2">
                  <label>Date To</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </div>
                <div className="col-md-6 mb-2">
                  <label>Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Doctor ID, name, phone, department"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border" role="status"></div>
                </div>
              ) : error ? (
                <div className="alert alert-warning">{error}</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Doctor ID</th>
                        <th>Doctor</th>
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Total Amount</th>
                        <th>Settled</th>
                        <th>Commission</th>
                        <th>Due</th>
                        <th>Payments</th>
                        <th>Settlements</th>
                        <th>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center">No doctors found</td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => (
                          <tr key={row.doctorId}>
                            <td>{row.doctorId}</td>
                            <td>{row.doctorName}</td>
                            <td>{row.phone || '-'}</td>
                            <td>{row.department || '-'}</td>
                            <td>{formatCurrency(row.totalAmount)}</td>
                            <td>{formatCurrency(row.totalSettled)}</td>
                            <td>{formatCurrency(row.totalCommission)}</td>
                            <td>
                              <span className={`badge badge-${row.due > 0 ? 'danger' : 'success'}`}>
                                {formatCurrency(row.due)}
                              </span>
                            </td>
                            <td>{row.paymentCount}</td>
                            <td>{row.settlementCount}</td>
                            <td>
                              <Link href={`/finance/doctorLabSettlements?doctor=${row.doctorId}`} className="btn btn-primary btn-xs">
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DoctorsCommissionPage;
