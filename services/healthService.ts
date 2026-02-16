
import { supabase } from '../lib/supabase';
import { HealthLogExtended } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { accountService } from './accountService';

export const healthService = {
  async getAllGlobal() {
    const { data, error } = await supabase
      .from('account_health_logs')
      .select(`
        *,
        account:accounts(full_name, internal_nik)
      `)
      .order('change_date', { ascending: false });
    
    if (error) throw error;
    return data as HealthLogExtended[];
  },

  async downloadTemplate() {
    // 1. Ambil data karyawan aktif
    const accounts = await accountService.getAll();

    // 2. Gunakan ExcelJS untuk fitur Date Validation & Dropdown
    const workbook = new ExcelJS.Workbook();
    const wsImport = workbook.addWorksheet('Health_Import');
    
    const instructionText = "Harap isi data kesehatan terbaru karyawan. Baris dengan (*) wajib diisi.";
    wsImport.addRow([instructionText]); // Baris 1
    wsImport.addRow(['']); // Baris 2
    
    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Status MCU (*)', 
      'Risiko Kesehatan (*)', 
      'Tanggal Pemeriksaan (YYYY-MM-DD) (*)', 
      'Catatan / Keterangan', 
      'Link Hasil MCU G-Drive (Opsional)'
    ];
    wsImport.addRow(headers); // Baris 3

    // Styling Header
    const headerRow = wsImport.getRow(3);
    headerRow.font = { bold: true };

    // 3. Masukkan Data Akun
    accounts.forEach(acc => {
      wsImport.addRow([
        acc.id,             // A
        acc.internal_nik,   // B
        acc.full_name,      // C
        '',                 // D: Status MCU (*)
        '',                 // E: Risiko Kesehatan (*)
        '',                 // F: Tanggal (*)
        '',                 // G
        ''                  // H
      ]);
    });

    // 4. Terapkan Validasi Data
    const maxRow = wsImport.rowCount + 500;
    
    for (let i = 4; i <= maxRow; i++) {
      // Validasi Tanggal - Kolom F
      const cellF = wsImport.getCell(`F${i}`);
      cellF.dataValidation = {
        type: 'date',
        operator: 'greaterThan',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [new Date(1900, 0, 1)],
        errorTitle: 'Format Tanggal Salah',
        error: 'Harap masukkan tanggal yang valid dengan format YYYY-MM-DD.'
      };
      cellF.numFmt = 'yyyy-mm-dd';
    }

    // Lebar Kolom
    wsImport.columns.forEach((col, idx) => {
      if (idx === 0) col.width = 20;
      else if (idx === 1) col.width = 15;
      else if (idx === 2) col.width = 25;
      else col.width = 22;
    });

    // 5. Unduh File
    const buffer = await workbook.xlsx.writeBuffer();
    const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `HUREMA_Health_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processImport(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Header dimulai dari baris ke-3
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 2 });

          const results = jsonData.map((row: any) => {
            // Konversi tanggal dari format Excel jika perlu
            let effectiveDate = row['Tanggal Pemeriksaan (YYYY-MM-DD) (*)'];
            if (typeof effectiveDate === 'number') {
              const date = new Date((effectiveDate - 25569) * 86400 * 1000);
              effectiveDate = date.toISOString().split('T')[0];
            }

            return {
              account_id: row['Account ID (Hidden)'],
              full_name: row['Nama Karyawan'],
              internal_nik: row['NIK Internal'],
              mcu_status: row['Status MCU (*)'],
              health_risk: row['Risiko Kesehatan (*)'],
              change_date: effectiveDate,
              notes: row['Catatan / Keterangan'] || null,
              file_mcu_link: row['Link Hasil MCU G-Drive (Opsional)'] || null,
              isValid: !!(row['Account ID (Hidden)'] && row['Status MCU (*)'] && row['Risiko Kesehatan (*)'] && effectiveDate)
            };
          });

          resolve(results);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  async commitImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    const results = [];
    
    for (const item of validData) {
      const log = await accountService.createHealthLog({
        account_id: item.account_id,
        mcu_status: item.mcu_status,
        health_risk: item.health_risk,
        notes: item.notes,
        change_date: item.change_date,
        file_mcu_id: this.extractDriveId(item.file_mcu_link)
      });
      results.push(log);
    }
    
    return results;
  },

  extractDriveId(link: string | null): string | null {
    if (!link) return null;
    const match = link.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  }
};
