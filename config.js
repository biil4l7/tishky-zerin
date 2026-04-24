const SUPABASE_URL      = 'https://ycrmtdeucucwepjnkkxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljcm10ZGV1Y3Vjd2Vwam5ra3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTg4NTYsImV4cCI6MjA5MDQ5NDg1Nn0.126gM2i77z9D4IV62RNOSeMDsLt8MlPy4zspN1tKcDo';


var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});