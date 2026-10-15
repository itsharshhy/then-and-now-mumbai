-- Nightly cleanup of rate-limit records. The limits only look back one hour, so anything older than a day is
-- no longer needed. The records are salted IP hashes, never raw addresses.

create extension if not exists pg_cron;

create or replace function bazaar_private.cleanup_submissions() returns integer
language plpgsql security definer set search_path = '' as $fn$
declare
  removed integer;
begin
  delete from bazaar_private.submissions where created_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end
$fn$;
revoke all on function bazaar_private.cleanup_submissions() from public;

-- 03:17 IST every night (21:47 UTC)
select cron.schedule('bazaar-cleanup-submissions', '47 21 * * *', 'select bazaar_private.cleanup_submissions()');
