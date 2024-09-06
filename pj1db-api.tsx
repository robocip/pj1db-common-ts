/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { API, Auth } from "aws-amplify";
import { ReactElement } from "react";

export const systemKeys = {
  _id: true,
  version: false,
  original: true,
  creator: false,
  inserted: true,
  deleted: true,
  updated: true,
};

export interface Dict<T> {
  [index: string]: T;
}

export interface DirectionFieldType {
  theta: number;
  phi: number;
}

export type DocumentValueType =
  | string
  | boolean
  | object
  | number
  | DirectionFieldType;

export interface FuncDef {
  method: "get" | "post";
  name: string;
  path?: string[];
  query?: string[];
  body?: string[];
  omitKeyWhenValueUndefined?: boolean;
}

export interface FuncCallDef<ArgsType, ParamType, ResponseType, ResultType> {
  convertArgsToParam: (args: ArgsType) => ParamType;
  convertResponseToResult: (res: ResponseType) => ResultType;
  funcDef: FuncDef;
}

export interface RobocipDbDocument {
  creator: string;
  version: string;
  original: boolean;
  inserted: number;
  deleted: boolean;
  updated: boolean;
}

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

export type ApiResult<U> = {
  isSuccess: boolean;
  errorInfo: ErrorInfo | undefined;
  response: U | undefined;
  date: Date;

  getErrorNode: (errorLabel: string) => ReactElement;
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
        getErrorNode: (errorLabel: string) => <div>{errorLabel}</div>,
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
        getErrorNode: (errorLabel: string) => (
          <div>
            {errorLabel}({errorInfo.msg})
            <pre>
              {errorInfo.response
                ? JSON.stringify(errorInfo.response.data, null, "\t")
                : "no response"}
            </pre>
          </div>
        ),
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

export const omitKeys = (obj: object, hideKeys: string[]): object =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([key, value]) =>
        !systemKeys[key as keyof typeof systemKeys] && !hideKeys.includes(key)
    )
  );

export const getDisplayString = (
  value: DocumentValueType,
  hideKeys: string[]
): string => {
  if (value instanceof Array) {
    return value.map((val) => getDisplayString(val, hideKeys)).join(",");
  }
  if (typeof value === "object") {
    const x = value === null ? null : omitKeys(value, hideKeys);
    return JSON.stringify(x, undefined, "  ");
  }
  return String(value);
};
