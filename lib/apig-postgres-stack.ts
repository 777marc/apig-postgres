import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  LambdaIntegration,
  RestApi,
  MethodOptions,
  AuthorizationType,
  TokenAuthorizer,
  SecurityPolicy,
} from "aws-cdk-lib/aws-apigateway";
import { Effect, PolicyStatement, User } from "aws-cdk-lib/aws-iam";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certManager from "aws-cdk-lib/aws-certificatemanager";

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
          "arn:aws:secretsmanager:us-east-1:388414971737:secret:dev/postgres_db_2-6akrkl",
        ],
        actions: [
          "ssm:GetParameter",
          "secretsmanager:GetSecretValue",
          "kms:Decrypt",
        ],
      })
    );

    // Create DNS record
    const r53Config = {
      HostedZoneName: "mendoza-code.com",
      HostedZoneId: "Z012275318RY9D12HI3DG",
      Domain: "cars.mendoza-code.com",
    };

    // get mendoza-code cert
    const certificateArn =
      "arn:aws:acm:us-east-1:388414971737:certificate/656a47e6-9b89-4c63-b44b-b98f786197d9";
    const cert = certManager.Certificate.fromCertificateArn(
      this,
      "domainCert",
      certificateArn
    );

    const api = new RestApi(this, "CarsApi", {
      domainName: {
        domainName: r53Config.Domain,
        certificate: cert,
        securityPolicy: SecurityPolicy.TLS_1_2,
      },
    });

    const carsResource = api.root.addResource("cars");

    const jwtAuthLambda = new NodejsFunction(this, "JwtAuthLambda", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: join(__dirname, "lambda", "jwtHandler.ts"),
    });

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

    // get hosted zone object
    const zoneObj = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "baseZone",
      {
        zoneName: r53Config.HostedZoneName,
        hostedZoneId: r53Config.HostedZoneId,
      }
    );

    new route53.ARecord(this, "AliasRecord", {
      zone: zoneObj,
      target: route53.RecordTarget.fromAlias(
        new cdk.aws_route53_targets.ApiGateway(api)
      ),
      recordName: r53Config.Domain,
    });

    new cdk.CfnOutput(this, "restapi-id", {
      value: api.restApiId,
      exportName: "restApiId",
    });
  }
}
