import * as XLSX from 'xlsx';

export const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to Array of Arrays first to find the header row
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

                // Find row index containing specific keywords
                let headerRowIndex = 0;
                for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
                    const rowStr = JSON.stringify(rawRows[i]).toLowerCase();
                    if (rowStr.includes('date') && rowStr.includes('account')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                console.log(`Detected header row at index: ${headerRowIndex}`);

                // Now read again using the detected range
                // XLSX `range` option expects an integer for start row index? No, sheet_to_json `range` handles number.
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    dateNF: 'yyyy-mm-dd',
                    range: headerRowIndex
                });

                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);

        reader.readAsBinaryString(file);
    });
};
