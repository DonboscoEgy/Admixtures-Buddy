
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parser
const envContent = fs.readFileSync('.env', 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
// Hide key in logs usually, but for debug:
// console.log('Key:', supabaseKey); 

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    console.log('Checking profiles table...');

    // 1. Check strict count
    const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error getting count:', countError);
    } else {
        console.log('Total Profiles Count:', count);
    }

    // 2. Fetch Data
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');

    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Fetched Profiles Data:', data);
    }
}

checkProfiles();
