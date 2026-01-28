import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

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

    const { action, data } = await req.json();

    switch (action) {
      case 'get_products': {
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: products }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'add_product': {
        const { data: product, error } = await supabase
          .from('products')
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: product }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_product': {
        const { id, ...updateData } = data;
        const { data: product, error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: product }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'delete_product': {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', data.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_orders': {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: orders }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_order_items': {
        const { data: items, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', data.order_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: items }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_all_order_items': {
        const { data: items, error } = await supabase
          .from('order_items')
          .select('*');
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: items }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_settings': {
        const { data: settings, error } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: settings }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_settings': {
        const { id, ...updateData } = data;
        const { data: settings, error } = await supabase
          .from('site_settings')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: settings }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_stats': {
        const today = new Date().toISOString().split('T')[0];
        const { data: orders, error } = await supabase
          .from('orders')
          .select('total_amount, created_at')
          .gte('created_at', today);
        if (error) throw error;
        
        const stats = {
          orders: orders?.length || 0,
          revenue: orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0
        };
        return new Response(JSON.stringify({ success: true, data: stats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'upload_image': {
        const { base64, fileName, folder } = data;
        const fileData = decode(base64);
        const filePath = `${folder}/${Date.now()}_${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, fileData, {
            contentType: data.contentType || 'image/jpeg',
            upsert: false
          });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
        
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
        return new Response(JSON.stringify({ success: true, data: { url: urlData.publicUrl } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ success: false, message: 'Unknown action' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
    }

  } catch (error: unknown) {
    console.error('Admin API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
