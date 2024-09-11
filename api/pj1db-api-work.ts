import { RobocipDbDocument, Dict, FuncDef } from "./pj1db-api";

// --------------------------------------------------------------------------------------
/**
 * work APIのレスポンス型の定義
 */

interface DirectionField {
  theta: number;
  phi: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}
export interface WorkModelCalc {
  rawCenter: XYZ;
  rawSize: XYZ;
}

export interface WorkModelAttr extends RobocipDbDocument {
  calc: WorkModelCalc;
  "model-id": string;
  "instance-id": string;
  when: number;
  who: string;
  faceDirection: DirectionField;
  upDirection: DirectionField;
  extra: object;
}
export interface WorkInstanceAttr extends RobocipDbDocument {
  calc: Dict<unknown>;
  "instance-id": string;
  "class-id": string;
  description: string;
  extra: object;
}
export interface WorkClassAttr extends RobocipDbDocument {
  calc: Dict<unknown>;
  "class-id": string;
  parent: string;
  nameJp: string;
  nameEn: string;
  standingPosture: object;
  extra: object;

  children: string[];
  instances: string[];
}

export interface WorkModelDocument {
  attr: WorkModelAttr;
  url?: WorkModelDocumentUrl;
}

export interface WorkModelDocumentUrl {
  obj: ObjUrl;
  obj_zip?: ObjZip;
  glb: GlbUrl;
  thumbnail: ThumbnailUrl;
  usdz?: UsdzUrl;
  urdf_zip?: UrdfZip;
}

export interface ObjUrl {
  original: string[];
  common?: string[];
  common10k?: string[];
  common30k?: string[];
  candidate?: string[];
}

export interface GlbUrl {
  original: string[];
  common?: string[];
  common10k?: string[];
  common30k?: string[];
  candidate?: string[];
  stable?: string[];
}

export interface ThumbnailUrl {
  original: string[];
  common?: string[];
}

export interface UsdzUrl {
  common30k?: string[];
  candidate?: string[];
  simulation?: string[];
}

export interface ObjZip {
  all?: string[];
}

export interface UrdfZip {
  common10k?: string[];
}

export interface WorkInstanceDocument {
  attr: WorkInstanceAttr;
  url?: Dict<string>;
}
export interface WorkClassDocument {
  attr: WorkClassAttr;
  url?: Dict<string>;
  instanceModelRelation?: Dict<string[]>;
}

export interface ClassTreeDocument {
  attr: WorkClassAttr;
  url: Dict<string>;
  childIdList: string[];
}

export type WorkDbStatusDocument = Dict<
  string | boolean | Dict<string | string[]>
>;

export type BaseFindResponse = {
  total_count: number;
  items: WorkAnyDocumentDict;
};

export type SpecificFindResponse<T> = {
  total_count: number;
  items: Dict<T>;
};

export type WorkAnyDocument =
  | WorkModelDocument
  | WorkInstanceDocument
  | WorkClassDocument;

export type WorkAnyDocumentDict =
  | Dict<WorkModelDocument>
  | Dict<WorkInstanceDocument>
  | Dict<WorkClassDocument>;

// --------------------------------------------------------------------------------------
/**
 * work APIのリクエストパラメータ型の定義
 */

export type Hierarchy = "model" | "instance" | "class";

export interface FindParam {
  hierarchy: Hierarchy;

  version?: string /*
  versionを省略した場合、安定versionのデータのみを返します。
  versionに"all"を指定した場合、全てのversionのデータを返します。
  versionにversionIDを指定した場合、該当のversionのデータのみを返します。
  versionIDを”_”で連結した文字列を指定した場合、該当する複数のversionのデータのみを返します。
  ※安定versionは、collectionごとにROBOCIP側で管理する
  */;
  deleted?: boolean; // trueの場合、delete APIで削除されたdocumentも返却対象に含める

  queryAttr?: object; // work-model-attrコレクション及びwork-model-calcコレクションにおける指定条件を満たす一部のモデル情報のみを取得したい場合に指定する。
  queryCalc?: object; // query-attrとquery-calcの両方を指定した場合は、両方を満たす（AND条件）モデル情報のみを返す
  limit?: number;
  skip?: number;
}

export interface FindClassTreeParam {
  classId: string;
  class_version: string;
  instance_version: string;
  model_version: string;
}

export interface DeleteParam {
  id: string; // model-id／instance-id／class-idのいずれかを指定する
  restore?: boolean; // falseを指定した場合データを削除（soft delete）する。trueを指定した場合データをリストアする
}

