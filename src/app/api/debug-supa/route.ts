import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: buckets, error } = await supa.storage.listBuckets();
    return NextResponse.json({
      ok: !error,
      buckets: buckets?.map(b=>b.name),
      hasUrl: !!process.env.SUPABASE_URL,
      hasSrv: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message });
  }
}
