interface Dict<T> {
  [index: string]: T;
}

export default interface ApiSetting {
  apiNames: string[];
  stageNames: string[];
  type: string;
}

export const APIs: Dict<ApiSetting> = {
  work: {
    apiNames: ["pj1db-api-work"],
    stageNames: ["master", "dev", "test"],
    type: "work",
  },
  handling: {
    apiNames: ["pj1db-api-handling"],
    stageNames: ["master", "dev", "test"],
    type: "handling",
  },
  general: {
    apiNames: ["pj1db-api-general"],
    stageNames: ["master", "dev", "test"],
    type: "general",
  },
  free: {
    apiNames: ["pj1db-api-osaka1", "pj1db-api-tsukuba1", "pj1db-api-aist1"],
    stageNames: ["master", "dev", "test"],
    type: "free",
  },
  template: {
    apiNames: ["pj1db-api-template"],
    stageNames: ["master"],
    type: "free",
  },
};
