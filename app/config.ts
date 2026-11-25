export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const hasConfig = !!url?.startsWith('https://') && !!key?.startsWith('sb_publishable_');
export const noteDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
