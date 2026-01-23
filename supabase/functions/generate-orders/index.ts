import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pakistani names for random generation
const firstNames = [
  'Muhammad', 'Ahmed', 'Ali', 'Hassan', 'Usman', 'Bilal', 'Hamza', 'Zaid', 'Omar', 'Ibrahim',
  'Fatima', 'Ayesha', 'Zainab', 'Maryam', 'Khadija', 'Sara', 'Hira', 'Sana', 'Noor', 'Amna'
];

const lastNames = [
  'Khan', 'Ahmed', 'Ali', 'Malik', 'Sheikh', 'Hussain', 'Raza', 'Siddiqui', 'Qureshi', 'Butt',
  'Chaudhry', 'Awan', 'Iqbal', 'Mirza', 'Javed', 'Rashid', 'Nawaz', 'Akram', 'Saeed', 'Tariq'
];

const cities = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Sialkot', 'Gujranwala', 'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Abbottabad'
];

const areas = [
  'Gulshan', 'DHA Phase', 'Johar Town', 'Model Town', 'Bahria Town', 'Clifton', 'Saddar',
  'Garden Town', 'F-10', 'G-11', 'I-8', 'Blue Area', 'Cantt', 'University Road', 'Mall Road'
];

function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

function generatePhoneNumber(): string {
  const prefixes = ['300', '301', '302', '303', '304', '305', '306', '311', '312', '313', '321', '322', '323', '332', '333'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `03${prefix.slice(2)}-${number}`;
}

function generateAddress(city: string): string {
  const area = areas[Math.floor(Math.random() * areas.length)];
  const houseNum = Math.floor(Math.random() * 500) + 1;
  const streetNum = Math.floor(Math.random() * 50) + 1;
  return `House ${houseNum}, Street ${streetNum}, ${area}, ${city}`;
}

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

    // Get available products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError || !products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No products available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Randomly select 1-5 products
    const numProducts = Math.floor(Math.random() * 5) + 1;
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, Math.min(numProducts, shuffled.length));

    // Calculate total and ensure it doesn't exceed PKR 30,000
    const MAX_TOTAL = 30000;
    let orderItems: { product: typeof products[0]; quantity: number; finalPrice: number }[] = [];
    let runningTotal = 0;

    for (const product of selectedProducts) {
      const discountedPrice = product.price * (1 - (product.discount_percentage || 0) / 100);
      const quantity = Math.floor(Math.random() * 3) + 1;
      const itemTotal = discountedPrice * quantity;

      if (runningTotal + itemTotal <= MAX_TOTAL) {
        orderItems.push({ product, quantity, finalPrice: discountedPrice });
        runningTotal += itemTotal;
      }
    }

    if (orderItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No products fit within budget' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate fake customer data
    const city = cities[Math.floor(Math.random() * cities.length)];
    const customerName = generateRandomName();
    const phoneNumber = generatePhoneNumber();
    const address = generateAddress(city);

    // Generate order ID
    const { data: orderIdData } = await supabase.rpc('generate_order_id');
    const orderId = orderIdData || `CHR-${Date.now()}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        customer_name: customerName,
        phone_number: phoneNumber,
        address: address,
        city: city,
        total_amount: runningTotal,
        payment_method: 'COD',
        order_type: 'AUTO',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({ success: false, message: orderError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create order items
    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.finalPrice,
      discount_percentage: item.product.discount_percentage || 0,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Order items error:', itemsError);
    }

    console.log(`Generated order: ${orderId} for ${customerName}, Total: PKR ${runningTotal}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: {
          id: order.id,
          order_id: orderId,
          customer_name: customerName,
          total_amount: runningTotal,
          items_count: orderItems.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating order:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
