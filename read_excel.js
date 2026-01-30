
import * as XLSX from 'xlsx';
import * as fs from 'fs';

try {
    const buf = fs.readFileSync('OrderRegistry.xlsx');
    const wb = XLSX.read(buf);
    console.log('Sheets:', wb.SheetNames);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
    console.log('First 5 rows:', JSON.stringify(jsonData.slice(0, 5), null, 2));
} catch (e) {
    console.error(e);
}
