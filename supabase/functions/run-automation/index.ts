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

    // Check if automation is running and get time settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('automation_running, automation_start_hour, automation_end_hour, automation_timezone')
      .limit(1)
      .single();

    if (!settings?.automation_running) {
      return new Response(
        JSON.stringify({ success: false, message: 'Automation is stopped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get automation time settings
    const startHour = settings.automation_start_hour ?? 11;
    const endHour = settings.automation_end_hour ?? 20;
    const timezone = settings.automation_timezone ?? 'Asia/Karachi';

    // Check if current time is within configured hours
    const now = new Date();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const hour = localTime.getHours();
    
    if (hour < startHour || hour >= endHour) {
      console.log(`Outside automation hours (${startHour}:00 - ${endHour}:00 ${timezone}). Current hour: ${hour}`);
      return new Response(
        JSON.stringify({ success: false, message: `Outside automation hours (${startHour}:00 - ${endHour}:00)` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unlimited orders with 10 min break after every 80 orders
    // Randomize between 75-85 orders per batch to average around 80
    const ordersToGenerate = Math.floor(Math.random() * 11) + 75; // 75-85 orders per call
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
    console.log(`Automation run complete: Generated ${successCount}/${ordersToGenerate} orders. Taking 10 min break before next batch.`);

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
