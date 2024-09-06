import { Amplify, Auth } from "aws-amplify";
import { Config } from "./aws_config";

export const configureAmplify = function (config: Config) {
  const apiEndpoints: any[] = [];
  Object.entries(config.apiGateways).forEach(([name, lambda]) => {
    apiEndpoints.push({
      name,
      endpoint: lambda.url,
      region: lambda.region,
    });
  });

  Amplify.configure({
    Auth: {
      mandatorySignIn: false, // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
      region: config.cognito.region,
      userPoolId: config.cognito.userPoolId,
      userPoolWebClientId: config.cognito.appClientId,
      identityPoolId: config.cognito.identityPoolId,
    },
    Storage: {
      region: config.s3.region,
      bucket: config.s3.bucket,
      identityPoolId: config.cognito.identityPoolId,
    },
    API: {
      endpoints: apiEndpoints,
    },
  });
};

export class AwsUrl {
  static AWS_SIGNIN_PATH = "https://signin.aws.amazon.com/federation";

  static getAwsConsoleLoginTokenURL(
    sessionId: string,
    sessionKey: string,
    sessionToken: string
  ) {
    const url = `${
      AwsUrl.AWS_SIGNIN_PATH
    }?Action=getSigninToken&SessionDuration=43200&Session=${encodeURIComponent(
      JSON.stringify({
        sessionId,
        sessionKey,
        sessionToken,
      })
    )}`;
    return url;
  }

  static openAwsConsoleSignInTokenPage() {
    Auth.currentUserCredentials()
      .then((value) => {
        window.open(
          AwsUrl.getAwsConsoleLoginTokenURL(
            value.accessKeyId,
            value.secretAccessKey,
            value.sessionToken
          ),
          "_blank"
        );
      })
      .catch((error) => {
        console.error(error);
      });
  }

  static getAwsConsoleLoginURL(
    signInToken: string,
    destinationUrl = "https://console.aws.amazon.com/",
    issuerUrl = "https://robocip.or.jp/"
  ) {
    let url = AwsUrl.AWS_SIGNIN_PATH;
    url = `?Action=login&Issuer=${encodeURIComponent(issuerUrl)}`;
    url += `&Destination=${encodeURIComponent(destinationUrl)}`;
    url += `&SigninToken=${signInToken}`;
    return url;
  }
}
