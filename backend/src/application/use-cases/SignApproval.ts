import { ApproverRepository } from '../ports/ApproverRepository.js';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository.js';

export interface SignedApproval {
  approverId: string;
  requestId: string;
  status: string;
  signedAt?: string;
}

export class SignApproval {
  constructor(
    private readonly approverRepository: ApproverRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
  ) {}

  async execute(
    approverId: string,
  ): Promise<SignedApproval> {
    if (!approverId.trim()) {
      throw new Error(
        'Approver id is required',
      );
    }

    const approver =
      await this.approverRepository.findById(
        approverId,
      );

    if (!approver) {
      throw new Error(
        'Approver not found',
      );
    }

    const signedApprover =
      approver.sign();

    await this.approverRepository.update(
      signedApprover,
    );

    return {
      approverId: signedApprover.id,
      requestId: signedApprover.requestId,
      status: signedApprover.status,
      signedAt: signedApprover.signedAt,
    };
  }
}