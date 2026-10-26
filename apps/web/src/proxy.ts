import { NextResponse, type NextRequest } from 'next/server';

// All mutations go through the API; this application does not expose Server Actions.
export function proxy(request: NextRequest) {
  if (request.headers.has('next-action')) {
    return new NextResponse('Method not allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
    });
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
