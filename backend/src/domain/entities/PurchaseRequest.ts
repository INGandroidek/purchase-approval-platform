import { PurchaseStatus } from '../enums/PurchaseStatus.js';

export interface PurchaseRequestProps {
  id: string;
  title: string;
  description: string;
  amount: number;
  requesterName: string;
  requesterEmail: string;
  status: PurchaseStatus;
  createdAt: string;
  updatedAt: string;
}

export class PurchaseRequest {
  private constructor(
    private readonly props: PurchaseRequestProps,
  ) {}

  public static create(props: PurchaseRequestProps): PurchaseRequest {
    if (!props.id.trim()) {
      throw new Error('Purchase request id is required');
    }

    if (!props.title.trim()) {
      throw new Error('Purchase request title is required');
    }

    if (!props.description.trim()) {
      throw new Error('Purchase request description is required');
    }

    if (props.amount <= 0) {
      throw new Error('Purchase request amount must be greater than zero');
    }

    if (!props.requesterName.trim()) {
      throw new Error('Requester name is required');
    }

    if (!props.requesterEmail.trim()) {
      throw new Error('Requester email is required');
    }

    return new PurchaseRequest(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get title(): string {
    return this.props.title;
  }

  public get description(): string {
    return this.props.description;
  }

  public get amount(): number {
    return this.props.amount;
  }

  public get requesterName(): string {
    return this.props.requesterName;
  }

  public get requesterEmail(): string {
    return this.props.requesterEmail;
  }

  public get status(): PurchaseStatus {
    return this.props.status;
  }

  public get createdAt(): string {
    return this.props.createdAt;
  }

  public get updatedAt(): string {
    return this.props.updatedAt;
  }
}