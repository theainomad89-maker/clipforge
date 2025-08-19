import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST() {
  try {
    const projectId = crypto.randomUUID();
    const fileKey = `userless/${projectId}/source.mp4`;

    // Signed upload URL to Supabase Storage (videos bucket)
    const { data, error } = await supabaseAdmin.storage
      .from('videos')
      .createSignedUploadUrl(fileKey, 60 * 10); // 10 min

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'upload url failed' }, { status: 500 });
    }

    // Create project
    const { error: perr } = await supabaseAdmin
      .from('projects')
      .insert({ id: projectId, title: `Project ${nanoid(6)}`, source_path: fileKey });

    if (perr) {
      return NextResponse.json({ error: perr.message }, { status: 500 });
    }

    return NextResponse.json({ projectId, signedUrl: data.signedUrl, path: fileKey });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
