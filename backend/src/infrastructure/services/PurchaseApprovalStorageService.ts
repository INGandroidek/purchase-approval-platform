import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export class PurchaseApprovalStorageService {
  private readonly client =
    new S3Client({});

  constructor(
    private readonly bucketName: string,
  ) {}

  async uploadPdf(
    requestId: string,
    pdf: Uint8Array,
  ): Promise<string> {
    const key =
      `purchase-requests/${requestId}/approval.pdf`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: pdf,
        ContentType: 'application/pdf',
      }),
    );

    return key;
  }
}
