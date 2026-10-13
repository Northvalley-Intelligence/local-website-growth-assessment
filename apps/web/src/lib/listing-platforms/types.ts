export type PlatformFieldSpec = {
  key: string;
  step: number;
  stepTitle: string;
  label: string;
  required: boolean;
  help?: string;
  appleRule?: string;
};

export type PreparedField = PlatformFieldSpec & {
  value: string | null;
  missing: boolean;
  warnings: string[];
};

export type PlatformSheet = {
  platform: "apple";
  steps: { title: string; fields: PreparedField[] }[];
  eligibility: { ok: boolean; warnings: string[] };
  missingRequired: string[];
};
