import { supabase } from '../lib/supabase';
import { CareerLogExtended } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { accountService } from './accountService';
import { locationService } from './locationService';
import { scheduleService } from './scheduleService';

export const careerService = {
  async getAllGlobal() {
    const { data, error } = await supabase
      .from('account_career_logs')
      .select(`
        *,
        account:accounts(full_name, internal_nik)
      `)
      .order('change_date', { ascending: false });
    
    if (error) throw error;
    return data as CareerLogExtended[];
  },

  async downloadTemplate() {
    // 1. Ambil data referensi
    const [accounts, locations, schedules] = await Promise.all([
      accountService.getAll(),
      locationService.getAll(),
      scheduleService.getAll()
    ]);

    // 2. Gunakan ExcelJS untuk fitur Dropdown yang lebih canggih
    const workbook = new ExcelJS.Workbook();
    
    // Sheet Utama (Career_Import)
    const wsImport = workbook.addWorksheet('Career_Import');
    
    // Sheet Referensi (Disembunyikan jika perlu, tapi biarkan ada untuk kemudahan user)
    const wsLoc = workbook.addWorksheet('Ref_Locations');
    const wsSch = workbook.addWorksheet('Ref_Schedules');

    // 3. Isi Data Referensi ke sheet pembantu
    wsLoc.addRow(['ID', 'Nama']);
    locations.forEach(l => wsLoc.addRow([l.id, l.name]));
    
    wsSch.addRow(['ID', 'Nama']);
    schedules.forEach(s => wsSch.addRow([s.id, s.name]));

    // 4. Siapkan Sheet Utama (Career_Import)
    const instructionText = "Hapus baris data akun/user yg tidak ingin diubah. Baris dengan (*) wajib diisi.";
    wsImport.addRow([instructionText]); // Baris 1
    wsImport.addRow(['']); // Baris 2 (Kosong)
    
    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Jabatan Baru (*)', 
      'Grade Baru (*)', 
      'Lokasi Baru (*)', 
      'Jadwal Baru (*)', 
      'Tanggal Efektif (YYYY-MM-DD) (*)', 
      'Keterangan', 
      'Link SK Google Drive (Opsional)'
    ];
    wsImport.addRow(headers); // Baris 3

    // Styling Header agar lebih jelas
    const headerRow = wsImport.getRow(3);
    headerRow.font = { bold: true };

    // 5. Masukkan Data Akun yang sudah ada (untuk diperbarui)
    accounts.forEach(acc => {
      wsImport.addRow([
        acc.id,
        acc.internal_nik,
        acc.full_name,
        acc.position,
        acc.grade,
        (acc as any).location?.name || '',
        acc.schedule_type || '',
        new Date().toISOString().split('T')[0],
        '',
        ''
      ]);
    });

    // 6. Terapkan Data Validation (Dropdown) pada Kolom F (Lokasi) dan G (Jadwal)
    // Berlaku dari baris 4 sampai n + 100 baris tambahan
    const maxRow = wsImport.rowCount + 100;
    
    for (let i = 4; i <= maxRow; i++) {
      // Dropdown Lokasi Baru (*) - Kolom F
      wsImport.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Ref_Locations!$B$2:$B$${locations.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Input Tidak Valid',
        error: 'Pilih lokasi dari daftar yang tersedia.'
      };
      
      // Dropdown Jadwal Baru (*) - Kolom G
      wsImport.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Ref_Schedules!$B$2:$B$${schedules.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Input Tidak Valid',
        error: 'Pilih jadwal dari daftar yang tersedia.'
      };
    }

    // Lebar Kolom agar rapi
    wsImport.columns.forEach((col, idx) => {
      if (idx === 0) col.width = 20; // ID
      else if (idx === 1) col.width = 15; // NIK
      else if (idx === 2) col.width = 25; // Nama
      else col.width = 20;
    });

    // 7. Unduh File
    const buffer = await workbook.xlsx.writeBuffer();
    const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `HUREMA_Career_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processImport(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Header dimulai dari baris ke-3 karena ada instruksi di baris 1 & 2
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 2 });

          // Ambil referensi untuk mapping nama ke ID
          const [locations, schedules] = await Promise.all([
            locationService.getAll(),
            scheduleService.getAll()
          ]);

          const results = jsonData.map((row: any) => {
            const loc = locations.find(l => l.name === row['Lokasi Baru (*)']);
            const sch = schedules.find(s => s.name === row['Jadwal Baru (*)']);
            
            return {
              account_id: row['Account ID (Hidden)'],
              full_name: row['Nama Karyawan'],
              internal_nik: row['NIK Internal'],
              position: row['Jabatan Baru (*)'],
              grade: row['Grade Baru (*)'],
              location_id: loc?.id || null,
              location_name: row['Lokasi Baru (*)'],
              schedule_id: sch?.id || null,
              change_date: row['Tanggal Efektif (YYYY-MM-DD) (*)'],
              notes: row['Keterangan'] || null,
              file_sk_link: row['Link SK Google Drive (Opsional)'] || null,
              isValid: !!(row['Account ID (Hidden)'] && row['Jabatan Baru (*)'] && row['Lokasi Baru (*)'] && row['Tanggal Efektif (YYYY-MM-DD) (*)'])
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
      const log = await accountService.createCareerLog({
        account_id: item.account_id,
        position: item.position,
        grade: item.grade,
        location_id: item.location_id,
        location_name: item.location_name,
        schedule_id: item.schedule_id,
        notes: item.notes,
        change_date: item.change_date,
        file_sk_id: this.extractDriveId(item.file_sk_link)
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