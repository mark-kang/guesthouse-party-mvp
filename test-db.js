require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('Testing Supabase Connection via Data API...');
  
  const { data: users, error: userError } = await supabase.from('users').select('*').limit(1);
  if (userError) {
    console.error('Users table error:', userError.message);
  } else {
    console.log('Users table exists! Data:', users);
  }

  const { data: interactions, error: interError } = await supabase.from('interactions').select('*').limit(1);
  if (interError) {
    console.error('Interactions table error:', interError.message);
  } else {
    console.log('Interactions table exists! Data:', interactions);
  }
}

testConnection();
