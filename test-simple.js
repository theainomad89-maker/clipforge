import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimple() {
  try {
    console.log('🔍 Simple Supabase Test...');
    
    // Test basic storage access
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Buckets error:', bucketsError.message);
    } else {
      console.log('✅ Buckets accessible:', buckets.map(b => b.name));
    }
    
    // Test videos bucket specifically
    const { data: videos, error: videosError } = await supabase.storage
      .from('videos')
      .list('', { limit: 5 });
    
    if (videosError) {
      console.log('❌ Videos bucket error:', videosError.message);
    } else {
      console.log('✅ Videos bucket accessible, items:', videos.length);
    }
    
    // Test clips bucket
    const { data: clips, error: clipsError } = await supabase.storage
      .from('clips')
      .list('', { limit: 5 });
    
    if (clipsError) {
      console.log('❌ Clips bucket error:', clipsError.message);
    } else {
      console.log('✅ Clips bucket accessible, items:', clips.length);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testSimple();
