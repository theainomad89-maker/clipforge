import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, platform } = body as { projectId: string, platform: string };

    if (!projectId || !platform) {
      return NextResponse.json({ error: 'Missing projectId or platform' }, { status: 400 });
    }

    // Validate environment variables
    const missing = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].filter((k)=>!process.env[k]);
    if (missing.length) {
      console.error('process env missing:', missing);
      return NextResponse.json({ error: `Server env missing: ${missing.join(', ')}` }, { status: 500 });
    }

    // build admin client inside the handler
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Update project platform + status
    console.log('process: update project', { projectId, platform });
    const { error: uerr } = await supa
      .from('projects')
      .update({ platform, status: 'uploaded' })
      .eq('id', projectId);
    if (uerr) {
      console.error('process update error:', uerr);
      return NextResponse.json({ error: uerr.message || 'update failed' }, { status: 500 });
    }

    // Create job
    console.log('process: insert job');
    const { data, error } = await supa
      .from('jobs')
      .insert({ project_id: projectId, status: 'queued' })
      .select('id')
      .single();

    if (error) {
      console.error('process insert job error:', error);
      return NextResponse.json({ error: error.message || 'job insert failed' }, { status: 500 });
    }

    console.log('process: queued job', data.id);
    return NextResponse.json({ jobId: data.id });
  } catch (e:any) {
    console.error('process fatal:', e);
    return NextResponse.json({ error: e?.message || 'internal error' }, { status: 500 });
  }
}
