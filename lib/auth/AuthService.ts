import { Amplify } from "aws-amplify";
import { SignInOutput, fetchAuthSession, signIn } from "@aws-amplify/auth";

const awsRegion: string = "us-east-1";
const userPoolId: string = "us-east-1_IU17duBrY";
const userPoolClientId: string = "2vsgeno3emomq36g714dh2h3so";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    },
  },
});

export class AuthService {
  public async login(userName: string, password: string) {
    const signInOutput: SignInOutput = await signIn({
      username: userName,
      password: password,
      options: {
        authFlowType: "USER_PASSWORD_AUTH",
      },
    });
    return signInOutput;
  }

  /**
   * call only after login
   */
  public async getIdToken() {
    const authSession = await fetchAuthSession();
    return authSession.tokens?.idToken?.toString();
  }
}
