// src/services/knowledgeService.js
const { createClient } = require('@supabase/supabase-js');

// 1. Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("⚠️ Supabase keys missing! Memory will be temporary.");
}

class KnowledgeService {
  /**
   * Add a fact to the database
   */
  async addFact(text) {
    if (!supabase) return false;

    try {
      // We insert into a table named 'facts'
      const { error } = await supabase
        .from('facts')
        .insert([{ text: text }]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving fact:", error.message);
      return false;
    }
  }

  /**
   * Fetch all facts to feed the AI
   */
  async getKnowledgeBase() {
    if (!supabase) return "";

    try {
      // Get all facts, newest first
      const { data, error } = await supabase
        .from('facts')
        .select('text')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) return "";

      // Turn list into a string: "- Fact 1\n- Fact 2"
      return data.map(row => `- ${row.text}`).join("\n");
    } catch (error) {
      console.error("Error fetching facts:", error.message);
      return "";
    }
  }
}

module.exports = new KnowledgeService();