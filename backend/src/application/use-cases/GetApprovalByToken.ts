import { ApproverRepository } from '../ports/ApproverRepository.js';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository.js';

export interface ApprovalDetails {
  request: {
    id: string;
    title: string;
    description: string;
    amount: number;
    requesterName: string;
    createdAt: string;
  };

  approver: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    signedAt?: string;
  };
}

export class GetApprovalByToken {
  constructor(
    private readonly approverRepository: ApproverRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
  ) {}

  async execute(token: string): Promise<ApprovalDetails> {
    if (!token.trim()) {
      throw new Error('Approver token is required');
    }

    const approver =
      await this.approverRepository.findByToken(token);

    if (!approver) {
      throw new Error('Invalid approver token');
    }

    const result =
      await this.purchaseRequestRepository.findById(
        approver.requestId,
      );

    if (!result) {
      throw new Error('Purchase request not found');
    }

    return {
      request: {
        id: result.purchaseRequest.id,
        title: result.purchaseRequest.title,
        description: result.purchaseRequest.description,
        amount: result.purchaseRequest.amount,
        requesterName: result.purchaseRequest.requesterName,
        createdAt: result.purchaseRequest.createdAt,
      },

      approver: {
        id: approver.id,
        name: approver.name,
        email: approver.email,
        role: approver.role,
        status: approver.status,
        signedAt: approver.signedAt,
      },
    };
  }
}