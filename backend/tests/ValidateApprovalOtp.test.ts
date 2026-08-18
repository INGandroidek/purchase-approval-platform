import {
  describe,
  expect,
  it,
} from '@jest/globals';

import { Approver } from '../src/domain/entities/Approver.js';
import { ApprovalStatus } from '../src/domain/enums/ApprovalStatus.js';

import { ApproverRepository } from '../src/application/ports/ApproverRepository.js';

import { ValidateApprovalOtp } from '../src/application/use-cases/ValidateApprovalOtp.js';

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
      this.approvers.get(token) ?? null
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

describe('ValidateApprovalOtp', () => {
  const createApprover = (
    otp: string,
    otpExpiresAt: string,
  ): Approver =>
    Approver.create({
      id: 'approver-123',
      requestId: 'request-123',
      name: 'Carlos',
      email: 'carlos@example.com',
      role: 'FINANCE',
      token: 'token-123',
      otp,
      otpExpiresAt,
      status: ApprovalStatus.PENDING,
    });

  it('should validate a correct and non-expired OTP', async () => {
    const repository =
      new InMemoryApproverRepository();

    await repository.saveMany([
      createApprover(
        '123456',
        new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
      ),
    ]);

    const useCase =
      new ValidateApprovalOtp(
        repository,
      );

    const result =
      await useCase.execute(
        'token-123',
        '123456',
      );

    expect(result.approverId).toBe(
      'approver-123',
    );

    expect(result.requestId).toBe(
      'request-123',
    );

    expect(result.name).toBe(
      'Carlos',
    );

    expect(result.role).toBe(
      'FINANCE',
    );
  });

  it('should reject an empty token', async () => {
    const useCase =
      new ValidateApprovalOtp(
        new InMemoryApproverRepository(),
      );

    await expect(
      useCase.execute('', '123456'),
    ).rejects.toThrow(
      'Approver token is required',
    );
  });

  it('should reject an empty OTP', async () => {
    const useCase =
      new ValidateApprovalOtp(
        new InMemoryApproverRepository(),
      );

    await expect(
      useCase.execute(
        'token-123',
        '',
      ),
    ).rejects.toThrow(
      'OTP is required',
    );
  });

  it('should reject an invalid token', async () => {
    const repository =
      new InMemoryApproverRepository();

    const useCase =
      new ValidateApprovalOtp(
        repository,
      );

    await expect(
      useCase.execute(
        'invalid-token',
        '123456',
      ),
    ).rejects.toThrow(
      'Invalid approver token',
    );
  });

  it('should reject an incorrect OTP', async () => {
    const repository =
      new InMemoryApproverRepository();

    await repository.saveMany([
      createApprover(
        '123456',
        new Date(
          Date.now() + 3 * 60 * 1000,
        ).toISOString(),
      ),
    ]);

    const useCase =
      new ValidateApprovalOtp(
        repository,
      );

    await expect(
      useCase.execute(
        'token-123',
        '999999',
      ),
    ).rejects.toThrow(
      'Invalid or expired OTP',
    );
  });

  it('should reject an expired OTP', async () => {
    const repository =
      new InMemoryApproverRepository();

    await repository.saveMany([
      createApprover(
        '123456',
        new Date(
          Date.now() - 1000,
        ).toISOString(),
      ),
    ]);

    const useCase =
      new ValidateApprovalOtp(
        repository,
      );

    await expect(
      useCase.execute(
        'token-123',
        '123456',
      ),
    ).rejects.toThrow(
      'Invalid or expired OTP',
    );
  });
});