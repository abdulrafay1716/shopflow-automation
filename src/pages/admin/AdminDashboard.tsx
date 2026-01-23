import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Cherry, LogOut, Package, ShoppingCart, Settings, BarChart3, 
  Plus, Trash2, Edit, Play, Square, Printer, RefreshCw
} from 'lucide-react';
import { Product, Order, SiteSettings } from '@/types';

// Admin API helper using edge function with service role
const adminApi = async (action: string, data?: any) => {
  const { data: result, error } = await supabase.functions.invoke('admin-api', {
    body: { action, data }
  });
  if (error) throw error;
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [todayStats, setTodayStats] = useState({ orders: 0, revenue: 0 });
  const [automationRunning, setAutomationRunning] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const automationInterval = useRef<NodeJS.Timeout | null>(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '', price: '', discount_percentage: '0', image_url: ''
  });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Automation scheduler
  useEffect(() => {
    if (settings?.automation_running && !automationInterval.current) {
      automationInterval.current = setInterval(() => {
        runAutomation();
      }, 30 * 60 * 1000);
      runAutomation();
    } else if (!settings?.automation_running && automationInterval.current) {
      clearInterval(automationInterval.current);
      automationInterval.current = null;
    }

    return () => {
      if (automationInterval.current) {
        clearInterval(automationInterval.current);
      }
    };
  }, [settings?.automation_running]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [productsData, ordersData, settingsData, statsData] = await Promise.all([
        adminApi('get_products'),
        adminApi('get_orders'),
        adminApi('get_settings'),
        adminApi('get_stats')
      ]);

      setProducts(productsData || []);
      setOrders(ordersData || []);
      setSettings(settingsData);
      setTodayStats(statsData || { orders: 0, revenue: 0 });

      // Fetch order items for each order
      if (ordersData) {
        const itemsMap: Record<string, any[]> = {};
        for (const order of ordersData) {
          try {
            const items = await adminApi('get_order_items', { order_id: order.id });
            itemsMap[order.id] = items || [];
          } catch (e) {
            console.error('Error fetching items for order:', order.id);
          }
        }
        setOrderItems(itemsMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setDataLoading(false);
    }
  };

  const runAutomation = async () => {
    try {
      setAutomationRunning(true);
      const { data, error } = await supabase.functions.invoke('run-automation');
      if (error) {
        console.error('Automation error:', error);
        toast.error('Automation failed');
      } else if (data?.success) {
        toast.success(`Generated ${data.generated} automated orders`);
        fetchData();
      }
    } catch (error) {
      console.error('Automation error:', error);
    } finally {
      setAutomationRunning(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        discount_percentage: parseInt(productForm.discount_percentage) || 0,
        image_url: productForm.image_url || null,
      };

      if (editingProduct) {
        await adminApi('update_product', { id: editingProduct, ...productData });
        toast.success('Product updated!');
      } else {
        await adminApi('add_product', productData);
        toast.success('Product added!');
      }
      
      setProductForm({ name: '', price: '', discount_percentage: '0', image_url: '' });
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      console.error('Product error:', error);
      toast.error('Failed to save product');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await adminApi('delete_product', { id });
      toast.success('Product deleted!');
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete product');
    }
  };

  const updateSettings = async (updates: Partial<SiteSettings>) => {
    if (!settings) return;
    try {
      await adminApi('update_settings', { id: settings.id, ...updates });
      toast.success('Settings updated!');
      fetchData();
    } catch (error) {
      console.error('Settings error:', error);
      toast.error('Failed to update settings');
    }
  };

  const printInvoice = (order: Order) => {
    const items = orderItems[order.id] || [];
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.order_id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #f97316; margin: 0; font-size: 28px; }
          .header p { color: #666; margin: 5px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { background: #f9f9f9; padding: 15px; border-radius: 8px; }
          .info-box h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; text-transform: uppercase; }
          .info-box p { margin: 5px 0; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f97316; color: white; }
          .total-row { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍒 Cherry's Store</h1>
          <p>Invoice / Receipt</p>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.order_id}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            <p><strong>Type:</strong> ${order.order_type}</p>
            <p><strong>Payment:</strong> ${order.payment_method}</p>
          </div>
          <div class="info-box">
            <h3>Customer Details</h3>
            <p><strong>Name:</strong> ${order.customer_name}</p>
            <p><strong>Phone:</strong> ${order.phone_number}</p>
            <p><strong>City:</strong> ${order.city || 'N/A'}</p>
            <p><strong>Address:</strong> ${order.address}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>PKR ${Number(item.unit_price).toLocaleString()}</td>
                <td>${item.discount_percentage || 0}%</td>
                <td>PKR ${(Number(item.unit_price) * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">Grand Total:</td>
              <td>PKR ${Number(order.total_amount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Thank you for shopping with Cherry's Store!</p>
          <p>Cash on Delivery - Payment to be collected at delivery</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;

    invoiceWindow.document.write(invoiceHTML);
    invoiceWindow.document.close();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xl font-bold">
            <Cherry className="h-8 w-8 text-primary" />
            <span>Admin Panel</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="container py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'products', icon: Package, label: 'Products' },
            { id: 'orders', icon: ShoppingCart, label: 'Orders' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className="gap-2"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-card rounded-xl border p-6">
                <p className="text-sm text-muted-foreground">Today's Orders</p>
                <p className="text-3xl font-bold">{todayStats.orders}</p>
              </div>
              <div className="bg-card rounded-xl border p-6">
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-3xl font-bold text-primary">PKR {todayStats.revenue.toLocaleString()}</p>
              </div>
              <div className="bg-card rounded-xl border p-6">
                <p className="text-sm text-muted-foreground">Automation Status</p>
                <p className={`text-lg font-semibold ${settings?.automation_running ? 'text-green-600' : 'text-red-600'}`}>
                  {settings?.automation_running ? '🟢 Running' : '🔴 Stopped'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl border p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="flex gap-4 flex-wrap">
                <Button onClick={() => runAutomation()} disabled={automationRunning || !settings?.automation_running}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${automationRunning ? 'animate-spin' : ''}`} />
                  Generate Orders Now
                </Button>
                <Button variant="outline" onClick={fetchData}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <form onSubmit={handleProductSubmit} className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                </div>
                <div>
                  <Label>Price (PKR)</Label>
                  <Input type="number" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input type="number" min="0" max="100" value={productForm.discount_percentage} onChange={e => setProductForm({...productForm, discount_percentage: e.target.value})} />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit"><Plus className="mr-2 h-4 w-4" />{editingProduct ? 'Update' : 'Add'} Product</Button>
                {editingProduct && (
                  <Button type="button" variant="outline" onClick={() => { setEditingProduct(null); setProductForm({ name: '', price: '', discount_percentage: '0', image_url: '' }); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No products yet. Add your first product above!
                </div>
              ) : products.map(product => (
                <div key={product.id} className="bg-card rounded-xl border p-4 flex gap-4">
                  <div className="h-20 w-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center justify-center h-full text-2xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{product.name}</h4>
                    <p className="text-primary font-bold">PKR {product.price.toLocaleString()}</p>
                    {product.discount_percentage > 0 && <p className="text-sm text-muted-foreground">{product.discount_percentage}% off</p>}
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingProduct(product.id); setProductForm({ name: product.name, price: String(product.price), discount_percentage: String(product.discount_percentage), image_url: product.image_url || '' }); }}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProduct(product.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-card rounded-xl border overflow-hidden">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No orders yet. Orders will appear here when customers checkout or automation runs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Order ID</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Phone</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs">{order.order_id}</td>
                        <td className="p-3">{order.customer_name}</td>
                        <td className="p-3">{order.phone_number}</td>
                        <td className="p-3 font-bold">PKR {Number(order.total_amount).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${order.order_type === 'AUTO' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {order.order_type}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" onClick={() => printInvoice(order)}>
                            <Printer className="h-3 w-3 mr-1" /> Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Discount Ticker</h3>
              <div>
                <Label>Ticker Text</Label>
                <Input 
                  value={settings.ticker_text || ''} 
                  onChange={e => updateSettings({ ticker_text: e.target.value })} 
                />
              </div>
              <Button 
                variant={settings.ticker_enabled ? 'destructive' : 'default'} 
                onClick={() => updateSettings({ ticker_enabled: !settings.ticker_enabled })}
              >
                {settings.ticker_enabled ? 'Disable Ticker' : 'Enable Ticker'}
              </Button>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Automation Control</h3>
              <p className="text-sm text-muted-foreground">
                Status: {settings.automation_running ? '🟢 Running' : '🔴 Stopped'}
              </p>
              <p className="text-xs text-muted-foreground">
                When enabled, the system automatically generates ~50 orders per day with random Pakistani customer data.
                Each order contains 1-5 products with a maximum total of PKR 30,000.
              </p>
              <Button 
                variant={settings.automation_running ? 'destructive' : 'default'} 
                onClick={() => updateSettings({ automation_running: !settings.automation_running })}
              >
                {settings.automation_running ? (
                  <><Square className="mr-2 h-4 w-4" />Stop Automation</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" />Start Automation</>
                )}
              </Button>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Google Sheets Integration</h3>
              <p className="text-xs text-muted-foreground">
                To enable Google Sheets sync, add a GOOGLE_SHEETS_WEBHOOK_URL secret with your Google Apps Script web app URL.
                All orders (manual and automated) will be automatically logged to your spreadsheet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
