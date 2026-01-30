
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLedger() {
    console.log('Fetching 1 row from view_sales_ledger...');

    const { data, error } = await supabase
        .from('view_sales_ledger')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching ledger:', error);
    } else {
        if (data.length > 0) {
            console.log('Row 1:', data[0]);
        } else {
            console.log('No data found in view_sales_ledger.');
        }
    }
}

checkLedger();
