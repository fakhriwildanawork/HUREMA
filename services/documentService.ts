import { supabase } from '../lib/supabase';
import { DigitalDocument, DocumentInput } from '../types';

export const documentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_access(account_id)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(doc => ({
      ...doc,
      allowed_account_ids: doc.document_access.map((da: any) => da.account_id)
    })) as DigitalDocument[];
  },

  async getUniqueDocTypes() {
    const { data, error } = await supabase
      .from('documents')
      .select('doc_type');
    
    if (error) throw error;
    const types = data.map(d => d.doc_type).filter(Boolean);
    return Array.from(new Set(types)).sort();
  },

  async create(input: DocumentInput) {
    const { allowed_account_ids, ...docData } = input;
    
    // 1. Insert Master Document
    const { data: doc, error: dError } = await supabase
      .from('documents')
      .insert([docData])
      .select()
      .single();
    
    if (dError) throw dError;

    // 2. Insert Access Rules
    if (allowed_account_ids && allowed_account_ids.length > 0) {
      const accessToInsert = allowed_account_ids.map(aid => ({
        document_id: doc.id,
        account_id: aid
      }));
      const { error: aError } = await supabase
        .from('document_access')
        .insert(accessToInsert);
      
      if (aError) throw aError;
    }

    return doc as DigitalDocument;
  },

  async update(id: string, input: Partial<DocumentInput>) {
    const { allowed_account_ids, ...docData } = input;

    // 1. Update Master
    const { data: doc, error: dError } = await supabase
      .from('documents')
      .update(docData)
      .eq('id', id)
      .select()
      .single();
    
    if (dError) throw dError;

    // 2. Update Access (Delete and Re-insert)
    if (allowed_account_ids) {
      await supabase.from('document_access').delete().eq('document_id', id);
      if (allowed_account_ids.length > 0) {
        const accessToInsert = allowed_account_ids.map(aid => ({
          document_id: id,
          account_id: aid
        }));
        await supabase.from('document_access').insert(accessToInsert);
      }
    }

    return doc as DigitalDocument;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};