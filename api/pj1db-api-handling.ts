import { Dict, FuncDef } from "./pj1db-api";

// --------------------------------------------------------------------------------------
/**
 * handling APIのレスポンス型の定義
 */

type RegionState =
  | "notcalculated"
  | "calculating"
  | "calculated"
  | "recalculating"
  | "notcalculatedError"
  | "calculatedError";

type AttrStatus = "set" | "notset";

type CalcStatus =
  | "not_calc"
  | "queued_calc"
  | "calculating"
  | "calculated"
  | "error";

type UrdfStatus = "created" | "notcreated";

type XYZ = {
  x: number;
  y: number;
  z: number;
};

type ModelCalcInfo = {
  commonModel: {
    size: XYZ;
    center: XYZ;
  };
};

export type Direction = {
  theta: number;
  phi: number;
};

export type GravityWithThumbnail = {
  thumbnail: string;
  gravity: GravityInfo;
};

export type GravityInfo = {
  center?: Partial<XYZ>;
  radius?: number;
  weight?: number;
  standingDirection: Direction;
};

export type ModelStatusInfo = {
  gravity: AttrStatus;
  friction: AttrStatus;
  region: RegionState;
  grasp2p: RegionState;
  urdf_zip: UrdfStatus;
};

export type FrictionRegionInfo = {
  id: string;
  meshCount: number;
  friction: number | undefined;
};

export type Grasp2pInfo = {
  id: string;
  position: {
    center: number[];
    orientation: number[];
    radius: number;
    arc: number;
  };
  force: number;
  radius: number;
};

export type FindInstancesResponse = {
  [instanceId: string]: {
    thumbnail_list: string[];
  };
};

export type FindModelResponse = {
  modelId: string;
  metaInfo: ModelCalcInfo;
  status: ModelStatusInfo;
  gravityWithDirections: GravityWithThumbnail[];
  regionList: FrictionRegionInfo[];
  grasp2pList: Grasp2pInfo[];
  weight: number;
  url: {
    glb: {
      original: string[];
      common10k: string[];
      candidate?: string[];
      stable?: string[];
    };
    urdf_zip?: {
      common10k: string[];
    };
  };
};

export type CalcStablePollResponse = {
  result: string;
};

export type CalcBulkCandidateResponse = {
  count: number;
};

export type CalcBulkCandidatePollResponse = {
  count_in_progress: number;
};

export type CalcIndivCandidateResponse = {
  count: number;
};

export type CalcIndivCandidatePollResponse = {
  region: RegionState;
  calc: CalcStatus;
};

export type WriteFrictionResponse = {
  queueCalcStable: string;
};

export type WriteGravityResponse = {
  queueCalcStable: string;
};

// --------------------------------------------------------------------------------------
/**
 * handling APIのリクエストパラメータ型の定義
 */

type AttrFlag = {
  notset: boolean;
  set: boolean;
};

type CalcFlag = {
  notcalculated: boolean;
  calculating: boolean;
  calculated: boolean;
  recalculating: boolean;
  notcalculatedError: boolean;
  calculatedError: boolean;
};

export type FindInstancesParam = {
  version: string | undefined;
  deleted: boolean;
  queryAttr: string | undefined;
  queryCalc: string | undefined;
  handlingSearchCondition: {
    candidate_region_flag: CalcFlag;
    stable_region_flag: CalcFlag;
    friction_info_flag: AttrFlag;
    gravity_info_flag: AttrFlag;
  };
};

export type FindModelParam = {
  instanceId: string;
};

export type CalcStablePollParam = {
  modelId: string;
};

export type CalcBulkCandidateParam = {
  instanceIds: string[];
};

export type CalcBulkCandidatePollParam = {
  instanceIds: string[];
};

export type CalcIndivCandidateParam = {
  modelId: string;
};

export type CalcIndivCandidatePollParam = {
  modelId: string;
};

export type WriteFrictionParam = {
  modelId: string;
  friction: Dict<number | undefined>;
  creator: string;
};

export type WriteGravityParam = {
  modelId: string;
  gravity: GravityInfo;
  creator: string;
};

//--------------------------------------------------------------------------------------
/**
 * handling APIの呼び出し仕様定義
 */
export const handlingApi: Dict<FuncDef> = {
  findInstances: {
    method: "post",
    name: "findInstances_sync",
  },
  findModels: {
    method: "post",
    name: "findModels_sync",
  },
  calcStablePoll: {
    method: "post",
    name: "calcStable_poll",
  },
  calcBulkCandidatePoll: {
    method: "post",
    name: "calcBulkCandidate_poll",
  },
  calcBulkCandidate: {
    method: "post",
    name: "calcBulkCandidate_request",
  },
  calcIndivCandidate: {
    method: "post",
    name: "calcIndivCandidate_request",
  },
  writeFriction: {
    method: "post",
    name: "writeFriction_sync",
  },
  writeGravity: {
    method: "post",
    name: "writeGravity_sync",
  },
  calcIndivCandidatePoll: {
    method: "post",
    name: "calcIndivCandidate_poll",
  },
};

//--------------------------------------------------------------------------------------
/**
 * utility関数
 */
export const calcInitialGravityInfo = (
  gravity: GravityInfo | undefined,
  rawSize: XYZ | undefined
) => {
  const info = {
    centerDefault: [gravity?.center?.x, gravity?.center?.y, gravity?.center?.z],
    centerMinMax: [{}, {}, {}],
    radiusDefault: gravity?.radius,
    radiusMinMax: {
      min: 0,
    },
    weightDefault: gravity?.weight,
    weightMinMax: {
      min: 0,
    },
  };

  if (rawSize) {
    const maxSize = Math.max(rawSize.x, rawSize.y, rawSize.z);
    const limitSize = Math.sqrt(3) * maxSize;
    info.centerMinMax[0] = { min: -limitSize / 2, max: limitSize / 2 };
    info.centerMinMax[1] = { min: -limitSize / 2, max: limitSize / 2 };
    info.centerMinMax[2] = { min: 0, max: limitSize };
  }

  return info;
};
