/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { API, Auth } from "aws-amplify";

import { FuncDef ,Dict} from "./api/pj1db-api";

export class ErrorInfo extends Error {
  errorCode: string;

  msg: string;

  response?: any;

  constructor(errorCode: string, msg: string, response?: any) {
    super(msg);
    this.msg = msg;
    this.errorCode = errorCode;
    this.response = response;
  }

  get displayMessage(): string {
    let message = `${this.errorCode}(${this.msg})`;
    if (
      typeof this.response !== "undefined" &&
      typeof this.response.data !== "undefined"
    ) {
      message += `\nresponse:\n${JSON.stringify(
        this.response.data,
        null,
        "\t"
      )}`;
    }
    return message;
  }

  static createFromResponse = (error: any): ErrorInfo => {
    let errorInfo: ErrorInfo;
    if (error.response) {
      // The request was made and the server responded with a status code that falls out of the range of 2xx
      errorInfo = new ErrorInfo(
        "ERROR_RESPONSE",
        error.message,
        error.response
      );
    } else if (error.request) {
      // The request was made but no response was received. `error.request` is an instance of XMLHttpRequest
      errorInfo = new ErrorInfo("NO_RESPONSE", error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      errorInfo = new ErrorInfo("REQUEST_FAILED", error.message);
    }
    console.error(errorInfo);
    return errorInfo;
  };
}

export type ApiResult<ResponseType> = {
  isSuccess: boolean;
  errorInfo: ErrorInfo | undefined;
  response: ResponseType | undefined;
  date: Date;
  getDateTimeString: () => string;
};

export async function callWebApi<ResponseType>(
  method: "get" | "post",
  apiName: string,
  funcPath: string,
  bodyObject?: object,
  queryStringParameters?: object
): Promise<ApiResult<ResponseType>> {
  if (apiName === null || apiName === "") {
    throw new ErrorInfo("REQUEST_FAILED", "API名が指定されていません");
  }

  const token = (await Auth.currentSession()).getIdToken().getJwtToken();

  console.log(
    "call API start\n",
    "funcPath=",
    funcPath,
    "\n",
    "queryStringParameters=",
    queryStringParameters,
    "\n",
    "bodyObject=",
    bodyObject,
    "\n"
  );

  const webApiResponse: ApiResult<ResponseType> = await API[method](
    apiName,
    funcPath,
    {
      queryStringParameters,
      headers: {
        Authorization: token,
      },
      body: bodyObject,
    }
  )
    .then((response) => {
      console.log("callWebApi success");
      console.log("response", response);
      const date = new Date();
      return {
        isSuccess: true,
        errorInfo: undefined,
        response,
        date,
        getDateTimeString: () =>
          `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      };
    })
    .catch((error) => {
      console.log("callWebApi error");

      const errorInfo = ErrorInfo.createFromResponse(error);
      console.log("ErrorInfo: ", errorInfo);
      const date = new Date();

      return {
        isSuccess: false,
        errorInfo,
        response: undefined,
        date,
        getDateTimeString: () =>
          `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      };
    });

  return webApiResponse;
}

/**
 * inverseがfalseの場合、
 * ・targetに指定されたkeyのみが対象になります。
 * ・targetがundefinedの場合、空になります。
 * inverseがtrueの場合、
 * ・targetに指定されたkey以外の全項目が対象になります。
 * ・targetがundefinedの場合、全項目になります。
 */
function filterObject(
  obj?: object,
  target?: string[],
  omitKeyWhenValueUndefined = true,
  inverse = false
): object | undefined {
  if (!obj) return undefined;
  const filtered = Object.fromEntries(
    inverse
      ? Object.entries(obj).filter(
          ([k, v]) =>
            (!omitKeyWhenValueUndefined || typeof v !== "undefined") &&
            (typeof target === "undefined" || !target.includes(k))
        )
      : Object.entries(obj).filter(
          ([k, v]) =>
            (!omitKeyWhenValueUndefined || typeof v !== "undefined") &&
            typeof target !== "undefined" &&
            target.includes(k)
        )
  );
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

/*
    APIをコールします。
    argがundefinedの時、
    １）フィールドを省略する
    ２）フィールドを残し値としてundefinedを設定する
    かはfuncDef.omitKeyWhenValueUndefinedで選べます。
    update系のAPI等において、フィールドのありなしで意味が異なる場合、
    例えば、１）がそのフィールドを更新しないことを意味し、２）がフィールドをunsetすることを意味する、
    という場合、omitKeyWhenValueUndefinedの設定を意図通りにする必要があります。
    */
export async function callWebApiUsingFuncDef<ParamType, ResponseType>(
  apiName: string,
  funcDef: FuncDef,
  params: ParamType
): Promise<ApiResult<ResponseType>> {
  console.log("callWebApiUsingFuncDef\n", "\n", "params=", params);
  let funcPath = funcDef.name;
  if (funcDef.path) {
    funcPath += "/";
    funcPath += funcDef.path
      .map((name) => {
        const p = params as unknown as Dict<unknown>;
        if (!(name in p)) throw new Error("path param not found");
        return p[name];
      })
      .join("/");
  }

  return callWebApi<ResponseType>(
    funcDef.method,
    apiName,
    funcPath,
    typeof funcDef.body === "undefined"
      ? filterObject(
          params as unknown as object,
          [
            ...(funcDef.path ? funcDef.path : []),
            ...(funcDef.query ? funcDef.query : []),
          ],
          funcDef.omitKeyWhenValueUndefined,
          true
        )
      : filterObject(
          params as unknown as object,
          funcDef.body,
          funcDef.omitKeyWhenValueUndefined
        ),
    filterObject(
      params as unknown as object,
      funcDef.query,
      funcDef.omitKeyWhenValueUndefined
    )
  );
}