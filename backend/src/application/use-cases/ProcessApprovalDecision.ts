import { ApproverRepository } from '../ports/ApproverRepository.js';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository.js';

import { Approver } from '../../domain/entities/Approver.js';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest.js';

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
     *
     * Normally this condition is guaranteed by
     * Approver.verifyOtp(), but we keep the
     * validation here as an additional domain
     * protection before processing the decision.
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

    await this.approverRepository.update(
      updatedApprover,
    );

    const result =
      await this.purchaseRequestRepository.findById(
        updatedApprover.requestId,
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

    let purchaseRequestStatus =
      purchaseRequest.status;

    /*
     * A single rejection immediately rejects
     * the entire purchase request.
     */
    if (
      decision === 'REJECTED'
    ) {
      purchaseRequestStatus =
        PurchaseStatus.REJECTED;
    } else {
      /*
       * The purchase request is completed only
       * when all three approvers have signed.
       *
       * The repository contains the previous
       * state of the current approver, so we
       * explicitly use updatedApprover for the
       * current decision.
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
        purchaseRequestStatus =
          PurchaseStatus.COMPLETED;
      }
    }

    /*
     * Only persist the purchase request when
     * its status actually changes.
     */
    if (
      purchaseRequestStatus !==
      purchaseRequest.status
    ) {
      const updatedPurchaseRequest =
        PurchaseRequest.create({
          id: purchaseRequest.id,
          title: purchaseRequest.title,
          description:
            purchaseRequest.description,
          amount: purchaseRequest.amount,
          requesterName:
            purchaseRequest.requesterName,
          requesterEmail:
            purchaseRequest.requesterEmail,
          status: purchaseRequestStatus,
          createdAt:
            purchaseRequest.createdAt,
          updatedAt:
            new Date().toISOString(),
        });

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
      purchaseRequestStatus,
    };
  }
}