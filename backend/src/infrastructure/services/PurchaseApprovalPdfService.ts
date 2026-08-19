import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import { PDFDocument, StandardFonts } from 'pdf-lib';

import { PurchaseRequest } from '../../domain/entities/PurchaseRequest.js';
import { Approver } from '../../domain/entities/Approver.js';

const BUCKET_NAME =
  process.env.PURCHASE_APPROVAL_PDF_BUCKET_NAME;

if (!BUCKET_NAME) {
  throw new Error(
    'PURCHASE_APPROVAL_PDF_BUCKET_NAME environment variable is required',
  );
}

const s3Client = new S3Client({});

export class PurchaseApprovalPdfService {
  async generateAndUpload(
    purchaseRequest: PurchaseRequest,
    approvers: Approver[],
  ): Promise<string> {
    const pdfDocument =
      await PDFDocument.create();

    const page =
      pdfDocument.addPage([
        595.28,
        841.89,
      ]);

    const font =
      await pdfDocument.embedFont(
        StandardFonts.Helvetica,
      );

    const boldFont =
      await pdfDocument.embedFont(
        StandardFonts.HelveticaBold,
      );

    let y = 790;

    const drawText = (
      text: string,
      options: {
        font?: typeof font;
        size?: number;
      } = {},
    ) => {
      page.drawText(text, {
        x: 50,
        y,
        font: options.font ?? font,
        size: options.size ?? 11,
      });

      y -=
        (options.size ?? 11) + 8;
    };

    drawText(
      'PURCHASE APPROVAL',
      {
        font: boldFont,
        size: 20,
      },
    );

    y -= 10;

    drawText(
      `Request ID: ${purchaseRequest.id}`,
    );

    drawText(
      `Title: ${purchaseRequest.title}`,
    );

    drawText(
      `Description: ${purchaseRequest.description}`,
    );

    drawText(
      `Amount: ${purchaseRequest.amount}`,
    );

    drawText(
      `Requester: ${purchaseRequest.requesterName}`,
    );

    drawText(
      `Requester email: ${purchaseRequest.requesterEmail}`,
    );

    drawText(
      `Status: ${purchaseRequest.status}`,
    );

    drawText(
      `Created at: ${purchaseRequest.createdAt}`,
    );

    drawText(
      `Updated at: ${purchaseRequest.updatedAt}`,
    );

    y -= 15;

    drawText(
      'APPROVERS',
      {
        font: boldFont,
        size: 14,
      },
    );

    for (const approver of approvers) {
      y -= 4;

      drawText(
        `Name: ${approver.name}`,
      );

      drawText(
        `Email: ${approver.email}`,
      );

      drawText(
        `Role: ${approver.role}`,
      );

      drawText(
        `Status: ${approver.status}`,
      );

      if (approver.signedAt) {
        drawText(
          `Signed at: ${approver.signedAt}`,
        );
      }

      y -= 8;
    }

    const pdfBytes =
      await pdfDocument.save();

    const key =
      `purchase-approvals/${purchaseRequest.id}.pdf`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: pdfBytes,
        ContentType: 'application/pdf',
      }),
    );

    return key;
  }
}
