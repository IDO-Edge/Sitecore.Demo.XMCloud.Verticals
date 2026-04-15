export type LayoutDataUpdate = {
  identifier: string;
  entity_definition: string;
  operation: string;
  entity_culture: string;
};

export type WebhookRequestBody = {
  invocation_id: string;
  updates: LayoutDataUpdate[];
  continues: boolean;
};

export type SitecoreItemUrl = {
  identifier: string;
  entity_culture: string;
};

export interface TUrl {
  path?: string;
  scheme?: string;
  hostName?: string;
}

export interface TGetItemUrlRoot {
  item?: {
    url?: TUrl;
  };
}
