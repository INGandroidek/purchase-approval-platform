import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository.js';
import { ApproverRepository } from '../ports/ApproverRepository.js';
import { Approver } from '../../domain/entities/Approver.js';
import { ApprovalStatus } from '../../domain/enums/ApprovalStatus.js';
import { PurchaseStatus } from '../../domain/enums/PurchaseStatus.js';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest.js';

export type ApprovalDecision =
  | 'APPROVED'
  | 'REJECTED';

export interface ProcessedApproval {
  approverId: string;
  requestId: string;
  status: ApprovalStatus;
  signedAt: string;
  pdfKey?: string;
  purchaseRequestStatus: PurchaseStatus;
}

export interface PurchaseApprovalPdfGenerator {
  generateAndUpload(
    purchaseRequest: PurchaseRequest,
    approvers: Approver[],
  ): Promise<string>;
}

export class ProcessApprovalDecision {
  constructor(
    private readonly approverRepository: ApproverRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly pdfService?: PurchaseApprovalPdfGenerator,
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

    if (
      purchaseRequest.status !==
      PurchaseStatus.PENDING
    ) {
      throw new Error(
        'Purchase request has already been decided',
      );
    }

    if (!approver.otpVerifiedAt) {
      throw new Error(
        'OTP verification is required',
      );
    }

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

    let updatedPurchaseRequest =
      purchaseRequest;

    if (
      decision === 'REJECTED'
    ) {
      updatedPurchaseRequest =
        purchaseRequest.reject();
    } else {
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

    if (
      updatedPurchaseRequest.status !==
      purchaseRequest.status
    ) {
      await this.purchaseRequestRepository.update(
        updatedPurchaseRequest,
      );
    }

    let pdfKey: string | undefined;

    if (
      updatedPurchaseRequest.status ===
        PurchaseStatus.COMPLETED &&
      this.pdfService
    ) {
      pdfKey =
        await this.pdfService.generateAndUpload(
          updatedPurchaseRequest,
          approvers.map(
            (item: Approver) =>
              item.id === updatedApprover.id
                ? updatedApprover
                : item,
          ),
        );
    }

    return {
      approverId: updatedApprover.id,
      requestId: updatedApprover.requestId,
      status: updatedApprover.status,
      signedAt:
        updatedApprover.signedAt!,
      pdfKey,
      purchaseRequestStatus:
        updatedPurchaseRequest.status,
    };
  }
}
