// supabase-client.js

const SUPABASE_URL = 'https://rcbdfnvekhilcctdmvtg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjYmRmbnZla2hpbGNjdGRtdnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2OTUxMTIsImV4cCI6MjA3NjI3MTExMn0.aQq04tEqFNwBi9h1xdbbyff17zInmWXjBjJ6h8mAE-A';

// Initialize Supabase and make it globally available
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);