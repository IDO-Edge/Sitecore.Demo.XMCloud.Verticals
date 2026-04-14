import { initRequestClient } from '../../../../lib/graphql-client-factory/requestClient';
import { GetItemUrl } from '../../../../lib/webhook/revalidate/graphql';
import {
  SitecoreItemUrl,
  TGetItemUrlRoot,
  TUrl,
  WebhookRequestBody,
} from '../../../../lib/webhook/revalidate/type';
import type { NextApiRequest, NextApiResponse } from 'next';

function fetchItemUrlQuery(id: string, lang: string): Promise<TGetItemUrlRoot> {
  /* This uses Sitecore GraphQLClient wich has built-in debug logging */
  const client = initRequestClient();

  return client.request<TGetItemUrlRoot>(GetItemUrl, {
    id: id,
    lang: lang,
  });
}

async function fetchItemUrl(itemId: string, lang: string): Promise<TUrl> {
  const data = await fetchItemUrlQuery(itemId, lang);

  if (data?.item?.url) {
    return data.item.url;
  }
  return {} as TUrl;
}

/**
 * Handles the webhook request.
 * @param req - The NextApiRequest object.
 * @param res - The NextApiResponse object.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // Check if the onUpdate webhook is enabled
      if (process.env.Enable_OnUpdate_Webhook === 'false') {
        res.status(200).end('Webhook is disabled');
        return;
      }
      const { updates } = req.body as WebhookRequestBody;

      // Filter out the LayoutData updates (Items that has layout), and get the item URL for each item page
      const layoutDataUpdates: SitecoreItemUrl[] = updates
        .filter((update) => update.entity_definition === 'LayoutData')
        .map(({ identifier, entity_culture }) => ({ identifier, entity_culture }));

      const urls: TUrl[] = await Promise.all(
        layoutDataUpdates.map(async ({ identifier, entity_culture }): Promise<TUrl> => {
          return fetchItemUrl(identifier.replace('-layout', ''), entity_culture);
        })
      );
      console.log('onUpdate Webhook: URLs that needs to be revalidated : ', urls);
      // for each Url for a page which it's Layout been updated on edge, Revalidate the URLs in Vercel cache

      let headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
      if (process.env.Vercel_Bypass_Secret && process.env.Vercel_Bypass_Secret !== '') {
        headers = {
          'Content-Type': 'application/json',
          'x-vercel-protection-bypass': process.env.Vercel_Bypass_Secret ?? '',
        };
      }

      // Here we are looping through the URLs and revalidating them on Vercel by calling a different API /api/admin/revalidate for every url
      // We might need to use a Message Queue to handle this in case of a large number of URLs, as Sitecore Edge
      // has limitation of how many request per seconds we can request, as each revalidate request to Vercel will
      // results in multiple requests to Sitecore Edge to reconstruct the page we are revalidating
      urls.forEach(async (str) => {
        if (str !== undefined && str?.path !== undefined && str?.path !== '') {
          const hostname = process.env.RevalidateBaseUrl
            ? process.env.RevalidateBaseUrl
            : str?.scheme + '://' + str?.hostName;
          if (hostname.includes('sitecorecloud.io')) {
            // Skip revalidating the URL if Url includes sitecorecloud.io as it means the site definition hostname is not set up yet
            console.log(
              'onUpdate Webhook: Skipping revalidating the following URL : ' + hostname + str?.path
            );
          } else {
            console.log(
              'onUpdate Webhook: Revalidating the following URL : ' + hostname + str?.path
            );
            await fetch(hostname + '/api/admin/revalidate', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, url: str?.path }),
            })
              .then((response) => {
                console.log(
                  'onUpdate Webhook: Revalidate response',
                  response && response.status,
                  response && response.statusText
                );
              })
              .catch((error) => {
                console.error('onUpdate Webhook: Error revalidating the URL : ', error);
              });
          }
        }
      });
      res.status(200).end('Webhook processed successfully');
    } catch (error) {
      console.error('onUpdate Webhook: ' + error);
      // we need to respond with 200 to avoid retries from webhook invocation
      res.status(200).end('Webhook processed unsuccessfully');
    }
  } else {
    // Handle any other HTTP method
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
