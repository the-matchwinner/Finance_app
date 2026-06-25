const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';


const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };



  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    console.error('Network error:', netErr);
    throw new Error('Server unreachable. Please ensure the backend is running at ' + BASE_URL);
  }

  const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong (HTTP ' + response.status + ')');
  }

  return data;
};

export const login = async (email, password) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (data.success) {
    localStorage.setItem('token', data.data.token);
  }
  return data;
};

export const register = async (name, email, password) => {
  return request('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
};

export const getDashboard = async () => {
  return request('/dashboard');
};

export const getTransactions = async () => {
  return request('/transactions');
};

export const addTransaction = async (transactionData) => {
  return request('/transactions', {
    method: 'POST',
    body: transactionData,
  });
};

export const getBudgets = async () => {
  return request('/budgets');
};

export const setBudget = async (budgetData) => {
  return request('/budgets', {
    method: 'POST',
    body: budgetData,
  });
};

export const getDynamicAllocation = async () => {
  return request('/intelligence/allocation');
};

export const getBehaviorInsights = async () => {
  return request('/intelligence/behavior');
};

export const analyzeGoal = async (goalData) => {
  return request('/intelligence/goal-analysis', {
    method: 'POST',
    body: goalData,
  });
};

export const getGoals = async () => {
  return request('/goals');
};

export const createGoal = async (goalData) => {
  return request('/goals', {
    method: 'POST',
    body: goalData,
  });
};

export const updateGoalProgress = async (id, amount) => {
  return request(`/goals/${id}/progress?amount=${amount}`, {
    method: 'PATCH',
  });
};

export const updateGoal = async (id, goalData) => {
  return request(`/goals/${id}`, {
    method: 'PUT',
    body: goalData,
  });
};

export const deleteGoal = async (id) => {
  return request(`/goals/${id}`, {
    method: 'DELETE',
  });
};

export const getAlerts = async () => {
  return request('/alerts');
};

export const getSubscriptions = async () => {
  return request('/subscriptions');
};

export const uploadCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload', {
    method: 'POST',
    body: formData,
  });
};

export const askAI = async (prompt) => {
  return request('/ai/ask', {
    method: 'POST',
    body: { prompt },
  });
};

export const clearTransactions = async () => {
  return request('/transactions/clear', {
    method: 'DELETE',
  });
};

export const updateTransaction = async (id, note) => {
  return request(`/transactions/${id}`, {
    method: 'PATCH',
    body: { note },
  });
};

export const getConnectedBanks = async () => {
  return request('/banks');
};

export const connectBank = async (bankName) => {
  return request('/banks/connect', {
    method: 'POST',
    body: { bankName },
  });
};

export const disconnectBank = async (id) => {
  return request(`/banks/${id}`, {
    method: 'DELETE',
  });
};

export const createSetuConsent = async () => {
  return request('/banks/setu/consent', {
    method: 'POST',
  });
};

export const syncSetuData = async (consentId) => {
  return request('/banks/setu/callback', {
    method: 'POST',
    body: { consentId },
  });
};

export const scanReceiptOcr = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/transactions/ocr', {
    method: 'POST',
    body: formData,
  });
};


