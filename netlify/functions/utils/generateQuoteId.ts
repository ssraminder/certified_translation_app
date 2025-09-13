import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate the next sequential quote ID with a CS prefix.
 * Example: CS00001, CS00002, ...
 */
export async function generateQuoteId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('Quotes')
    .select('quoteId')
    .order('quoteId', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const lastId = data?.quoteId as string | undefined;
  const numeric = lastId ? parseInt(lastId.replace(/^CS/, ''), 10) : 0;
  const next = numeric + 1;
  return `CS${next.toString().padStart(5, '0')}`;
}
