import { randomUUID } from 'node:crypto';

import { Approver } from '../../domain/entities/Approver.js';
import { PurchaseRequest } from '../../domain/entities/PurchaseRequest.js';
import { ApprovalStatus } from '../../domain/enums/ApprovalStatus.js';
import { PurchaseStatus } from '../../domain/enums/PurchaseStatus.js';
import { PurchaseRequestRepository } from '../ports/PurchaseRequestRepository.js';
import { OtpGenerator } from '../../domain/services/OtpGenerator.js';
import { TokenGenerator } from '../../domain/services/TokenGenerator.js';
import { CreatePurchaseRequestInput } from '../dto/CreatePurchaseRequestInput.js';

export interface CreatedPurchaseRequest {
  request: PurchaseRequest;
  approvers: Approver[];
}

export class CreatePurchaseRequest {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly otpGenerator: OtpGenerator,
  ) {}

  async execute(
    input: CreatePurchaseRequestInput,
  ): Promise<CreatedPurchaseRequest> {
    if (input.approvers.length !== 3) {
      throw new Error('Exactly 3 approvers are required');
    }

    const roles = input.approvers.map((approver) => approver.role);
    const uniqueRoles = new Set(roles);

    if (uniqueRoles.size !== 3) {
      throw new Error('Approver roles must be different');
    }

    const requestId = randomUUID();
    const now = new Date().toISOString();

    const purchaseRequest = PurchaseRequest.create({
      id: requestId,
      title: input.title,
      description: input.description,
      amount: input.amount,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      status: PurchaseStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });

    const otpExpiresAt = new Date(
      Date.now() + 3 * 60 * 1000,
    ).toISOString();

    const approvers = input.approvers.map((inputApprover) =>
      Approver.create({
        id: randomUUID(),
        requestId,
        name: inputApprover.name,
        email: inputApprover.email,
        role: inputApprover.role,
        token: this.tokenGenerator.generate(),
        otp: this.otpGenerator.generate(),
        otpExpiresAt,
        status: ApprovalStatus.PENDING,
      }),
    );

    await this.purchaseRequestRepository.save(
      purchaseRequest,
      approvers,
    );

    return {
      request: purchaseRequest,
      approvers,
    };
  }
}