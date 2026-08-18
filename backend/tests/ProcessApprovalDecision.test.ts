import {
  describe,
  expect,
  it,
} from '@jest/globals';

import { Approver } from '../src/domain/entities/Approver.js';
import { ApprovalStatus } from '../src/domain/enums/ApprovalStatus.js';
import { ApproverRepository } from '../src/application/ports/ApproverRepository.js';
import { ProcessApprovalDecision } from '../src/application/use-cases/ProcessApprovalDecision.js';

class InMemoryApproverRepository
  implements ApproverRepository
{
  private readonly approvers =
    new Map<string, Approver>();

  async saveMany(
    approvers: Approver[],
  ): Promise<void> {
    for (const approver of approvers) {
      this.approvers.set(
        approver.token,
        approver,
      );
    }
  }

  async findById(
    id: string,
    ): Promise<Approver | null> {
    return (
        [...this.approvers.values()].find(
        (approver) =>
            approver.id === id,
        ) ?? null
    );
    }

  async findByToken(
    token: string,
  ): Promise<Approver | null> {
    return (
      this.approvers.get(token) ??
      null
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
      approver.token,
      approver,
    );
  }
}

const createApprover = (
  status: ApprovalStatus =
    ApprovalStatus.PENDING,
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

describe('ProcessApprovalDecision', () => {
  it('should approve a pending approval', async () => {
    const repository =
      new InMemoryApproverRepository();

    await repository.saveMany([
      createApprover(),
    ]);

    const useCase =
      new ProcessApprovalDecision(
        repository,
      );

    const result =
      await useCase.execute(
        'token-123',
        'APPROVED',
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
  });

  it('should reject a pending approval', async () => {
    const repository =
      new InMemoryApproverRepository();

    await repository.saveMany([
      createApprover(),
    ]);

    const useCase =
      new ProcessApprovalDecision(
        repository,
      );

    const result =
      await useCase.execute(
        'token-123',
        'REJECTED',
      );

    expect(result.status).toBe(
      ApprovalStatus.REJECTED,
    );

    expect(result.signedAt).toBeDefined();
  });

  it('should reject an empty token', async () => {
    const useCase =
      new ProcessApprovalDecision(
        new InMemoryApproverRepository(),
      );

    await expect(
      useCase.execute(
        '',
        'APPROVED',
      ),
    ).rejects.toThrow(
      'Approver token is required',
    );
  });

  it('should reject an invalid token', async () => {
    const useCase =
      new ProcessApprovalDecision(
        new InMemoryApproverRepository(),
      );

    await expect(
      useCase.execute(
        'invalid-token',
        'APPROVED',
      ),
    ).rejects.toThrow(
      'Invalid approver token',
    );
  });

  it('should reject an invalid decision', async () => {
    const repository =
      new InMemoryApproverRepository();

    await repository.saveMany([
      createApprover(),
    ]);

    const useCase =
      new ProcessApprovalDecision(
        repository,
      );

    await expect(
      useCase.execute(
        'token-123',
        'INVALID' as 'APPROVED',
      ),
    ).rejects.toThrow(
      'Invalid approval decision',
    );
  });

  it('should reject a second decision', async () => {
    const repository =
      new InMemoryApproverRepository();

    await repository.saveMany([
      createApprover(
        ApprovalStatus.SIGNED,
      ),
    ]);

    const useCase =
      new ProcessApprovalDecision(
        repository,
      );

    await expect(
      useCase.execute(
        'token-123',
        'REJECTED',
      ),
    ).rejects.toThrow(
      'Approval decision has already been made',
    );
  });
});