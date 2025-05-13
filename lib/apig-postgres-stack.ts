import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export class ApigPostgresStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    console.log("path::", join(__dirname, "/lambda", "handler.ts"));

    const carsLambda = new NodejsFunction(this, "CarsLambda", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: join(__dirname, "lambda", "handler.ts"),
    });

    carsLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          "arn:aws:secretsmanager:us-east-1:388414971737:secret:dev/postgres_db-skwOme",
        ],
        actions: [
          "ssm:GetParameter",
          "secretsmanager:GetSecretValue",
          "kms:Decrypt",
        ],
      })
    );

    const api = new RestApi(this, "CarsApi");
    const carsResource = api.root.addResource("cars");
    carsResource.addMethod("GET", new LambdaIntegration(carsLambda));
  }
}
