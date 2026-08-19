import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'node:path';

export class InfrastructureStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

    /*
     * ============================================================
     * S3 - Approval PDFs
     * ============================================================
     */

    const purchaseApprovalPdfBucket =
      new s3.Bucket(
        this,
        'PurchaseApprovalPdfBucket',
        {
          blockPublicAccess:
            s3.BlockPublicAccess.BLOCK_ALL,

          encryption:
            s3.BucketEncryption.S3_MANAGED,

          enforceSSL: true,

          removalPolicy:
            cdk.RemovalPolicy.DESTROY,

          autoDeleteObjects: true,
        },
      );

    /*
     * ============================================================
     * DynamoDB
     * ============================================================
     */

    const purchaseApprovalTable =
      new dynamodb.Table(
        this,
        'PurchaseApprovalTable',
        {
          tableName: 'purchase-approval-dev',

          partitionKey: {
            name: 'PK',
            type: dynamodb.AttributeType.STRING,
          },

          sortKey: {
            name: 'SK',
            type: dynamodb.AttributeType.STRING,
          },

          billingMode:
            dynamodb.BillingMode.PAY_PER_REQUEST,

          removalPolicy:
            cdk.RemovalPolicy.DESTROY,

          pointInTimeRecoverySpecification: {
            pointInTimeRecoveryEnabled: false,
          },
        },
      );

    /*
     * ============================================================
     * Global Secondary Indexes
     * ============================================================
     */

    purchaseApprovalTable.addGlobalSecondaryIndex({
      indexName: 'ApproverTokenIndex',

      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },

      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },

      projectionType:
        dynamodb.ProjectionType.ALL,
    });

    purchaseApprovalTable.addGlobalSecondaryIndex({
      indexName: 'ApproverIdIndex',

      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING,
      },

      projectionType:
        dynamodb.ProjectionType.ALL,
    });

    /*
     * ============================================================
     * Lambda - Create Purchase Request
     * ============================================================
     */

    const createPurchaseRequestLambda =
      new nodejs.NodejsFunction(
        this,
        'CreatePurchaseRequestLambda',
        {
          runtime:
            lambda.Runtime.NODEJS_24_X,

          entry: path.join(
            __dirname,
            '../../backend/src/handlers/createPurchaseRequest.ts',
          ),

          handler: 'handler',

          environment: {
            PURCHASE_APPROVAL_TABLE_NAME:
              purchaseApprovalTable.tableName,
          },

          bundling: {
            minify: false,
            sourceMap: true,
          },
        },
      );

    /*
     * ============================================================
     * Lambda - Get Approval By Token
     * ============================================================
     */

    const getApprovalByTokenLambda =
      new nodejs.NodejsFunction(
        this,
        'GetApprovalByTokenLambda',
        {
          runtime:
            lambda.Runtime.NODEJS_24_X,

          entry: path.join(
            __dirname,
            '../../backend/src/handlers/getApprovalByToken.ts',
          ),

          handler: 'handler',

          environment: {
            PURCHASE_APPROVAL_TABLE_NAME:
              purchaseApprovalTable.tableName,
          },

          bundling: {
            minify: false,
            sourceMap: true,
          },
        },
      );

    /*
     * ============================================================
     * Lambda - Validate Approval OTP
     * ============================================================
     */

    const validateApprovalOtpLambda =
      new nodejs.NodejsFunction(
        this,
        'ValidateApprovalOtpLambda',
        {
          runtime:
            lambda.Runtime.NODEJS_24_X,

          entry: path.join(
            __dirname,
            '../../backend/src/handlers/validateApprovalOtp.ts',
          ),

          handler: 'handler',

          environment: {
            PURCHASE_APPROVAL_TABLE_NAME:
              purchaseApprovalTable.tableName,
          },

          bundling: {
            minify: false,
            sourceMap: true,
          },
        },
      );

    /*
     * ============================================================
     * Lambda - Process Approval Decision
     * ============================================================
     */

    const processApprovalDecisionLambda =
      new nodejs.NodejsFunction(
        this,
        'ProcessApprovalDecisionLambda',
        {
          runtime:
            lambda.Runtime.NODEJS_24_X,

          entry: path.join(
            __dirname,
            '../../backend/src/handlers/processApprovalDecision.ts',
          ),

          handler: 'handler',

          environment: {
            PURCHASE_APPROVAL_TABLE_NAME:
              purchaseApprovalTable.tableName,

            PURCHASE_APPROVAL_PDF_BUCKET_NAME:
              purchaseApprovalPdfBucket.bucketName,
          },

          bundling: {
            minify: false,
            sourceMap: true,
          },
        },
      );

    /*
     * ============================================================
     * DynamoDB permissions
     * ============================================================
     */

    purchaseApprovalTable.grantReadWriteData(
      createPurchaseRequestLambda,
    );

    purchaseApprovalTable.grantReadWriteData(
      getApprovalByTokenLambda,
    );

    purchaseApprovalTable.grantReadWriteData(
      validateApprovalOtpLambda,
    );

    purchaseApprovalTable.grantReadWriteData(
      processApprovalDecisionLambda,
    );

    /*
     * ============================================================
     * S3 permissions
     * ============================================================
     */

    purchaseApprovalPdfBucket.grantPut(
      processApprovalDecisionLambda,
    );

    /*
     * ============================================================
     * API Gateway
     * ============================================================
     */

    const api =
      new apigateway.RestApi(
        this,
        'PurchaseApprovalApi',
        {
          restApiName:
            'Purchase Approval API',

          description:
            'Purchase approval platform API',
        },
      );

    /*
     * ============================================================
     * POST /purchase-requests
     * ============================================================
     */

    const purchaseRequests =
      api.root.addResource(
        'purchase-requests',
      );

    purchaseRequests.addMethod(
      'POST',
      new apigateway.LambdaIntegration(
        createPurchaseRequestLambda,
      ),
    );

    /*
     * ============================================================
     * /approvals/{token}
     * ============================================================
     */

    const approvals =
      api.root.addResource(
        'approvals',
      );

    const approvalByToken =
      approvals.addResource(
        '{token}',
      );

    /*
     * GET /approvals/{token}
     */

    approvalByToken.addMethod(
      'GET',
      new apigateway.LambdaIntegration(
        getApprovalByTokenLambda,
      ),
    );

    /*
     * ============================================================
     * POST /approvals/{token}/otp
     * ============================================================
     */

    const otp =
      approvalByToken.addResource(
        'otp',
      );

    otp.addMethod(
      'POST',
      new apigateway.LambdaIntegration(
        validateApprovalOtpLambda,
      ),
    );

    /*
     * ============================================================
     * POST /approvals/{token}/decision
     * ============================================================
     */

    const decision =
      approvalByToken.addResource(
        'decision',
      );

    decision.addMethod(
      'POST',
      new apigateway.LambdaIntegration(
        processApprovalDecisionLambda,
      ),
    );

    /*
     * ============================================================
     * Outputs
     * ============================================================
     */

    new cdk.CfnOutput(
      this,
      'PurchaseApprovalTableName',
      {
        value:
          purchaseApprovalTable.tableName,
      },
    );

    new cdk.CfnOutput(
      this,
      'ApproverTokenIndexName',
      {
        value: 'ApproverTokenIndex',
      },
    );

    new cdk.CfnOutput(
      this,
      'ApproverIdIndexName',
      {
        value: 'ApproverIdIndex',
      },
    );

    new cdk.CfnOutput(
      this,
      'PurchaseApprovalApiUrl',
      {
        value:
          api.url,
      },
    );

    new cdk.CfnOutput(
      this,
      'PurchaseApprovalPdfBucketName',
      {
        value:
          purchaseApprovalPdfBucket.bucketName,
      },
    );
  }
}