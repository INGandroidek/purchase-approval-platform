import { ApprovalStatus } from '../enums/ApprovalStatus.js';

export interface ApproverProps {
  id: string;
  requestId: string;
  name: string;
  email: string;
  role: string;
  token: string;
  otp: string;
  otpExpiresAt: string;
  status: ApprovalStatus;
  signedAt?: string;
}

export class Approver {
  private constructor(
    private readonly props: ApproverProps,
  ) {}

  static create(props: ApproverProps): Approver {
    return new Approver(props);
  }

  get id(): string {
    return this.props.id;
  }

  get requestId(): string {
    return this.props.requestId;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): string {
    return this.props.role;
  }

  get token(): string {
    return this.props.token;
  }

  get otp(): string {
    return this.props.otp;
  }

  get otpExpiresAt(): string {
    return this.props.otpExpiresAt;
  }

  get status(): ApprovalStatus {
    return this.props.status;
  }

  get signedAt(): string | undefined {
    return this.props.signedAt;
  }

  public isOtpValid(otp: string): boolean {
    if (otp !== this.props.otp) {
      return false;
    }

    const expirationTime = new Date(
      this.props.otpExpiresAt,
    ).getTime();

    return Date.now() <= expirationTime;
  }

  public sign(): Approver {
    if (this.props.status !== ApprovalStatus.PENDING) {
      throw new Error(
        'Approval decision has already been made',
      );
    }

    return new Approver({
      ...this.props,
      status: ApprovalStatus.SIGNED,
      signedAt: new Date().toISOString(),
    });
  }

  reject(): Approver {
    if (this.props.status !== ApprovalStatus.PENDING) {
      throw new Error(
        'Approval decision has already been made',
      );
    }

    return new Approver({
      ...this.props,
      status: ApprovalStatus.REJECTED,
      signedAt: new Date().toISOString(),
    });
  }
}