export interface InsertModelRequestParam {
  version: string; // モデル属性データの形式versionを識別する文字列（versionID）を指定する。 versionIDは、数字,英字及びハイフン（-）の組み合わせからなる文字列とする（大文字小文字は区別する）

  bulk?: boolean; // s3Uriで「モデルが含まれるフォルダ」を指定する場合（モデル１個の登録）はfalse、s3Uriで「モデルが含まれるフォルダ」の親フォルダを指定する場合（モデル複数の登録）はtrue
  addInstance?: boolean; // instance-idを指定しない時のみ有効。trueの場合、自動的にInsert Instanceを実行しその結果のインスタンスIDをモデルにセットする
  addClass?: boolean; // addInstanceがtrueの時のみ有効。trueの場合、自動的にInsert Classを実行しその結果のクラスIDをインスタンスにセットする
  scale?: number;
  changeYZ?: boolean;

  instanceId?: string; // このモデルが属するインスタンスを一意に識別するID
  when?: number; // モデルの測定日時  ※DBにデータを投入した時間とは異なる ※UTC基準でUnix epochからの経過時間をミリ秒単位で表した値。
  who?: string; // モデルの測定者 ※DBにデータを投入した人とは異なる場合がある
  s3Uri: string; // ファイルを投入したS3の「フォルダのURI」を記載する（※１）例：s3://robocip-db-data/robocip/
  fileType: string; // ファイルの構成を区別する文字列。“obj” ： S3のフォルダには.objと.mtlが含まれる。“obj-texture” ： S3のフォルダには.objと.mtlとテクスチャ画像が含まれる。“raw-hoge”：S3のフォルダには生データが含まれる。ファイル構成はhoge方式である（「hoge」は任意文字列でwork-rawコレクションのraw-typeに保存する）
  groundTruth?: boolean; // 実用的でない手の込んだ測定方法を用いた場合true
}

export interface InsertModelPollParam {
  modelId: string; // 処理ステータスを確認したいモデル属性データのID（model-id）※複数指定したい場合は、_で連結すること※モデル属性データのIDは、数字,英字及びハイフン（-）の組み合わせからなる文字列とする（大文字小文字は区別する）
}

export interface UpdateModelParam {
  modelId: string; // モデルを特定するIDを指定する
  instanceId?: string; // このモデルが属するインスタンスを一意に識別するID
  when?: number; // モデルの測定日時  ※DBにデータを投入した時間とは異なる
  who?: string; // モデルの測定者 ※DBにデータを投入した人とは異なる場合がある
  faceDirection?: DirectionField; // モデルファイル座標系において正面方向ベクトルを表すベクトル
  upDirection?: DirectionField; // モデルファイル座標系において上方向ベクトルを表すベクトル
  extra?: object; // 任意のキーバリューからなる属性値
}

export interface InsertInstanceParam {
  version: string; // モデル属性データの形式versionを識別する文字列（versionID）を指定する。 versionIDは、数字,英字及びハイフン（-）の組み合わせからなる文字列とする（大文字小文字は区別する）
  classId?: string; //
  description?: string; //
  extra?: object; //
}
export interface UpdateInstanceParam {
  instanceId: string; // インスタンスを特定するIDを指定する
  append?: boolean; //
  classId?: string; //
  description?: string; //
  extra?: object; //
}

export interface InsertClassParam {
  version: string; // クラス属性データの形式versionを識別する文字列（versionID）を指定する。 versionIDは、数字,英字及びハイフン（-）の組み合わせからなる文字列とする（大文字小文字は区別する）
  parent?: string; //
  nameJp: string; //
  nameEn?: string; //
  extra?: object; //
}
export interface UpdateClassParam {
  classId: string; // クラスを特定するIDを指定する
  append?: boolean; //
  parent?: string; //
  nameJp?: string; //
  nameEn?: string; //
  standingPosture?: object; //
  extra?: object; //
}

export interface InsertClassFamilyParam {
  version: string; // モデル属性データの形式versionを識別する文字列（versionID）を指定する。 versionIDは、数字,英字及びハイフン（-）の組み合わせからなる文字列とする（大文字小文字は区別する）
  nameFamily: object; //
}

//--------------------------------------------------------------------------------------
/**
 * work APIを間接的に呼び出す型の定義
 */

export interface FindOneCallArgs {
  id: string;
}

