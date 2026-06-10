export type BlueprintSectionRefineProps = {
  onRefineModule?: (field: string, instruction: string) => Promise<void>;
  refiningModule?: string | null;
  isRefining?: boolean;
};

export type CockpitStat = {
  label: string;
  value: number | string;
};
