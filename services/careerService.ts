import { supabase } from '../lib/supabase';
import { CareerLogExtended } from '../types';
import * as XLSX from 'xlsx';
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

    // 2. Siapkan Sheet Utama (Career_Import) dengan Instruksi
    const instructionRow = ["INSTRUKSI: Hapus baris data akun/user yang tidak ingin diubah. Baris dengan (*) wajib diisi."];
    const emptyRow = [""];
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

    const importRows = accounts.map(acc => [
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

    const aoaData = [instructionRow, emptyRow, headers, ...importRows];
    const wsImport = XLSX.utils.aoa_to_sheet(aoaData);

    // 3. Tambahkan Data Validation (Dropdown) - Range baris 4 sampai 500
    // SheetJS Pro mendukung format ini, untuk versi open source kita set range referensi
    const totalRows = aoaData.length + 50; 
    
    // Properti !dataValidation (Hanya bekerja jika didukung oleh parser Excel pembaca)
    (wsImport as any)['!dataValidation'] = [
      {
        range: `F4:F${totalRows}`, // Kolom Lokasi Baru (*)
        type: 'list',
        allowBlank: true,
        formula1: 'Ref_Locations!$B$2:$B$200'
      },
      {
        range: `G4:G${totalRows}`, // Kolom Jadwal Baru (*)
        type: 'list',
        allowBlank: true,
        formula1: 'Ref_Schedules!$B$2:$B$200'
      }
    ];

    // 4. Siapkan Sheet Referensi
    const wsLoc = XLSX.utils.json_to_sheet(locations.map(l => ({ ID: l.id, Nama: l.name })));
    const wsSch = XLSX.utils.json_to_sheet(schedules.map(s => ({ ID: s.id, Nama: s.name })));

    // 5. Buat Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsImport, 'Career_Import');
    XLSX.utils.book_append_sheet(wb, wsLoc, 'Ref_Locations');
    XLSX.utils.book_append_sheet(wb, wsSch, 'Ref_Schedules');

    // 6. Generate Excel File
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `HUREMA_Career_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
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