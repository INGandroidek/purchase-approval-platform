import { ApproverRepository } from '../ports/ApproverRepository.js';

export interface ValidatedApproval {
  approverId: string;
  requestId: string;
  name: string;
  role: string;
}

export class ValidateApprovalOtp {
  constructor(
    private readonly approverRepository: ApproverRepository,
  ) {}

  async execute(
    token: string,
    otp: string,
  ): Promise<ValidatedApproval> {
    if (!token.trim()) {
      throw new Error(
        'Approver token is required',
      );
    }

    if (!otp.trim()) {
      throw new Error(
        'OTP is required',
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

    const verifiedApprover =
    approver.verifyOtp(otp);

    await this.approverRepository.update(
    verifiedApprover,
    );

    return {
      approverId: approver.id,
      requestId: approver.requestId,
      name: approver.name,
      role: approver.role,
    };
  }
}