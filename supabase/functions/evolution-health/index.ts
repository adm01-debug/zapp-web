// Evolution API Health Check Edge Function
// Monitors WhatsApp connection status, webhook configuration, and API health

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  instance: {
    name: string
    connected: boolean
    state: string
    phoneNumber?: string
    lastSeen?: string
  }
  webhook: {
    configured: boolean
    url?: string
    events?: string[]
  }
  api: {
    reachable: boolean
    latencyMs: number
    version?: string
  }
  database: {
    connected: boolean
    lastMessageAt?: string
    pendingMessages?: number
  }
  alerts: string[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
    const INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'wpp2'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const alerts: string[] = []
    const startTime = Date.now()

    // 1. Check Evolution API reachability
    let apiReachable = false
    let apiLatency = 0
    let apiVersion = ''
    try {
      const apiStart = Date.now()
      const apiResponse = await fetch(`${EVOLUTION_API_URL}/manager/version`, {
        headers: { 'apikey': EVOLUTION_API_KEY }
      })
      apiLatency = Date.now() - apiStart
      if (apiResponse.ok) {
        apiReachable = true
        const data = await apiResponse.json()
        apiVersion = data.version || 'unknown'
      }
    } catch (e) {
      alerts.push('Evolution API is unreachable')
    }

    // 2. Check instance connection status
    let instanceConnected = false
    let instanceState = 'unknown'
    let phoneNumber = ''
    try {
      const instanceResponse = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`,
        { headers: { 'apikey': EVOLUTION_API_KEY } }
      )
      if (instanceResponse.ok) {
        const data = await instanceResponse.json()
        instanceState = data.instance?.state || 'unknown'
        instanceConnected = instanceState === 'open'
        phoneNumber = data.instance?.phoneNumber || ''
        
        if (!instanceConnected) {
          alerts.push(`WhatsApp disconnected: state=${instanceState}`)
        }
      }
    } catch (e) {
      alerts.push('Failed to check instance status')
    }

    // 3. Check webhook configuration
    let webhookConfigured = false
    let webhookUrl = ''
    let webhookEvents: string[] = []
    try {
      const webhookResponse = await fetch(
        `${EVOLUTION_API_URL}/webhook/find/${INSTANCE_NAME}`,
        { headers: { 'apikey': EVOLUTION_API_KEY } }
      )
      if (webhookResponse.ok) {
        const data = await webhookResponse.json()
        webhookUrl = data.webhook?.url || ''
        webhookEvents = data.webhook?.events || []
        webhookConfigured = !!webhookUrl
        
        if (!webhookConfigured) {
          alerts.push('Webhook not configured')
        }
        
        // Check for missing critical events
        const criticalEvents = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']
        const missingEvents = criticalEvents.filter(e => !webhookEvents.includes(e))
        if (missingEvents.length > 0) {
          alerts.push(`Missing webhook events: ${missingEvents.join(', ')}`)
        }
      }
    } catch (e) {
      alerts.push('Failed to check webhook configuration')
    }

    // 4. Check database connection and recent messages
    let dbConnected = false
    let lastMessageAt = ''
    let pendingMessages = 0
    try {
      // Check last message received
      const { data: lastMsg, error: lastMsgError } = await supabase
        .from('messages_whatsapp')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!lastMsgError && lastMsg) {
        dbConnected = true
        lastMessageAt = lastMsg.created_at
        
        // Alert if no messages in last 30 minutes (when connected)
        const lastMsgTime = new Date(lastMsg.created_at).getTime()
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
        if (instanceConnected && lastMsgTime < thirtyMinutesAgo) {
          alerts.push('No messages received in last 30 minutes')
        }
      }

      // Check pending messages in queue (if table exists)
      const { data: pending, error: pendingError } = await supabase
        .from('message_queue')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')

      if (!pendingError && pending) {
        pendingMessages = pending.length
        if (pendingMessages > 100) {
          alerts.push(`High message queue: ${pendingMessages} pending`)
        }
      }
    } catch (e) {
      // message_queue table might not exist, that's OK
      dbConnected = true
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (!apiReachable || !instanceConnected) {
      overallStatus = 'unhealthy'
    } else if (alerts.length > 0) {
      overallStatus = 'degraded'
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      instance: {
        name: INSTANCE_NAME,
        connected: instanceConnected,
        state: instanceState,
        phoneNumber: phoneNumber || undefined,
      },
      webhook: {
        configured: webhookConfigured,
        url: webhookUrl || undefined,
        events: webhookEvents.length > 0 ? webhookEvents : undefined,
      },
      api: {
        reachable: apiReachable,
        latencyMs: apiLatency,
        version: apiVersion || undefined,
      },
      database: {
        connected: dbConnected,
        lastMessageAt: lastMessageAt || undefined,
        pendingMessages: pendingMessages > 0 ? pendingMessages : undefined,
      },
      alerts,
    }

    // Log health check to system_logs (if table exists)
    try {
      await supabase.from('system_logs').insert({
        level: overallStatus === 'unhealthy' ? 'error' : overallStatus === 'degraded' ? 'warn' : 'info',
        category: 'health_check',
        message: `Evolution API health: ${overallStatus}`,
        metadata: result,
      })
    } catch (e) {
      // system_logs table might not exist, that's OK
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: overallStatus === 'unhealthy' ? 503 : 200,
    })

  } catch (error) {
    console.error('Health check error:', error)
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        alerts: ['Health check failed unexpectedly'],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      }
    )
  }
})
