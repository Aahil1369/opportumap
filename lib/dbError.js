// Map a Supabase/PostgREST error to an HTTP status for our API routes.
export function dbErrorStatus(error) {
  switch (error?.code) {
    case '42501': return 403; // RLS policy or column grant refused the write
    case '23503': return 404; // foreign key: the startup or user does not exist
    case '23514': // check constraint (length / URL format)
    case '22001': // value too long
    case '22P02': // invalid input syntax (e.g. not a uuid / number)
      return 400;
    default: return 500;
  }
}
