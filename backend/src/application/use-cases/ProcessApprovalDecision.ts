import { ApproverRepository } from '../ports/ApproverRepository.js';
import { ApprovalStatus } from '../../domain/enums/ApprovalStatus.js';

export type ApprovalDecision =
  | 'APPROVED'
  | 'REJECTED';

export interface ProcessedApproval {
  approverId: string;
  requestId: string;
  status: ApprovalStatus;
  signedAt: string;
}

export class ProcessApprovalDecision {
  constructor(
    private readonly approverRepository: ApproverRepository,
  ) {}

  async execute(
    token: string,
    decision: ApprovalDecision,
  ): Promise<ProcessedApproval> {
    if (!token.trim()) {
      throw new Error(
        'Approver token is required',
      );
    }

    if (
      decision !== 'APPROVED' &&
      decision !== 'REJECTED'
    ) {
      throw new Error(
        'Invalid approval decision',
      );
    }

    const approver =
      await this.approverRepository.findByToken(
        token,
      );

    if (!approver) {
      throw new Error(
        'Invalid approver token',
      );
    }

    if (approver.status !== ApprovalStatus.PENDING) {
      throw new Error(
        'Approval decision has already been made',
      );
    }

    const updatedApprover =
      decision === 'APPROVED'
        ? approver.sign()
        : approver.reject();

    await this.approverRepository.update(
      updatedApprover,
    );

    return {
      approverId: updatedApprover.id,
      requestId: updatedApprover.requestId,
      status: updatedApprover.status,
      signedAt:
        updatedApprover.signedAt!,
    };
  }
}