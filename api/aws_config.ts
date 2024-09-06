// ----------------------------------------
// このファイルはハードコードしている設定情報を基に
// aws_configure.tsで使用する設定情報（Config）を生成します
// 使用しているAWSが変更された場合、その変更に沿うようApiSettingの定義を変更してください
// ----------------------------------------

import ApiSetting from "./api_def";

interface Dict<T> {
  [index: string]: T;
}
interface ApiGatewayInfo {
  type: string;
  region: string;
  url: string;
}
export interface Config {
  s3: {
    region: string;
    bucket: string;
  };
  apiGateways: Dict<ApiGatewayInfo>;
  defaultApiGateway: string;
  cognito: {
    region: string;
    userPoolId: string;
    appClientId: string;
    identityPoolId: string;
  };
}
// ----------------------------------------
const REGION = "ap-northeast-1";
const BUCKET = "robocip-db-data";
const USER_POOL_ID = "ap-northeast-1_RCz7NbCsc";
const APP_CLIENT_ID = "50vmo3qdu16mvvqq77obgoao9j";
const IDENTITY_POOL_ID = "ap-northeast-1:69b2c6d7-f8ef-4ab3-8890-2894c6479891";
// ----------------------------------------

export function getApiNameWithStage(apiName: string, stage: string | null) {
  if (stage === "master" || stage === "dev" || stage === "test") {
    return stage === "master" ? apiName : `${apiName}-${stage}`;
  }
  return apiName;
}

export function getConfig(
  apiSettings: ApiSetting[],
  defaultApiGateway: string
): Config {
  const apiGatewayDict: Dict<ApiGatewayInfo> = {};

  apiSettings.forEach((apiSetting) => {
    apiSetting.apiNames.forEach((apiName) => {
      apiSetting.stageNames.forEach((stageName) => {
        const displayName =
          stageName === "master" ? apiName : `${apiName}-${stageName}`;
        apiGatewayDict[displayName] = {
          type: apiSetting.type,
          region: REGION,
          url: `https://${apiName}.robocip.net/${stageName}/`,
        };
      });
    });
  });

  return {
    s3: {
      region: REGION,
      bucket: BUCKET,
    },
    apiGateways: apiGatewayDict,
    defaultApiGateway,
    cognito: {
      region: REGION,
      userPoolId: USER_POOL_ID,
      appClientId: APP_CLIENT_ID,
      identityPoolId: IDENTITY_POOL_ID,
    },
  };
}
