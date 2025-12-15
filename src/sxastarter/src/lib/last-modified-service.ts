import {
  GraphQLRequestClient,
  GraphQLRequestClientFactory,
} from '@sitecore-jss/sitecore-jss-nextjs/graphql';

const ITEM_UPDATED_QUERY = /* GraphQL */ `
  query ItemUpdated($siteName: String!, $language: String!, $itemPath: String!) {
    layout(site: $siteName, routePath: $itemPath, language: $language) {
      item {
        updated
      }
    }
  }
`;

interface ItemUpdatedResponse {
  layout: {
    item: {
      updated: string;
    } | null;
  } | null;
}

export interface LastModifiedServiceConfig {
  clientFactory: GraphQLRequestClientFactory;
}

export class LastModifiedService {
  private graphQLClient: GraphQLRequestClient;

  constructor(config: LastModifiedServiceConfig) {
    this.graphQLClient = config.clientFactory();
  }

  async getLastModified(
    siteName: string,
    language: string,
    itemPath: string
  ): Promise<string | null> {
    try {
      const data = await this.graphQLClient.request<ItemUpdatedResponse>(ITEM_UPDATED_QUERY, {
        siteName,
        language,
        itemPath,
      });

      const updated = data?.layout?.item?.updated;

      return updated || null;
    } catch (error) {
      return null;
    }
  }

  formatHttpDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toUTCString();
  }
}
