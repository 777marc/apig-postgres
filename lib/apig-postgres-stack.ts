import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  LambdaIntegration,
  RestApi,
  CognitoUserPoolsAuthorizer,
  MethodOptions,
  AuthorizationType,
  TokenAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import { Effect, PolicyStatement, User } from "aws-cdk-lib/aws-iam";
import { IUserPool } from "aws-cdk-lib/aws-cognito";

interface ApigPostgresStackProps extends cdk.StackProps {
  userPool: IUserPool;
}

export class ApigPostgresStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApigPostgresStackProps) {
    super(scope, id, props);

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

    const jwtAuthLambda = new NodejsFunction(this, "JwtAuthLambda", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: join(__dirname, "lambda", "jwtHandler.ts"),
    });

    // const authorizer = new CognitoUserPoolsAuthorizer(
    //   this,
    //   "CarsApiAuthorizer",
    //   {
    //     cognitoUserPools: [props.userPool],
    //     identitySource: "method.request.header.Authorization",
    //   }
    // );

    const authorizer = new TokenAuthorizer(this, "CarsApiJWTAuthorizer", {
      handler: jwtAuthLambda,
      identitySource: "method.request.header.Authorization",
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    authorizer._attachToApi(api);

    const optionsWithAuth: MethodOptions = {
      authorizationType: AuthorizationType.CUSTOM,
      authorizer: {
        authorizerId: authorizer.authorizerId,
      },
    };

    carsResource.addMethod(
      "GET",
      new LambdaIntegration(carsLambda),
      optionsWithAuth
    );
  }
}
