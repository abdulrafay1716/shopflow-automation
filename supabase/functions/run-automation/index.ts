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

    // Generate multiple orders (target ~50/day = ~2/hour on average)
    // This function can be called via cron every 30 minutes
    const ordersToGenerate = Math.floor(Math.random() * 3) + 1; // 1-3 orders per call
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
        
        // Small delay between orders
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: unknown) {
        console.error('Error generating order:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ success: false, error: message });
      }
    }

    console.log(`Automation run complete: Generated ${results.filter(r => r.success).length} orders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated: results.filter(r => r.success).length,
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
