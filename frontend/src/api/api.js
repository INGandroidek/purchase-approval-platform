import axios from 'axios';

const API_URL =
  'https://jguzyqqsw9.execute-api.us-east-1.amazonaws.com/prod';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function createPurchaseRequest(data) {
  const response = await api.post(
    '/purchase-requests',
    data,
  );

  return response.data;
}

export async function getApprovalByToken(token) {
  const response = await api.get(
    `/approvals/${encodeURIComponent(token)}`,
  );

  return response.data;
}

export async function validateOtp(token, otp) {
  const response = await api.post(
    `/approvals/${encodeURIComponent(token)}/otp`,
    { otp },
  );

  return response.data;
}

export async function processDecision(token, decision) {
  const response = await api.post(
    `/approvals/${encodeURIComponent(token)}/decision`,
    { decision },
  );

  return response.data;
}
