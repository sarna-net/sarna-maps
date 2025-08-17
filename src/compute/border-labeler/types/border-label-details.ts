// TODO this could be a more general type (not specific to just border labels)
export interface BorderLabelDetails {
  width: number;
  height: number;
  tokens: Array<{ str: string; width: number }>;
}
