import {
  Approver,
  ApproverProps,
} from '../../../domain/entities/Approver.js';

import { ApprovalStatus } from '../../../domain/enums/ApprovalStatus.js';

export interface ApproverItem {
  PK: string;
  SK: string;

  GSI1PK: string;
  GSI1SK: string;

  GSI2PK: string;
  GSI2SK: string;

  entityType: 'Approver';

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

export class ApproverMapper {
  static toItem(
    approver: Approver,
  ): ApproverItem {
    return {
      PK: `REQUEST#${approver.requestId}`,
      SK: `APPROVER#${approver.id}`,

      GSI1PK: `APPROVER_TOKEN#${approver.token}`,
      GSI1SK: 'APPROVER',

      GSI2PK: `APPROVER#${approver.id}`,
      GSI2SK: 'APPROVER',

      entityType: 'Approver',

      id: approver.id,
      requestId: approver.requestId,
      name: approver.name,
      email: approver.email,
      role: approver.role,
      token: approver.token,
      otp: approver.otp,
      otpExpiresAt: approver.otpExpiresAt,
      status: approver.status,

      ...(approver.signedAt
        ? {
            signedAt: approver.signedAt,
          }
        : {}),
    };
  }

  static toDomain(
    item: ApproverItem,
  ): Approver {
    const props: ApproverProps = {
      id: item.id,
      requestId: item.requestId,
      name: item.name,
      email: item.email,
      role: item.role,
      token: item.token,
      otp: item.otp,
      otpExpiresAt: item.otpExpiresAt,
      status: item.status,
      signedAt: item.signedAt,
    };

    return Approver.create(props);
  }
}