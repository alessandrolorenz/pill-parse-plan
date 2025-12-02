import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import analyzeHandler from './api/openai/analyze-prescription.js';
import statusHandler from './api/openai/status.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração Web Push (VAPID)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas. Envio de push desabilitado.');
}

// Supabase client com service role para backend
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados. Integração com Supabase desabilitada.');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function getUserIdFromRequest(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token || !supabase) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      console.warn('Erro ao obter usuário a partir do token', error);
      return null;
    }
    return data.user.id;
  } catch (error) {
    console.error('Erro em getUserIdFromRequest', error);
    return null;
  }
}

// API Routes - OpenAI
app.post('/api/openai/analyze-prescription', analyzeHandler);
app.get('/api/openai/status', statusHandler);

// Push subscription - registra/upserta a subscription no Supabase
app.post('/api/push/subscribe', async (req, res, next) => {
  try {
    const { subscription, deviceInfo } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }

    if (!supabase) {
      console.warn('Supabase não configurado; ignorando persistência de subscription');
      return res.json({ success: true, skipped: true });
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh;
    const auth = keys?.auth;

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: deviceInfo?.userAgent || null,
          is_active: true,
          last_used_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('Erro ao salvar push_subscription', error);
      return res.status(500).json({ error: 'Erro ao salvar subscription' });
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Agendar notificações - cria lembretes no Supabase
app.post('/api/notifications/schedule', async (req, res, next) => {
  try {
    const { treatmentId, events } = req.body;

    if (!treatmentId || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Payload inválido' });
    }

    if (!supabase) {
      console.warn('Supabase não configurado; ignorando agendamento de notificações');
      return res.json({ success: true, skipped: true });
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const rows = events.map((event) => ({
      user_id: userId,
      treatment_id: treatmentId,
      event_id: event.id || null,
      scheduled_at: event.startISO,
      status: 'pending',
      payload: {
        type: 'medication_reminder',
        title: event.title,
        body: event.description || 'Hora do medicamento!',
        treatmentId,
        eventId: event.id || null
      }
    }));

    const { error } = await supabase
      .from('notification_reminders')
      .insert(rows);

    if (error) {
      console.error('Erro ao salvar notification_reminders', error);
      return res.status(500).json({ error: 'Erro ao agendar notificações' });
    }

    return res.json({ success: true, created: rows.length });
  } catch (error) {
    next(error);
  }
});

// Cron simples para enviar notificações devidas
app.post('/internal/cron/send-due-notifications', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const now = new Date().toISOString();

    const { data: reminders, error } = await supabase
      .from('notification_reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(100);

    if (error) {
      console.error('Erro ao buscar reminders pendentes', error);
      return res.status(500).json({ error: 'Erro ao buscar reminders' });
    }

    let sent = 0;

    for (const reminder of reminders || []) {
      const { data: subs, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', reminder.user_id)
        .eq('is_active', true);

      if (subError) {
        console.error('Erro ao buscar subscriptions', subError);
        continue;
      }

      const payload = JSON.stringify({
        reminderId: reminder.id,
        treatmentId: reminder.treatment_id,
        eventId: reminder.event_id,
        ...(reminder.payload || {})
      });

      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            payload
          );
          sent++;
        } catch (pushError) {
          console.error('Erro ao enviar push para endpoint', sub.endpoint, pushError);
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }
        }
      }

      await supabase
        .from('notification_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reminder.id);
    }

    return res.json({ success: true, processed: reminders?.length || 0, sent });
  } catch (error) {
    next(error);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint não encontrado',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📋 OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});