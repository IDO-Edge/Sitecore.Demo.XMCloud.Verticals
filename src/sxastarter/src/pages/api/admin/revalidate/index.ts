import type { NextApiRequest, NextApiResponse } from 'next';

export default handler;
export interface revalidateRequest {
  url?: string;
  secret?: string;
}
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const revalidateRequest = req.body as revalidateRequest;
  let revalidated = false;
  console.info('revalidateRequest', revalidateRequest);
  if (revalidateRequest.secret !== process.env.REVALIDATE_SECRET) {
    console.info('Failed to revalidate, reason : secret does not match ');
    res.end('Revalidated : ' + revalidated);
  }

  try {
    let pathToClear = '/';
    if (revalidateRequest) {
      pathToClear = revalidateRequest?.url || '';
    }
    if (pathToClear === '') {
      res.end('Revalidated : ' + revalidated);
    }
    console.info('validating url ', pathToClear);
    await res.revalidate(pathToClear);
    revalidated = true;
  } catch (err) {
    //logOnDev('error on revalidateRequest', err);
    console.info('error on revalidateRequest', err);
  }
  res.end('Revalidated : ' + revalidated);
}
