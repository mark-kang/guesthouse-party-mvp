require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanup() {
  console.log('Cleaning up users...');

  // To delete all, we can just find users with not null id (or use a filter that matches all)
  const { data, error } = await supabase.from('users').delete().neq('nickname', '제주보이');

  if (error) {
    console.error('Error deleting users:', error);
  } else {
    console.log('Successfully deleted all users and cascaded data.', data);
  }
}

cleanup();
