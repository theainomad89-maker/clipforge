import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Testing with ANON key...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', anonKey ? '✅ Present' : '❌ Missing');

const supabase = createClient(supabaseUrl, anonKey);

async function testAnon() {
  try {
    console.log('\n📊 Testing Database Tables with ANON key...');
    
    // Test projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    if (projectsError) {
      console.log('❌ Projects table error:', projectsError.message);
    } else {
      console.log('✅ Projects table accessible with ANON key');
    }

    console.log('\n🗄️ Testing Storage with ANON key...');
    
    // Test videos bucket
    const { data: videos, error: videosError } = await supabase.storage
      .from('videos')
      .list('', { limit: 1 });
    
    if (videosError) {
      console.log('❌ Videos bucket error:', videosError.message);
    } else {
      console.log('✅ Videos bucket accessible with ANON key');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

testAnon();
