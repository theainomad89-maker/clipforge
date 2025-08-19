import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  try {
    console.log('🔍 Testing File Upload Process...');
    
    // 1. Create a test project
    const projectId = 'test-' + Date.now();
    const fileKey = `userless/${projectId}/test.mp4`;
    
    console.log('📁 Creating test project:', projectId);
    
    // 2. Generate signed upload URL
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl(fileKey, 60);
    
    if (signedUrlError) {
      console.log('❌ Signed URL error:', signedUrlError.message);
      return;
    }
    
    console.log('✅ Signed URL generated');
    console.log('URL:', signedUrl.signedUrl.substring(0, 80) + '...');
    
    // 3. Create a test file (small text file to simulate video)
    const testContent = 'This is a test file for upload testing';
    const testFile = Buffer.from(testContent);
    
    console.log('📤 Attempting upload...');
    
    // 4. Try the upload with different header combinations
    const uploadAttempts = [
      {
        name: 'Basic PUT',
        headers: { 'content-type': 'text/plain' }
      },
      {
        name: 'With upsert',
        headers: { 'x-upsert': 'true', 'content-type': 'text/plain' }
      },
      {
        name: 'With cache control',
        headers: { 'x-upsert': 'true', 'content-type': 'text/plain', 'cache-control': 'no-cache' }
      }
    ];
    
    for (const attempt of uploadAttempts) {
      console.log(`\n🔄 Trying: ${attempt.name}`);
      
      try {
        const putRes = await fetch(signedUrl.signedUrl, {
          method: 'PUT',
          headers: attempt.headers,
          body: testFile
        });
        
        if (putRes.ok) {
          console.log(`✅ ${attempt.name} SUCCESS! Status: ${putRes.status}`);
          
          // Verify the file was uploaded
          const { data: uploadedFile, error: listError } = await supabase.storage
            .from('videos')
            .list(`userless/${projectId}`);
          
          if (!listError && uploadedFile && uploadedFile.length > 0) {
            console.log('✅ File verified in storage:', uploadedFile[0].name);
          }
          
          break;
        } else {
          const errorText = await putRes.text();
          console.log(`❌ ${attempt.name} FAILED! Status: ${putRes.status}`);
          console.log('Error:', errorText);
        }
      } catch (error) {
        console.log(`💥 ${attempt.name} ERROR:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

testUpload();
