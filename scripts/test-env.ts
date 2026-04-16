import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set');
console.log('Anon Key Present:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'yes' : 'not set');
console.log('Service Role Key Present:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'yes' : 'not set'); 