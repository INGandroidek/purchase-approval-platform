import { ApproverRepository } from '../ports/ApproverRepository.js';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository.js';

import { Approver } from '../../domain/entities/Approver.js';

import { ApprovalStatus } from '../../domain/enums/ApprovalStatus.js';
import { PurchaseStatus } from '../../domain/enums/PurchaseStatus.js';

export type ApprovalDecision =
  | 'APPROVED'
  | 'REJECTED';

export interface ProcessedApproval {
  approverId: string;
  requestId: string;
  status: ApprovalStatus;
  signedAt: string;
  purchaseRequestStatus: PurchaseStatus;
}

export class ProcessApprovalDecision {
  constructor(
    private readonly approverRepository: ApproverRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
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

    /*
     * Load the purchase request before allowing
     * any approval decision.
     */
    const result =
      await this.purchaseRequestRepository.findById(
        approver.requestId,
      );

    if (!result) {
      throw new Error(
        'Purchase request not found',
      );
    }

    const {
      purchaseRequest,
      approvers,
    } = result;

    /*
     * A purchase request is immutable from the
     * approval perspective once it has been
     * completed or rejected.
     */
    if (
      purchaseRequest.status !==
      PurchaseStatus.PENDING
    ) {
      throw new Error(
        'Purchase request has already been decided',
      );
    }

    /*
     * The approver must verify the OTP before
     * being allowed to make an approval decision.
     */
    if (!approver.otpVerifiedAt) {
      throw new Error(
        'OTP verification is required',
      );
    }

    /*
     * The OTP verification must have happened
     * while the OTP was still valid.
     */
    const otpVerificationTime =
      new Date(
        approver.otpVerifiedAt,
      ).getTime();

    const otpExpirationTime =
      new Date(
        approver.otpExpiresAt,
      ).getTime();

    if (
      otpVerificationTime >
      otpExpirationTime
    ) {
      throw new Error(
        'OTP verification has expired',
      );
    }

    /*
     * An approver can make only one decision.
     */
    if (
      approver.status !==
      ApprovalStatus.PENDING
    ) {
      throw new Error(
        'Approval decision has already been made',
      );
    }

    const updatedApprover =
      decision === 'APPROVED'
        ? approver.sign()
        : approver.reject();

    /*
     * Persist the approver decision.
     */
    await this.approverRepository.update(
      updatedApprover,
    );

    let updatedPurchaseRequest =
      purchaseRequest;

    /*
     * A single rejection immediately rejects
     * the entire purchase request.
     */
    if (
      decision === 'REJECTED'
    ) {
      updatedPurchaseRequest =
        purchaseRequest.reject();
    } else {
      /*
       * The purchase request is completed only
       * when every approver has signed.
       *
       * The repository contains the previous
       * state of the current approver, so the
       * updated approver is explicitly used here.
       */
      const allApprovalsCompleted =
        approvers.every(
          (item: Approver) =>
            item.id === updatedApprover.id
              ? updatedApprover.status ===
                ApprovalStatus.SIGNED
              : item.status ===
                ApprovalStatus.SIGNED,
        );

      if (allApprovalsCompleted) {
        updatedPurchaseRequest =
          purchaseRequest.complete();
      }
    }

    /*
     * Persist the purchase request only when
     * its status actually changes.
     */
    if (
      updatedPurchaseRequest.status !==
      purchaseRequest.status
    ) {
      await this.purchaseRequestRepository.update(
        updatedPurchaseRequest,
      );
    }

    return {
      approverId: updatedApprover.id,
      requestId: updatedApprover.requestId,
      status: updatedApprover.status,
      signedAt:
        updatedApprover.signedAt!,
      purchaseRequestStatus:
        updatedPurchaseRequest.status,
    };
  }
}