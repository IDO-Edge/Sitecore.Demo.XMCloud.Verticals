import { NextRequest, NextResponse } from 'next/server';
import { MiddlewarePlugin } from '..';
import { LastModifiedService } from 'lib/last-modified-service';
import { siteResolver } from 'lib/site-resolver';

class LastModifiedPlugin implements MiddlewarePlugin {
  private lastModifiedService: LastModifiedService;

  // Run after other middleware plugins to ensure site resolution has occurred
  order = 10;

  constructor() {
    this.lastModifiedService = new LastModifiedService();
  }

  async exec(req: NextRequest, res?: NextResponse): Promise<NextResponse> {
    const response = res || NextResponse.next();

    // Skip if disabled
    if (this.isDisabled()) {
      return response;
    }

    // Skip excluded routes
    if (this.excludeRoute(req.nextUrl.pathname)) {
      return response;
    }

    response.headers.set('Last-Modified', 'Wed, 21 Oct 2025 07:28:00 GMT');

    return response;
    
    try {
      // Get site name from cookie or resolve from host
      const siteName = this.getSiteName(req);
      if (!siteName) {
        return response;
      }

      // Get language from URL or default
      const language = this.getLanguage(req);

      // Get item path from URL
      const itemPath = this.getItemPath(req);

      // Fetch last modified date
      console.log('fetching last modified date for: ', siteName, language, itemPath);
      const lastModified = await this.lastModifiedService.getLastModified(
        siteName,
        language,
        itemPath
      );

      if (lastModified) {
        const httpDate = this.lastModifiedService.formatHttpDate(lastModified);
        response.headers.set('Last-Modified', httpDate);
        console.log('set Last-Modified header: %s', httpDate);
      }
    } catch (error) {
      console.error('error in last modified middleware: %o', error);
    }

    return response;
  }

  private isDisabled(): boolean {
    return process.env.DISABLE_LAST_MODIFIED_MIDDLEWARE === 'true';
  }

  private excludeRoute(pathname: string): boolean {
    // Exclude static files, API routes, and other non-page routes
    const excludePatterns = [
      /^\/api\//,
      /^\/sitecore\//,
      /^\/_next\//,
      /^\/favicon\.ico$/,
      /\.[a-zA-Z0-9]+$/, // Files with extensions
    ];

    return excludePatterns.some((pattern) => pattern.test(pathname));
  }

  private getSiteName(req: NextRequest): string | null {
    // Try to get site name from cookie (set by multisite middleware)
    const siteCookie = req.cookies.get('sc_site');
    if (siteCookie?.value) {
      return siteCookie.value;
    }

    // Fall back to resolving from hostname
    const hostHeader = req.headers.get('host');
    if (hostHeader) {
      const site = siteResolver.getByHost(hostHeader);
      return site?.name || null;
    }

    return null;
  }

  private getLanguage(req: NextRequest): string {
    const pathname = req.nextUrl.pathname;
    const pathParts = pathname.split('/').filter(Boolean);

    // Check if first path segment is a known locale
    const locales = ['en', 'fr-CA', 'ja-JP'];
    if (pathParts.length > 0 && locales.includes(pathParts[0])) {
      return pathParts[0];
    }

    // Default language
    return 'en';
  }

  private getItemPath(req: NextRequest): string {
    const pathname = req.nextUrl.pathname;
    const pathParts = pathname.split('/').filter(Boolean);

    // Check if first path segment is a known locale
    const locales = ['en', 'fr-CA', 'ja-JP'];
    if (pathParts.length > 0 && locales.includes(pathParts[0])) {
      // Remove locale from path
      return '/' + pathParts.slice(1).join('/') || '/';
    }

    return pathname || '/';
  }
}

export const lastModifiedPlugin = new LastModifiedPlugin();
