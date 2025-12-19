export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  sampleBundleJson?: string;
  rulesJson?: string;
  codeMasterJson?: string;
  features?: {
    treeRuleAuthoring?: boolean;
  };
}
