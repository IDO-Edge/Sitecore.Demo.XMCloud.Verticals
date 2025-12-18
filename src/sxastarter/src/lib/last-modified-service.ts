import { GraphQLClient } from 'graphql-request';
import { getEdgeProxyContentUrl } from '@sitecore-jss/sitecore-jss-nextjs/graphql';
import config from 'temp/config';

const ITEM_UPDATED_QUERY = /* GraphQL */ `
  query ItemUpdated($siteName: String!, $language: String!, $itemPath: String!) {
    layout(site: $siteName, routePath: $itemPath, language: $language) {
      item {
        field(name: "__updated") {
          value
        }
      }
    }
  }
`;

interface ItemUpdatedResponse {
  layout: {
    item: {
      __updated: string;
    } | null;
  } | null;
}

export class LastModifiedService {
  private client: GraphQLClient;

  constructor() {
    if (!config.sitecoreEdgeContextId) {
      throw new Error('sitecoreEdgeContextId is required for LastModifiedService.');
    }
    const endpoint = getEdgeProxyContentUrl(config.sitecoreEdgeContextId, config.sitecoreEdgeUrl);
    this.client = new GraphQLClient(endpoint, { fetch });
  }

  async getLastModified(
    siteName: string,
    language: string,
    itemPath: string
  ): Promise<string | null> {
    try {
      const data = await this.client.request<ItemUpdatedResponse>(ITEM_UPDATED_QUERY, {
        siteName,
        language,
        itemPath,
      });

      const updated = data?.layout?.item?.__updated;
      console.log('item:', data.layout.item)
      return updated || null;
    } catch (error) {
      console.error('error in getLastModified:', error);
      return null;
    }
  }

  formatHttpDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toUTCString();
  }
}
