import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const path = request.nextUrl.searchParams.get('path');

  const revalidateSecret = process.env.REVALIDATE_SECRET;

  // Refuse to run without a configured secret in production — otherwise anyone
  // could trigger cache revalidation. In dev, fall back to a local-only secret.
  if (!revalidateSecret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Revalidation is not configured' }, { status: 503 });
    }
  }

  const effectiveSecret = revalidateSecret || 'dev-secret-change-me';
  if (!secret || secret !== effectiveSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    revalidatePath(path);
    return NextResponse.json({
      revalidated: true,
      path,
      message: `Revalidated ${path}`
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to revalidate ${path}: ${String(err)}` },
      { status: 500 }
    );
  }
}
