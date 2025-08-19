import { supabaseAdmin } from './supabase';

// Retry function for Supabase operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
      const result = await operation();
      console.log(`✅ Success on attempt ${attempt}`);
      return result;
    } catch (error: any) {
      console.log(`❌ Attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = delayMs * attempt; // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Supabase-specific retry operations
export const supabaseRetry = {
  // Create signed upload URL with retry
  async createSignedUploadUrl(bucket: string, path: string, expiresIn: number) {
    return withRetry(async () => {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUploadUrl(path, expiresIn);
      
      if (error) throw new Error(error.message);
      if (!data) throw new Error('No upload URL returned');
      
      return data;
    });
  },

  // Insert with retry
  async insert(table: string, values: any) {
    return withRetry(async () => {
      const { data, error } = await supabaseAdmin
        .from(table)
        .insert(values)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    });
  },

  // Select with retry
  async select(table: string, query: string = '*') {
    return withRetry(async () => {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select(query);
      
      if (error) throw new Error(error.message);
      return data;
    });
  }
};
