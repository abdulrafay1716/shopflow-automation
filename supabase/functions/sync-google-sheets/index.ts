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
    const { order } = await req.json();
    
    const googleSheetsWebhookUrl = Deno.env.get('GOOGLE_SHEETS_WEBHOOK_URL');
    
    if (!googleSheetsWebhookUrl) {
      console.log('Google Sheets webhook URL not configured, skipping sync');
      return new Response(
        JSON.stringify({ success: true, message: 'Google Sheets not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format data for Google Sheets
    const sheetData = {
      order_id: order.order_id,
      date_time: order.created_at,
      customer_name: order.customer_name,
      phone_number: order.phone_number,
      address: order.address,
      city: order.city || '',
      products: order.items?.map((item: any) => `${item.product_name} x${item.quantity}`).join(', ') || '',
      total_amount: order.total_amount,
      order_type: order.order_type,
      payment_method: order.payment_method,
    };

    // Send to Google Sheets via webhook (Apps Script Web App)
    const response = await fetch(googleSheetsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetData),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets sync failed: ${response.statusText}`);
    }

    console.log(`Order ${order.order_id} synced to Google Sheets`);

    return new Response(
      JSON.stringify({ success: true, message: 'Order synced to Google Sheets' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error syncing to Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
