import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function withRetry<T>(fn: () => Promise<T>, tries = 3) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e:any) { lastErr = e; }
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  throw lastErr;
}

export async function POST() {
  // sanity: ensure envs exist
  const missing = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].filter((k)=>!process.env[k]);
  if (missing.length) {
    console.error('Missing env(s):', missing);
    return NextResponse.json({ error: `Server env missing: ${missing.join(', ')}` }, { status: 500 });
  }

  // build admin client inside the handler (so envs are definitely loaded)
  const supa = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    const projectId = crypto.randomUUID();
    const fileKey = `userless/${projectId}/source.mp4`;

    // IMPORTANT: bucket 'videos' must exist (private is fine)
    const { data: up, error: upErr } = await withRetry(() =>
      supa.storage.from('videos').createSignedUploadUrl(fileKey, 60 * 10)
    );

    if ((upErr && !up) || !up) {
      console.error('createSignedUploadUrl error:', upErr);
      return NextResponse.json({ error: upErr?.message || 'upload url failed' }, { status: 500 });
    }

    const { error: insErr } = await withRetry(() =>
      supa.from('projects').insert({ id: projectId, title: `Project ${projectId.slice(0,8)}`, source_path: fileKey })
    );

    if (insErr) {
      console.error('insert project error:', insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ projectId, signedUrl: (up as any).signedUrl, path: fileKey });
  } catch (e:any) {
    console.error('upload-url fatal:', e);
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 });
  }
}
