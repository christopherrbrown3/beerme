import { createClient } from '@supabase/supabase-js';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export async function deleteLocalTestUsers(usernames: string[]) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || process.env.E2E_LOCAL_SUPABASE !== 'true') {
    throw new Error('Local Supabase cleanup is not configured.');
  }

  const parsedUrl = new URL(supabaseUrl);
  if (!LOOPBACK_HOSTS.has(parsedUrl.hostname)) {
    throw new Error('Refusing to clean up users outside a loopback Supabase instance.');
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const targets = data.users.filter((user) => {
    const username = user.user_metadata?.username;
    return typeof username === 'string' && usernames.includes(username);
  });

  for (const user of targets) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
  }
}
