export interface CreateApproverInput {
  name: string;
  email: string;
  role: string;
}

export interface CreatePurchaseRequestInput {
  title: string;
  description: string;
  amount: number;
  requesterName: string;
  requesterEmail: string;
  approvers: CreateApproverInput[];
}