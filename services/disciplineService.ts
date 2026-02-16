
import { supabase } from '../lib/supabase';
import { WarningLog, WarningLogExtended, WarningLogInput, TerminationLog, TerminationLogExtended, TerminationLogInput } from '../types';
import { accountService } from './accountService';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  // --- Warnings ---
  async getWarningsAll() {
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

  // --- Terminations ---
  async getTerminationsAll() {
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
      .maybeSingle();
    if (error) throw error;
    return data as TerminationLog | null;
  },

  async createTermination(input: TerminationLogInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_termination_logs')
      .insert([sanitized])
      .select();
    if (error) throw error;

    // Otomatis update end_date di profile akun
    await accountService.update(input.account_id, {
      end_date: input.termination_date
    });

    return data[0] as TerminationLog;
  },

  async deleteTermination(id: string, accountId: string) {
    const { error } = await supabase.from('account_termination_logs').delete().eq('id', id);
    if (error) throw error;

    // Aktifkan kembali akun dengan me-nullkan end_date
    await accountService.update(accountId, {
      end_date: null
    });
    return true;
  },

  // --- Import / Export ---
  async downloadWarningTemplate() {
    const accounts = await accountService.getAll();
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Warning_Import');
    
    ws.addRow(['Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 'Jenis Peringatan (*)', 'Alasan (*)', 'Tanggal (YYYY-MM-DD) (*)', 'Link Surat G-Drive']);
    ws.getRow(1).font = { bold: true };

    accounts.forEach(acc => {
      ws.addRow([acc.id, acc.internal_nik, acc.full_name, '', '', '', '']);
    });

    const types = ['Teguran', 'SP1', 'SP2', 'SP3'];
    for (let i = 2; i <= ws.rowCount + 500; i++) {
      ws.getCell(`D${i}`).dataValidation = { type: 'list', formulae: [`"${types.join(',')}"`] };
      const dateCell = ws.getCell(`F${i}`);
      dateCell.dataValidation = { type: 'date', operator: 'greaterThan', formulae: [new Date(1900, 0, 1)] };
      dateCell.numFmt = 'yyyy-mm-dd';
    }

    ws.columns.forEach((col, idx) => { col.width = [20, 15, 25, 20, 30, 22, 30][idx]; });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `HUREMA_Warning_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processWarningImport(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          const results = jsonData.map((row: any) => {
            const parseDate = (val: any) => {
              if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000).toISOString().split('T')[0];
              return val;
            };
            const issueDate = parseDate(row['Tanggal (YYYY-MM-DD) (*)']);
            return {
              account_id: row['Account ID (Hidden)'],
              full_name: row['Nama Karyawan'],
              warning_type: row['Jenis Peringatan (*)'],
              reason: row['Alasan (*)'],
              issue_date: issueDate,
              file_link: row['Link Surat G-Drive'],
              isValid: !!(row['Account ID (Hidden)'] && row['Jenis Peringatan (*)'] && issueDate)
            };
          });
          resolve(results);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  async commitWarningImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    for (const item of validData) {
      const driveId = item.file_link ? item.file_link.match(/[-\w]{25,}/)?.[0] : null;
      await this.createWarning({
        account_id: item.account_id,
        warning_type: item.warning_type,
        reason: item.reason,
        issue_date: item.issue_date,
        file_id: driveId || null
      });
    }
  }
};
