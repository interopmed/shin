// API service for Django backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface RequestOptions extends RequestInit {
  token?: string;
}

class APIService {
  private baseURL: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    isRetry: boolean = false
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

    const isFormDataBody = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

    const headers: Record<string, string> = {};

    if (!isFormDataBody) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (fetchOptions.headers) {
      Object.assign(headers, fetchOptions.headers);
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    const getErrorMessage = (error: any): string => {
      if (!error) return '';
      if (typeof error === 'string') return error;
      if (typeof error?.detail === 'string') return error.detail;
      if (typeof error?.message === 'string') return error.message;
      if (Array.isArray(error?.non_field_errors) && error.non_field_errors.length > 0) {
        return String(error.non_field_errors[0]);
      }
      return '';
    };

    if (!response.ok) {
      if (response.status === 401) {
        const isAuthEndpoint = endpoint.includes('/api/auth/login/') || endpoint.includes('/api/auth/refresh/');
        const shouldAttemptRefresh = !isRetry && !isAuthEndpoint;
        if (shouldAttemptRefresh) {
          const newAccessToken = await this.refreshAccessToken();
          if (newAccessToken) {
            return this.request<T>(endpoint, { ...options, token: newAccessToken }, true);
          }
        }

        const error = await response.json().catch(() => ({
          message: response.statusText,
        }));

        if (isAuthEndpoint) {
          throw new Error(getErrorMessage(error) || 'Invalid email or password');
        }

        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error(getErrorMessage(error) || 'Session expired. Please login again.');
      }

      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(getErrorMessage(error) || `API request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null as T;
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseURL}/api/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data?.access) return null;

      const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage;
      storage.setItem('token', data.access);
      return data.access as string;
    })();

    const token = await this.refreshPromise;
    this.refreshPromise = null;
    return token;
  }

  private async fetchAllPages<T>(endpoint: string, token: string, params?: Record<string, any>) {
    const results: T[] = [];
    let page = 1;

    while (true) {
      const queryParams = new URLSearchParams({
        ...(params || {}),
        page: String(page),
      }).toString();

      const response = await this.request<any>(`${endpoint}?${queryParams}`, { token });

      if (Array.isArray(response)) {
        return response as T[];
      }

      if (Array.isArray(response?.results)) {
        results.push(...response.results);
        if (!response.next) break;
        page += 1;
        continue;
      }

      return results;
    }

    return results;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(token: string) {
    return this.request('/api/auth/logout/', {
      method: 'POST',
      token,
    });
  }

  async register(data: any) {
    return this.request('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Patients endpoints
  async getPatients(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/patients/${queryString}`, { token });
    // Handle paginated response from Django REST Framework
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response)) return response;
    return [];
  }

  async getPatientsPaginated(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<any>(`/api/patients/${queryString}`, { token });
  }

  async getAllPatients(token: string, params?: Record<string, any>) {
    return this.fetchAllPages<any>('/api/patients/', token, params);
  }

  async searchPatients(token: string, query: string, limit: number = 20) {
    const queryString = new URLSearchParams({
      q: query,
      limit: String(limit),
    }).toString();
    return this.request<any[]>(`/api/patients/search/?${queryString}`, { token });
  }

  async getPatient(token: string, id: string) {
    return this.request(`/api/patients/${id}/`, { token });
  }

  async createPatient(token: string, data: any) {
    return this.request('/api/patients/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updatePatient(token: string, id: string, data: any) {
    return this.request(`/api/patients/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deletePatient(token: string, id: string) {
    return this.request(`/api/patients/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  async getPatientMaterials(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/patient-materials/${queryString}`, { token });
    return response.results || response;
  }

  async createPatientMaterial(token: string, data: FormData) {
    return this.request('/api/patient-materials/', {
      method: 'POST',
      token,
      body: data,
    });
  }

  async updatePatientMaterial(token: string, id: number | string, data: FormData) {
    return this.request(`/api/patient-materials/${id}/`, {
      method: 'PATCH',
      token,
      body: data,
    });
  }

  async deletePatientMaterial(token: string, id: number | string) {
    return this.request(`/api/patient-materials/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  // Sales endpoints
  async getSales(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/sales/sales/${queryString}`, { token });
    return response.results || response;
  }

  async getSalesSummary(token: string) {
    return this.request<any>('/api/sales/sales/summary/', { token });
  }

  async getTodaySales(token: string) {
    return this.request<any>('/api/sales/sales/today/', { token });
  }

  async getSalesFinancialReport(token: string) {
    return this.request<any>('/api/sales/sales/financial_report/', { token });
  }

  async getSalesMonthlyReport(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request<any>(`/api/sales/sales/monthly_report/${queryString}`, { token });
  }

  async createSale(token: string, data: any) {
    return this.request('/api/sales/sales/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  // Doctors endpoints
  async getDoctors(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/doctors/${queryString}`, { token });
    // Handle paginated response from Django REST Framework
    return response.results || response;
  }

  async getDoctorsPaginated(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<any>(`/api/doctors/${queryString}`, { token });
  }

  async searchDoctors(token: string, query: string, limit: number = 20) {
    const queryString = new URLSearchParams({
      q: query,
      limit: String(limit),
    }).toString();
    return this.request<any[]>(`/api/doctors/search/?${queryString}`, { token });
  }

  async getDoctor(token: string, id: string) {
    return this.request(`/api/doctors/${id}/`, { token });
  }

  async createDoctor(token: string, data: any) {
    return this.request('/api/doctors/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateDoctor(token: string, id: string, data: any) {
    return this.request(`/api/doctors/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteDoctor(token: string, id: string) {
    return this.request(`/api/doctors/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  // Appointment/Holiday endpoints
  async getHolidays(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/appointment/holidays/${queryString}`, { token });
    return response.results || response;
  }

  async createHoliday(token: string, data: any) {
    return this.request('/api/appointment/holidays/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteHoliday(token: string, id: number | string) {
    return this.request(`/api/appointment/holidays/${id}/`, {
      method: 'DELETE',
      token,
    }); 
  }

  // Finance endpoints
  async getPaymentCategories(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/finance/payment-categories/${queryString}`, { token });
    return response.results || response;
  }

  async getAllPaymentCategories(token: string, params?: Record<string, any>) {
    return this.fetchAllPages<any>('/api/finance/payment-categories/', token, params);
  }

  async getPayments(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/finance/payments/${queryString}`, { token });
    return response.results || response;
  }

  async getPaymentsPage(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<any>(`/api/finance/payments/${queryString}`, { token });
  }

  async getPaymentStatistics(token: string, params?: Record<string, any>) {
    const queryString = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request<any>(`/api/finance/payments/statistics/${queryString}`, { token });
  }

  async getPaymentMonthlySummary(token: string, params?: Record<string, any>) {
    const queryString = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request<any>(`/api/finance/payments/monthly-summary/${queryString}`, { token });
  }

  async getPayment(token: string, id: number | string) {
    return this.request(`/api/finance/payments/${id}/`, { token });
  }

  async createPayment(token: string, data: any) {
    return this.request('/api/finance/payments/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updatePayment(token: string, id: number | string, data: any) {
    return this.request(`/api/finance/payments/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async createPaymentItem(token: string, data: any) {
    return this.request('/api/finance/payment-items/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updatePaymentItem(token: string, id: number | string, data: any) {
    return this.request(`/api/finance/payment-items/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deletePaymentItem(token: string, id: number | string) {
    return this.request(`/api/finance/payment-items/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  async getDoctorSettlements(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<any>(`/api/finance/doctor-settlements/${queryString}`, { token });
  }

  async createDoctorSettlement(token: string, data: any) {
    return this.request('/api/finance/doctor-settlements/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async getDoctorSettlementStats(token: string, params?: Record<string, any>) {
    const queryString = params ? `?${new URLSearchParams(params as any)}` : '';
    return this.request<any>(`/api/finance/doctor-settlements/statistics/${queryString}`, { token });
  }

  // Expense endpoints
  async getExpenseCategories(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/finance/expense-categories/${queryString}`, { token });
    return response.results || response;
  }

  async createExpenseCategory(token: string, data: any) {
    return this.request('/api/finance/expense-categories/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateExpenseCategory(token: string, id: number | string, data: any) {
    return this.request(`/api/finance/expense-categories/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteExpenseCategory(token: string, id: number | string) {
    return this.request(`/api/finance/expense-categories/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  async getExpenses(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/finance/expenses/${queryString}`, { token });
    return response.results || response;
  }

  async getExpensesPage(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<any>(`/api/finance/expenses/${queryString}`, { token });
  }

  async createExpense(token: string, data: any) {
    return this.request('/api/finance/expenses/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateExpense(token: string, id: number | string, data: any) {
    return this.request(`/api/finance/expenses/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(token: string, id: number | string) {
    return this.request(`/api/finance/expenses/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  // Settings menu endpoints
  async getMenus(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/settings/menus/${queryString}`, { token });
    return response.results || response;
  }

  async getAllMenus(token: string, params?: Record<string, any>) {
    return this.fetchAllPages<any>('/api/settings/menus/', token, params);
  }

  async getGroups(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/settings/groups/${queryString}`, { token });
    return response.results || response;
  }

  async createMenu(token: string, data: any) {
    return this.request('/api/settings/menus/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateMenu(token: string, id: number | string, data: any) {
    return this.request(`/api/settings/menus/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteMenu(token: string, id: number | string) {
    return this.request(`/api/settings/menus/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  async getMenuSubs(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/settings/menu-subs/${queryString}`, { token });
    return response.results || response;
  }

  async getAllMenuSubs(token: string, params?: Record<string, any>) {
    return this.fetchAllPages<any>('/api/settings/menu-subs/', token, params);
  }

  async createMenuSub(token: string, data: any) {
    return this.request('/api/settings/menu-subs/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateMenuSub(token: string, id: number | string, data: any) {
    return this.request(`/api/settings/menu-subs/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteMenuSub(token: string, id: number | string) {
    return this.request(`/api/settings/menu-subs/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  // Lab endpoints
  async getLabTests(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<any>(`/api/lab/orders/${queryString}`, { token });
  }

  async getLabTest(token: string, id: string) {
    return this.request(`/api/lab/orders/${id}/`, { token });
  }

  async getLabOrderCategories(token: string, orderId: string | number) {
    return this.request(`/api/lab/orders/order/${orderId}/categories/`, { token });
  }

  async getLabCategory(token: string, id: number | string) {
    return this.request(`/api/lab/categories/${id}/`, { token });
  }

  async createLabCategory(token: string, data: any) {
    return this.request('/api/lab/categories/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateLabCategory(token: string, id: number | string, data: any) {
    return this.request(`/api/lab/categories/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteLabCategory(token: string, id: number | string) {
    return this.request(`/api/lab/categories/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  async getLabCategories(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/lab/categories/${queryString}`, { token });
    return response.results || response;
  }

  async getAllLabCategories(token: string, params?: Record<string, any>) {
    return this.fetchAllPages<any>('/api/lab/categories/', token, params);
  }

  async getLabTestDefinitions(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/lab/definitions/${queryString}`, { token });
    return response.results || response;
  }

  async getLabSections(token: string, categoryId: number | string) {
    const response = await this.request<any>(`/api/lab/categories/${categoryId}/sections/`, { token });
    return response.results || response;
  }

  async getLabResults(token: string, params?: any) {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    const response = await this.request<any>(`/api/lab/results/${queryString}`, { token });
    return response.results || response;
  }

  async createLabResult(token: string, data: any) {
    return this.request('/api/lab/results/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateLabResult(token: string, id: number | string, data: any) {
    return this.request(`/api/lab/results/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async createLabTest(token: string, data: any) {
    return this.request('/api/lab/orders/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateLabTest(token: string, id: string, data: any) {
    return this.request(`/api/lab/orders/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteLabTest(token: string, id: string) {
    return this.request(`/api/lab/orders/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  // Dashboard stats
  async getDashboardStats(token: string) {
    return this.request('/api/dashboard/stats/', { token });
  }

  // Notifications
  async getNotifications(token: string) {
    return this.request('/api/notifications/', { token });
  }

  async getPaymentCount(token: string, date?: string) {
    const params = date ? `?date=${date}` : '';
    return this.request(`/api/finance/payment-count/${params}`, { token });
  }

  async getPatientCount(token: string, date?: string) {
    const params = date ? `?date=${date}` : '';
    return this.request(`/api/patients/count/${params}`, { token });
  }

  async getMedicineCount(token: string, date?: string) {
    const params = date ? `?date=${date}` : '';
    return this.request(`/api/stocks/count/${params}`, { token });
  }

  async getStocks(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/stocks/stocks/${queryString}`, { token });
    return response.results || response;
  }

  async getStocksPage(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/stocks/stocks/${queryString}`, { token });
    return response;
  }

  async createStock(token: string, data: any) {
    return this.request('/api/stocks/stocks/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async getStockCategories(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/stocks/stock-categories/${queryString}`, { token });
    return response.results || response;
  }

  async createStockCategory(token: string, data: any) {
    return this.request('/api/stocks/stock-categories/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateStockCategory(token: string, id: number, data: any) {
    return this.request(`/api/stocks/stock-categories/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteStockCategory(token: string, id: number) {
    return this.request(`/api/stocks/stock-categories/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  async getStockAlerts(token: string) {
    const response = await this.request<any>('/api/stocks/stocks/low_stock/', { token });
    return response.results || response;
  }

  async getEmployeesPage(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<any>(`/api/employees/employees/${queryString}`, { token });
  }

  async getEmployee(token: string, id: number | string) {
    return this.request<any>(`/api/employees/employees/${id}/`, { token });
  }

  async getDesignations(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/employees/designations/${queryString}`, { token });
    return response.results || response;
  }

  async createEmployee(token: string, data: any) {
    return this.request('/api/employees/employees/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async getEmployeeUnits(token: string, id: number | string) {
    return this.request<any[]>(`/api/employees/employees/${id}/units/`, { token });
  }

  async updateEmployeeUnits(token: string, id: number | string, data: any) {
    return this.request(`/api/employees/employees/${id}/units/`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async getFacilities(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/facilities/${queryString}`, { token });
    return response.results || response;
  }

  async getServiceUnits(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/service-units/${queryString}`, { token });
    return response.results || response;
  }

  async updateEmployee(token: string, id: number | string, data: any) {
    return this.request(`/api/employees/employees/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteEmployee(token: string, id: number | string) {
    return this.request(`/api/employees/employees/${id}/`, {
      method: 'DELETE',
      token,
    });
  }

  async getEmployeeDepartments(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/employees/departments/${queryString}`, { token });
    return response.results || response;
  }

  async getUsers(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/employees/users/${queryString}`, { token });
    return response.results || response;
  }

  async createEmployeeDepartment(token: string, data: any) {
    return this.request('/api/employees/departments/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async getAppointments(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/appointment/appointments/${queryString}`, { token });
    return response.results || response;
  }

  async getTodayAppointments(token: string) {
    const response = await this.request<any>('/api/appointment/appointments/today/', { token });
    return response.results || response;
  }

  async getUpcomingAppointments(token: string) {
    const response = await this.request<any>('/api/appointment/appointments/upcoming/', { token });
    return response.results || response;
  }

  async createAppointment(token: string, data: any) {
    return this.request('/api/appointment/appointments/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async getAppointment(token: string, id: number | string) {
    return this.request<any>(`/api/appointment/appointments/${id}/`, { token });
  }

  async updateAppointment(token: string, id: number | string, data: any) {
    return this.request(`/api/appointment/appointments/${id}/`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async getSchedules(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/appointment/schedules/${queryString}`, { token });
    return response.results || response;
  }

  // Finance / Charge Capture
  async getChargeItems(token: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/finance/charge-items/${queryString}`, { token });
    return response.results || response;
  }

  async createChargeItem(token: string, data: any) {
    return this.request('/api/finance/charge-items/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateChargeItem(token: string, id: number | string, data: any) {
    return this.request(`/api/finance/charge-items/${id}/`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    });
  }

  // Radiology / Imaging
  async getImagingRequests(token?: string, params?: Record<string, string>) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await this.request<any>(`/api/imaging-requests/${queryString}`, { token });
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response)) return response;
    return [];
  }

  async getImagingRequestById(id: number | string, token?: string) {
    return this.request<any>(`/api/imaging-requests/${id}/`, { token });
  }

  async createImagingRequest(data: any, token?: string) {
    return this.request('/api/imaging-requests/', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateImagingRequest(id: number | string, data: any, token?: string) {
    return this.request(`/api/imaging-requests/${id}/`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    });
  }

  async completeImagingStudy(id: number | string, data: { findings: string; impression: string; radiologist_name?: string; notes?: string }, token?: string) {
    return this.request(`/api/imaging-requests/${id}/complete_study/`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async startImagingScan(id: number | string, token?: string) {
    return this.request(`/api/imaging-requests/${id}/start_scan/`, {
      method: 'POST',
      token,
    });
  }
}

export const api = new APIService(API_BASE_URL);
export default api;

