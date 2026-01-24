import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if automation is running
    const { data: settings } = await supabase
      .from('site_settings')
      .select('automation_running')
      .limit(1)
      .single();

    if (!settings?.automation_running) {
      return new Response(
        JSON.stringify({ success: false, message: 'Automation is stopped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if current time is between 11 AM and 11 PM Pakistan time
    const now = new Date();
    const pakistanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const hour = pakistanTime.getHours();
    
    if (hour < 11 || hour >= 23) {
      console.log(`Outside automation hours (11 AM - 11 PM PKT). Current hour: ${hour}`);
      return new Response(
        JSON.stringify({ success: false, message: 'Outside automation hours (11 AM - 11 PM PKT)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate multiple orders (target ~500/day over 12 hours = ~42/hour)
    // This function can be called via cron every 30 minutes, so generate ~21 orders per call
    // Randomize between 18-24 orders per call
    const ordersToGenerate = Math.floor(Math.random() * 7) + 18; // 18-24 orders per call
    const results = [];

    for (let i = 0; i < ordersToGenerate; i++) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        });
        const result = await response.json();
        results.push(result);
        
        // Small delay between orders (200-500ms)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200));
      } catch (error: unknown) {
        console.error('Error generating order:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ success: false, error: message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Automation run complete: Generated ${successCount}/${ordersToGenerate} orders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated: successCount,
        attempted: ordersToGenerate,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error running automation:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
