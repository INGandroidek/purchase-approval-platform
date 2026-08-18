import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class InfrastructureStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps,
  ) {
    super(scope, id, props);

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
     * GSI used by DynamoDBApproverRepository.findByToken()
     *
     * GSI1PK = APPROVER_TOKEN#{token}
     * GSI1SK = APPROVER
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

    /*
     * GSI used by DynamoDBApproverRepository.findById()
     *
     * GSI2PK = APPROVER#{id}
     */
    purchaseApprovalTable.addGlobalSecondaryIndex({
      indexName: 'ApproverIdIndex',

      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING,
      },

      projectionType:
        dynamodb.ProjectionType.ALL,
    });

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
  }
}