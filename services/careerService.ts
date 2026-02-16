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

    // 2. Siapkan Workbook
    const workbook = new ExcelJS.Workbook();
    const wsImport = workbook.addWorksheet('Career_Import');
    const wsLoc = workbook.addWorksheet('Ref_Locations');
    const wsNamedRanges = workbook.addWorksheet('Ref_Data_Lists');

    // 3. Isi Data Referensi Lokasi & Buat Mapping Sanitasi untuk Named Range
    // Kita gunakan ID urutan (LOC_0, LOC_1, dst) sebagai nama range agar aman dari karakter khusus
    wsLoc.addRow(['ID', 'Nama Lokasi', 'Range_Name']);
    locations.forEach((loc, idx) => {
      wsLoc.addRow([loc.id, loc.name, `LOC_RANGE_${idx}`]);
    });

    // 4. Bangun Daftar Jadwal per Lokasi di Sheet Tersembunyi
    // Setiap kolom di wsNamedRanges akan mewakili satu lokasi
    locations.forEach((loc, locIdx) => {
      const filteredSchedules = schedules.filter(s => 
        s.location_ids && s.location_ids.includes(loc.id)
      );
      
      const colLetter = wsNamedRanges.getColumn(locIdx + 1).letter;
      const rangeName = `LOC_RANGE_${locIdx}`;
      
      if (filteredSchedules.length > 0) {
        filteredSchedules.forEach((sch, schIdx) => {
          wsNamedRanges.getCell(`${colLetter}${schIdx + 1}`).value = sch.name;
        });
        
        // Daftarkan Named Range ke Workbook
        const lastRow = filteredSchedules.length;
        workbook.addDefinedName({
          name: rangeName,
          ranges: [`Ref_Data_Lists!$${colLetter}$1:$${colLetter}$${lastRow}`]
        });
      } else {
        // Jika tidak ada jadwal, beri placeholder agar tidak error
        wsNamedRanges.getCell(`${colLetter}1`).value = "(Tidak Ada Jadwal)";
        workbook.addDefinedName({
          name: rangeName,
          ranges: [`Ref_Data_Lists!$${colLetter}$1:$${colLetter}$1`]
        });
      }
    });

    // 5. Siapkan Sheet Utama (Career_Import)
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

    // Styling Header
    const headerRow = wsImport.getRow(3);
    headerRow.font = { bold: true };

    // 6. Masukkan Data Akun (Kosongkan kolom input baru)
    accounts.forEach(acc => {
      wsImport.addRow([
        acc.id,             // A
        acc.internal_nik,   // B
        acc.full_name,      // C
        '',                 // D
        '',                 // E
        '',                 // F: Lokasi
        '',                 // G: Jadwal
        '',                 // H: Tanggal
        '',                 // I
        ''                  // J
      ]);
    });

    // 7. Terapkan Validasi Data (Dropdown Cascading)
    const maxRow = wsImport.rowCount + 500;
    
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
      
      /**
       * Dropdown Jadwal Baru (*) - Kolom G (CASCADING)
       * Menggunakan INDIRECT + VLOOKUP:
       * 1. Cari nama lokasi di F[i]
       * 2. Ambil "Range_Name" dari tabel di Ref_Locations kolom C
       * 3. Jadikan "Range_Name" tersebut sebagai sumber list via INDIRECT
       */
      wsImport.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`=INDIRECT(VLOOKUP(F${i},Ref_Locations!$B$2:$C$${locations.length + 1},2,FALSE))`],
        showErrorMessage: true,
        errorTitle: 'Lokasi Belum Dipilih',
        error: 'Pilih Lokasi Baru terlebih dahulu sebelum memilih Jadwal.'
      };

      // Validasi Tanggal Efektif (*) - Kolom H
      const cellH = wsImport.getCell(`H${i}`);
      cellH.dataValidation = {
        type: 'date',
        operator: 'greaterThan',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [new Date(1900, 0, 1)],
        errorTitle: 'Format Tanggal Salah',
        error: 'Harap masukkan tanggal yang valid dengan format YYYY-MM-DD.'
      };
      cellH.numFmt = 'yyyy-mm-dd';
    }

    // Lebar Kolom
    wsImport.columns.forEach((col, idx) => {
      if (idx === 0) col.width = 20;
      else if (idx === 1) col.width = 15;
      else if (idx === 2) col.width = 25;
      else col.width = 22;
    });

    // 8. Unduh File
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
          
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 2 });

          const [locations, schedules] = await Promise.all([
            locationService.getAll(),
            scheduleService.getAll()
          ]);

          const results = jsonData.map((row: any) => {
            const loc = locations.find(l => l.name === row['Lokasi Baru (*)']);
            const sch = schedules.find(s => s.name === row['Jadwal Baru (*)']);
            
            let effectiveDate = row['Tanggal Efektif (YYYY-MM-DD) (*)'];
            if (typeof effectiveDate === 'number') {
              const date = new Date((effectiveDate - 25569) * 86400 * 1000);
              effectiveDate = date.toISOString().split('T')[0];
            }

            return {
              account_id: row['Account ID (Hidden)'],
              full_name: row['Nama Karyawan'],
              internal_nik: row['NIK Internal'],
              position: row['Jabatan Baru (*)'],
              grade: row['Grade Baru (*)'],
              location_id: loc?.id || null,
              location_name: row['Lokasi Baru (*)'],
              schedule_id: sch?.id || null,
              change_date: effectiveDate,
              notes: row['Keterangan'] || null,
              file_sk_link: row['Link SK Google Drive (Opsional)'] || null,
              isValid: !!(row['Account ID (Hidden)'] && row['Jabatan Baru (*)'] && row['Lokasi Baru (*)'] && effectiveDate)
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