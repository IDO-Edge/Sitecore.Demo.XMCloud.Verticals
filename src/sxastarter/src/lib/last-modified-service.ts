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
  private client: GraphQLClient | null;

  constructor() {
    if (config.sitecoreEdgeContextId) {
      const endpoint = getEdgeProxyContentUrl(config.sitecoreEdgeContextId, config.sitecoreEdgeUrl);
      this.client = new GraphQLClient(endpoint, { fetch });
    } else if (config.graphQLEndpoint) {
      const headers: Record<string, string> = {};
      if (config.sitecoreApiKey) {
        headers['sc_apikey'] = config.sitecoreApiKey;
      }
      this.client = new GraphQLClient(config.graphQLEndpoint, { fetch, headers });
    } else {
      this.client = null;
    }
  }

  async getLastModified(
    siteName: string,
    language: string,
    itemPath: string
  ): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const data = await this.client.request<ItemUpdatedResponse>(ITEM_UPDATED_QUERY, {
        siteName,
        language,
        itemPath,
      });

      const updated = data?.layout?.item?.__updated;

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
