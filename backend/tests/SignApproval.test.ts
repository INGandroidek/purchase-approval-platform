import {
  describe,
  expect,
  it,
} from '@jest/globals';

import { Approver } from '../src/domain/entities/Approver.js';
import { ApprovalStatus } from '../src/domain/enums/ApprovalStatus.js';

import { ApproverRepository } from '../src/application/ports/ApproverRepository.js';
import { PurchaseRequestRepository } from '../src/application/ports/PurchaseRequestRepository.js';

import { SignApproval } from '../src/application/use-cases/SignApproval.js';

class InMemoryApproverRepository
  implements ApproverRepository
{
  private readonly approvers = new Map<
    string,
    Approver
  >();

  async saveMany(
    approvers: Approver[],
  ): Promise<void> {
    for (const approver of approvers) {
      this.approvers.set(
        approver.id,
        approver,
      );
    }
  }

  async findById(
    id: string,
  ): Promise<Approver | null> {
    return (
      this.approvers.get(id) ?? null
    );
  }

  async findByToken(
    token: string,
  ): Promise<Approver | null> {
    return (
      [...this.approvers.values()].find(
        (approver) =>
          approver.token === token,
      ) ?? null
    );
  }

  async findByRequestId(
    requestId: string,
  ): Promise<Approver[]> {
    return [
      ...this.approvers.values(),
    ].filter(
      (approver) =>
        approver.requestId === requestId,
    );
  }

  async update(
    approver: Approver,
  ): Promise<void> {
    this.approvers.set(
      approver.id,
      approver,
    );
  }
}

class InMemoryPurchaseRequestRepository
  implements PurchaseRequestRepository
{
  async save(): Promise<void> {}

  async findById(): Promise<null> {
    return null;
  }

  async findByRequesterEmail(): Promise<
    never[]
  > {
    return [];
  }
  async update(): Promise<void> {}
}

describe('SignApproval', () => {
  const createApprover = (
    status: ApprovalStatus = ApprovalStatus.PENDING,
  ): Approver =>
    Approver.create({
      id: 'approver-123',
      requestId: 'request-123',
      name: 'Carlos',
      email: 'carlos@example.com',
      role: 'FINANCE',
      token: 'token-123',
      otp: '123456',
      otpExpiresAt: new Date(
        Date.now() + 3 * 60 * 1000,
      ).toISOString(),
      status,
    });

  it('should sign a pending approval', async () => {
    const approverRepository =
      new InMemoryApproverRepository();

    const purchaseRequestRepository =
      new InMemoryPurchaseRequestRepository();

    await approverRepository.saveMany([
      createApprover(),
    ]);

    const useCase = new SignApproval(
      approverRepository,
      purchaseRequestRepository,
    );

    const result =
      await useCase.execute(
        'approver-123',
      );

    expect(result.approverId).toBe(
      'approver-123',
    );

    expect(result.requestId).toBe(
      'request-123',
    );

    expect(result.status).toBe(
      ApprovalStatus.SIGNED,
    );

    expect(result.signedAt).toBeDefined();

    const updated =
      await approverRepository.findById(
        'approver-123',
      );

    expect(updated?.status).toBe(
      ApprovalStatus.SIGNED,
    );

    expect(updated?.signedAt).toBeDefined();
  });

  it('should reject an empty approver id', async () => {
    const useCase = new SignApproval(
      new InMemoryApproverRepository(),
      new InMemoryPurchaseRequestRepository(),
    );

    await expect(
      useCase.execute(''),
    ).rejects.toThrow(
      'Approver id is required',
    );
  });

  it('should reject an unknown approver', async () => {
    const useCase = new SignApproval(
      new InMemoryApproverRepository(),
      new InMemoryPurchaseRequestRepository(),
    );

    await expect(
      useCase.execute('unknown-approver'),
    ).rejects.toThrow(
      'Approver not found',
    );
  });

  it('should not allow an already signed approval to be signed again', async () => {
    const approverRepository =
      new InMemoryApproverRepository();

    const purchaseRequestRepository =
      new InMemoryPurchaseRequestRepository();

    await approverRepository.saveMany([
      createApprover(
        ApprovalStatus.SIGNED,
      ),
    ]);

    const useCase = new SignApproval(
      approverRepository,
      purchaseRequestRepository,
    );

    await expect(
      useCase.execute(
        'approver-123',
      ),
    ).rejects.toThrow(
      'Approval decision has already been made',
    );
  });
});