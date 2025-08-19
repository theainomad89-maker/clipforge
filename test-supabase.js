import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '✅ Present' : '❌ Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n📊 Testing Database Tables...');
    
    // Test projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (projectsError) {
      console.log('❌ Projects table error:', projectsError.message);
    } else {
      console.log('✅ Projects table accessible');
    }

    // Test jobs table
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('count')
      .limit(1);
    
    if (jobsError) {
      console.log('❌ Jobs table error:', jobsError.message);
    } else {
      console.log('✅ Jobs table accessible');
    }

    // Test clips table
    const { data: clips, error: clipsError } = await supabase
      .from('clips')
      .select('count')
      .limit(1);
    
    if (clipsError) {
      console.log('❌ Clips table error:', clipsError.message);
    } else {
      console.log('✅ Clips table accessible');
    }

    console.log('\n🗄️ Testing Storage Buckets...');
    
    // Test videos bucket
    const { data: videosList, error: videosError } = await supabase.storage
      .from('videos')
      .list('', { limit: 1 });
    
    if (videosError) {
      console.log('❌ Videos bucket error:', videosError.message);
    } else {
      console.log('✅ Videos bucket accessible');
    }

    // Test clips bucket
    const { data: clipsList, error: clipsStorageError } = await supabase.storage
      .from('clips')
      .list('', { limit: 1 });
    
    if (clipsStorageError) {
      console.log('❌ Clips bucket error:', clipsStorageError.message);
    } else {
      console.log('✅ Clips bucket accessible');
    }

    console.log('\n🔐 Testing Signed URL Generation...');
    
    // Test signed upload URL
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl('test/test.mp4', 60);
    
    if (signedUrlError) {
      console.log('❌ Signed URL error:', signedUrlError.message);
    } else {
      console.log('✅ Signed URL generation works');
      console.log('URL:', signedUrl.signedUrl.substring(0, 50) + '...');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

testConnection();
