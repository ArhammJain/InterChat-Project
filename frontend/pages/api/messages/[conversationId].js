// pages/api/messages/[conversationId].js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getUserFromRequest } from '../../../lib/auth';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { conversationId } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'db error' });
    }

    return res.json({ messages: data || [] });
  }

  if (req.method === 'POST') {
    const { content, type = 'text' } = req.body;

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        type,
      })
      .select('*')
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'db error' });
    }

    return res.json({ message: data });
  }

  return res.status(405).end();
}