//--------------------------------------------------------------------------------------
/**
 * レスポンスで得られるdocumentの属性情報
 */

export const defaultHideKeysInCalc = [
  "model-id",
  "instance-id",
  "class-id",
  "s3Key",
  "sha256",
];
export const editableModelFields = [
  "instance-id",
  "when",
  "who",
  "faceDirection",
  "upDirection",
  "extra",
];
export const editableInstanceFields = ["class-id", "description", "extra"];
export const editableClassFields = ["parent", "nameJp", "nameEn", "extra"];

//--------------------------------------------------------------------------------------
/**
 * work APIの呼び出し仕様定義
 */

export const workApi: Dict<FuncDef> = {
  find: {
    // パラメータによって定まるクエリを使用し、DBからデータを取得します。
    method: "post",
    name: "find_sync",
    path: ["hierarchy"],
    query: ["version", "deleted", "limit", "skip"],
    body: ["queryAttr", "queryCalc"],
    omitKeyWhenValueUndefined: true,
  },
  findClassTree: {
    // DBからクラス木構造を取得します。
    method: "post",
    name: "findClassTree_sync",
    path: ["classId"],
    query: ["class_version", "instance_version", "model_version"],
    omitKeyWhenValueUndefined: true,
  },
  delete: {
    // DB中のドキュメントに削除フラグを設定もしくは解除します。
    method: "get",
    name: "delete_sync",
    path: ["id"],
    query: ["restore"],
    omitKeyWhenValueUndefined: true,
  },
  insertModel: {
    // DBへのモデルデータを書き込みをトリガーします（完了を待ちません）
    method: "post",
    name: "insertModel_request",
    path: ["version"],
    query: ["bulk", "addInstance", "addClass", "scale", "changeYZ"],
    body: ["instanceId", "when", "who", "s3Uri", "fileType", "groundTruth"],
    omitKeyWhenValueUndefined: true,
  },
  insertModelPoll: {
    // DBへモデルデータの書き込み状況を確認します。
    method: "get",
    name: "insertModel_poll",
    query: ["modelId"],
    omitKeyWhenValueUndefined: true,
  },
  updateModel: {
    // DBのモデルデータを更新します。
    method: "post",
    name: "updateModel_sync",
    path: ["modelId"],
    body: [
      "instanceId",
      "when",
      "who",
      "faceDirection",
      "upDirection",
      "extra",
    ],
    omitKeyWhenValueUndefined: false,
  },
  insertInstance: {
    // DBへインスタンスデータを書き込みます。
    method: "post",
    name: "insertInstance_sync",
    path: ["version"],
    query: [],
    body: ["classId", "description", "extra"],
    omitKeyWhenValueUndefined: true,
  },
  updateInstance: {
    // DBのインスタンスデータを更新します。
    method: "post",
    name: "updateInstance_sync",
    path: ["instanceId"],
    query: ["append"],
    body: ["classId", "description", "extra"],
    omitKeyWhenValueUndefined: false,
  },
  insertClass: {
    // DBへクラスデータを書き込みます。
    method: "post",
    name: "insertClass_sync",
    path: ["version"],
    body: ["parent", "nameJp", "nameEn", "extra"],
    omitKeyWhenValueUndefined: true,
  },
  updateClass: {
    // DBのクラスデータを更新します。
    method: "post",
    name: "updateClass_sync",
    path: ["classId"],
    query: ["append"],
    body: ["parent", "nameJp", "nameEn", "standingPosture", "extra"],
    omitKeyWhenValueUndefined: false,
  },
  insertClassFamily: {
    method: "post",
    name: "insertClassFamily_sync",
    path: ["version"],
    body: ["nameFamily"],
    omitKeyWhenValueUndefined: true,
  },
};

/**
 * work APIを間接的に呼び出す方法の仕様定義
 */

export const workApiCallDef = {
  findOne: {
    convertArgsToParam: (args: FindOneCallArgs): FindParam => {
      const hierarchy: Hierarchy = args.id.split("-")[0] as Hierarchy;
      return {
        hierarchy,
        version: "all",
        deleted: true,
        queryAttr: { [`${hierarchy}-id`]: args.id },
        queryCalc: {},
      };
    },
    convertResponseToResult: <T extends WorkAnyDocument>(
      res: BaseFindResponse
    ): T | undefined => {
      const keys = Object.keys(res.items);
      return keys.length > 0 ? (res.items[keys[0]] as T) : undefined;
    },
    funcDef: workApi.find,
  },
};
