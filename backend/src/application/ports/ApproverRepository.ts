import { Approver } from '../../domain/entities/Approver.js';

export interface ApproverRepository {
  saveMany(
    approvers: Approver[],
  ): Promise<void>;

  findById(
    id: string,
  ): Promise<Approver | null>;

  findByToken(
    token: string,
  ): Promise<Approver | null>;

  findByRequestId(
    requestId: string,
  ): Promise<Approver[]>;

  update(
    approver: Approver,
  ): Promise<void>;
}