
import { supabase } from '../lib/supabase';
import { WarningLog, WarningLogExtended, TerminationLog, TerminationLogExtended, WarningLogInput, TerminationLogInput } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { accountService } from './accountService';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const disciplineService = {
  // --- Warning Logs ---
  async getWarningsGlobal() {
    const { data, error } = await supabase
      .from('account_warning_logs')
      .select('*, account:accounts(full_name, internal_nik)')
      .order('issue_date', { ascending: false });
    if (error) throw error;
    return data as WarningLogExtended[];
  },

  async getWarningsByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_warning_logs')
      .select('*')
      .eq('account_id', accountId)
      .order('issue_date', { ascending: false });
    if (error) throw error;
    return data as WarningLog[];
  },

  async createWarning(input: WarningLogInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_warning_logs')
      .insert([sanitized])
      .select();
    if (error) throw error;
    return data[0] as WarningLog;
  },

  async deleteWarning(id: string) {
    const { error } = await supabase.from('account_warning_logs').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // --- Termination Logs ---
  async getTerminationsGlobal() {
    const { data, error } = await supabase
      .from('account_termination_logs')
      .select('*, account:accounts(full_name, internal_nik)')
      .order('termination_date', { ascending: false });
    if (error) throw error;
    return data as TerminationLogExtended[];
  },

  async getTerminationByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_termination_logs')
      .select('*')
      .eq('account_id', accountId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as TerminationLog;
  },

  async createTermination(input: TerminationLogInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_termination_logs')
      .insert([sanitized])
      .select();
    if (error) throw error;

    // Otomatis update end_date di profile account
    await accountService.update(input.account_id, {
      end_date: input.termination_date
    });

    return data[0] as TerminationLog;
  },

  async deleteTermination(id: string, accountId: string) {
    const { error } = await supabase.from('account_termination_logs').delete().eq('id', id);
    if (error) throw error;

    // Reset end_date jika log dihapus
    await accountService.update(accountId, { end_date: null });
    return true;
  },

  // --- Excel Template & Import ---
  async downloadTemplate() {
    const accounts = await accountService.getAll();
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Discipline_Import');

    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Tipe (Peringatan / Pemberhentian) (*)', 
      'Jenis Detail (*)', 
      'Tanggal (YYYY-MM-DD) (*)', 
      'Alasan (*)',
      'Nominal (Pesangon/Penalti)',
      'Link G-Drive Surat (Opsional)'
    ];
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };

    accounts.forEach(acc => {
      ws.addRow([acc.id, acc.internal_nik, acc.full_name, '', '', '', '', '', '']);
    });

    const maxRow = ws.rowCount + 500;
    for (let i = 2; i <= maxRow; i++) {
      // Dropdown Tipe
      ws.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Peringatan,Pemberhentian"']
      };
      
      // Dropdown Jenis Detail
      ws.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Teguran,SP1,SP2,SP3,Pemecatan,Resign"']
      };

      const dateCell = ws.getCell(`F${i}`);
      dateCell.dataValidation = {
        type: 'date',
        operator: 'greaterThan',
        allowBlank: true,
        formulae: [new Date(1900, 0, 1)]
      };
      dateCell.numFmt = 'yyyy-mm-dd';
    }

    ws.columns.forEach((col, idx) => {
      col.width = [20, 15, 25, 25, 20, 22, 30, 20, 25][idx];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `HUREMA_Discipline_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processImport(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

          const results = jsonData.map((row: any) => {
            const parseDate = (val: any) => {
              if (typeof val === 'number') {
                const date = new Date((val - 25569) * 86400 * 1000);
                return date.toISOString().split('T')[0];
              }
              return val;
            };

            const date = parseDate(row['Tanggal (YYYY-MM-DD) (*)']);
            const typeMain = row['Tipe (Peringatan / Pemberhentian) (*)'];
            const typeDetail = row['Jenis Detail (*)'];

            return {
              account_id: row['Account ID (Hidden)'],
              full_name: row['Nama Karyawan'],
              type_main: typeMain,
              type_detail: typeDetail,
              date: date,
              reason: row['Alasan (*)'],
              amount: row['Nominal (Pesangon/Penalti)'] || 0,
              file_link: row['Link G-Drive Surat (Opsional)'] || null,
              isValid: !!(row['Account ID (Hidden)'] && typeMain && typeDetail && date && row['Alasan (*)'])
            };
          });
          resolve(results);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  async commitImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    for (const item of validData) {
      const driveId = item.file_link ? item.file_link.match(/[-\w]{25,}/)?.[0] : null;
      
      if (item.type_main === 'Peringatan') {
        await this.createWarning({
          account_id: item.account_id,
          warning_type: item.type_detail,
          reason: item.reason,
          issue_date: item.date,
          file_id: driveId
        });
      } else {
        await this.createTermination({
          account_id: item.account_id,
          termination_type: item.type_detail,
          termination_date: item.date,
          reason: item.reason,
          severance_amount: item.type_detail === 'Pemecatan' ? item.amount : null,
          penalty_amount: item.type_detail === 'Resign' ? item.amount : null,
          file_id: driveId
        });
      }
    }
    return true;
  }
};
