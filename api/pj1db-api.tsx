/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */


export const systemKeys = {
  _id: true,
  version: false,
  original: true,
  creator: false,
  created: true,
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
