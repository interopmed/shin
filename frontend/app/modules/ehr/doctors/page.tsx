'use client'; 

import { useState, useEffect } from 'react';

// Define a type for the doctor data for TypeScript
type Doctor = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  speciality: number | null; // Assuming speciality is an ID
};

// Define the shape of the paginated API response
type ApiResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Doctor[];
};

const DoctorsPage = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const apiUrl = `http://127.0.0.1:8000/api/doctors/?page=${page}&search=${searchTerm}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: ApiResponse = await response.json();
        setData(result);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    const handler = setTimeout(() => {
      fetchDoctors();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [page, searchTerm]);

  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Page Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Doctors</h1>
            <p className="mt-1 text-md text-gray-600">A list of all doctors in your system.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              type="button"
              className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Add New Doctor
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Search by name, email, or phone..."
              className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
            />
        </div>

        {/* Doctors Table Card */}
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">ID</th>
                <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center p-10 text-gray-500">Loading...</td>
                </tr>
              ) : (
                data?.results.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{doctor.id}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{doctor.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{doctor.email || 'N/A'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{doctor.phone || 'N/A'}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <a href="#" className="text-blue-600 hover:text-blue-900">Edit</a>
                        <a href="#" className="text-red-600 hover:text-red-900 ml-4">Delete</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={!data?.previous || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {data ? Math.ceil(data.count / 25) : 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!data?.next || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorsPage;
