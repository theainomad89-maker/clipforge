import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const { data: job, error: jerr } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (jerr || !job) return NextResponse.json({ error: jerr?.message || 'job not found' }, { status: 404 });

  let clips = [];
  if (job.status === 'done') {
    const { data: c, error: cerr } = await supabaseAdmin
      .from('clips')
      .select('id, idx, duration_sec, mp4_path, srt_path, thumb_path')
      .eq('project_id', job.project_id)
      .order('idx', { ascending: true });
    if (!cerr && c) clips = c;
  }

  return NextResponse.json({ job, clips });
}
