import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, platform } = body as { projectId: string, platform: string };

    // Update project platform + status
    const { error: uerr } = await supabaseAdmin
      .from('projects')
      .update({ platform, status: 'uploaded' })
      .eq('id', projectId);
    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });

    // Create job
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .insert({ project_id: projectId, status: 'queued' })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ jobId: data.id });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
