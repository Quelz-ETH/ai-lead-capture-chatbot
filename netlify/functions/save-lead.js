import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Resend for emails (optional)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  // GET request - return stats for admin dashboard
  if (event.httpMethod === 'GET') {
    const action = event.queryStringParameters?.action;
    
    if (action === 'stats') {
      try {
        // Get total leads
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });

        // Get total sessions (unique session IDs)
        const { data: sessions } = await supabase
          .from('leads')
          .select('session_id');
        const totalSessions = new Set(sessions?.map(s => s.session_id)).size || totalLeads || 0;

        // Get today's leads
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Get recent leads (last 20)
        const { data: recentLeads } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            totalLeads: totalLeads || 0,
            totalSessions: totalSessions,
            todayLeads: todayLeads || 0,
            recentLeads: recentLeads || [],
          }),
        };

      } catch (error) {
        console.error('Stats error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to fetch stats' }),
        };
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid action' }),
    };
  }

  // POST request - save new lead
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { name, email, phone, sessionId, messageCount, conversationSummary } = JSON.parse(event.body);

    // Validate required fields
    if (!name || !email || !phone) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Name, email, and phone are required' }),
      };
    }

    // Save lead to Supabase
    const { data: lead, error: dbError } = await supabase
      .from('leads')
      .insert([
        {
          name,
          email,
          phone,
          session_id: sessionId,
          message_count: messageCount,
          conversation_summary: conversationSummary,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save lead');
    }

    console.log(`[Lead Captured] ${name} - ${email} - Session: ${sessionId}`);

    // Send thank you email using context.waitUntil (non-blocking)
    if (resend && context.waitUntil) {
      context.waitUntil(sendThankYouEmail(name, email));
    } else if (resend) {
      // Fallback: send without waitUntil
      sendThankYouEmail(name, email).catch(console.error);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        leadId: lead.id,
      }),
    };

  } catch (error) {
    console.error('Save lead error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to save lead' }),
    };
  }
}

// Send thank you email via Resend
async function sendThankYouEmail(name, email) {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      to: email,
      subject: 'Thanks for reaching out!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E63946;">Thanks for connecting, ${name}!</h2>
          <p>We received your message and one of our team members will be in touch with you shortly.</p>
          <p>In the meantime, feel free to reply to this email if you have any questions.</p>
          <br>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
    });
    console.log(`[Email] Thank you email sent to ${email}`);
  } catch (error) {
    console.error('Email error:', error);
  }
}
