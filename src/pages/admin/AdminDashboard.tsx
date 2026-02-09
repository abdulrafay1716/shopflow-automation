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
  Plus, Trash2, Edit, Play, Square, Printer, RefreshCw, Upload, Clock, Download
} from 'lucide-react';
import { Product, Order, SiteSettings, COMMON_TIMEZONES } from '@/types';
import * as XLSX from 'xlsx';

// Generate hour options for time selection
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

// Admin API helper using edge function with service role
const adminApi = async (action: string, data?: any) => {
  const { data: result, error } = await supabase.functions.invoke('admin-api', {
    body: { action, data }
  });
  if (error) throw error;
  if (!result.success) throw new Error(result.message);
  return result.data;
};

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix to get just the base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
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
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Ticker text local state for controlled input
  const [tickerText, setTickerText] = useState('');

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
      const [productsData, ordersData, settingsData, statsData, allItems] = await Promise.all([
        adminApi('get_products'),
        adminApi('get_orders'),
        adminApi('get_settings'),
        adminApi('get_stats'),
        adminApi('get_all_order_items')
      ]);

      setProducts(productsData || []);
      setOrders(ordersData || []);
      setSettings(settingsData);
      setTickerText(settingsData?.ticker_text || '');
      setTodayStats(statsData || { orders: 0, revenue: 0 });

      // Group all items by order_id in one pass
      const itemsMap: Record<string, any[]> = {};
      if (allItems) {
        for (const item of allItems) {
          if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
          itemsMap[item.order_id].push(item);
        }
      }
      setOrderItems(itemsMap);
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

  // Upload image via edge function (uses service role key)
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const base64 = await fileToBase64(file);
      const result = await adminApi('upload_image', {
        base64,
        fileName: file.name,
        folder,
        contentType: file.type
      });
      return result.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingProductImage(true);
    const url = await uploadImage(file, 'products');
    if (url) {
      setProductForm({ ...productForm, image_url: url });
      toast.success('Product image uploaded!');
    }
    setUploadingProductImage(false);
    // Reset input
    e.target.value = '';
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    
    setUploadingLogo(true);
    const url = await uploadImage(file, 'logo');
    if (url) {
      await updateSettings({ logo_url: url } as any);
      toast.success('Logo uploaded!');
    }
    setUploadingLogo(false);
    // Reset input
    e.target.value = '';
  };

  // Export orders to Excel
  const exportOrdersToExcel = async () => {
    try {
      // Fetch all order items
      const allItems = await adminApi('get_all_order_items');
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Orders sheet
      const ordersData = orders.map(order => ({
        'Order ID': order.order_id,
        'Customer Name': order.customer_name,
        'Phone Number': order.phone_number,
        'City': order.city || 'N/A',
        'Address': order.address,
        'Total Amount (PKR)': Number(order.total_amount),
        'Order Type': order.order_type,
        'Payment Method': order.payment_method,
        'Date': new Date(order.created_at).toLocaleDateString(),
        'Time': new Date(order.created_at).toLocaleTimeString()
      }));
      
      const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, ordersSheet, 'Orders');
      
      // Order Items sheet
      const itemsData = allItems.map((item: any) => {
        const order = orders.find(o => o.id === item.order_id);
        return {
          'Order ID': order?.order_id || 'N/A',
          'Product Name': item.product_name,
          'Quantity': item.quantity,
          'Unit Price (PKR)': Number(item.unit_price),
          'Discount %': item.discount_percentage || 0,
          'Total (PKR)': Number(item.unit_price) * item.quantity,
          'Date': order ? new Date(order.created_at).toLocaleDateString() : 'N/A'
        };
      });
      
      const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(wb, itemsSheet, 'Order Items');
      
      // Download file
      const fileName = `orders_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
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
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={productForm.image_url} 
                      onChange={e => setProductForm({...productForm, image_url: e.target.value})} 
                      placeholder="https://... or upload"
                      className="flex-1"
                    />
                    <label className="cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleProductImageUpload} 
                        className="hidden" 
                      />
                      <Button type="button" variant="outline" disabled={uploadingProductImage} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          {uploadingProductImage ? 'Uploading...' : 'Upload'}
                        </span>
                      </Button>
                    </label>
                  </div>
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
          <div className="space-y-4">
            {/* Export Button */}
            <div className="flex justify-end">
              <Button onClick={exportOrdersToExcel} disabled={orders.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Get Report (Excel)
              </Button>
            </div>
            
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
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            {/* Logo Settings */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Store Logo</h3>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {(settings as any).logo_url ? (
                    <img src={(settings as any).logo_url} alt="Store Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-3xl">🍒</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Logo URL or Upload</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://example.com/logo.png"
                      value={(settings as any).logo_url || ''} 
                      onChange={e => updateSettings({ logo_url: e.target.value } as any)}
                      className="flex-1"
                    />
                    <label className="cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                      <Button type="button" variant="outline" disabled={uploadingLogo} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          {uploadingLogo ? 'Uploading...' : 'Upload'}
                        </span>
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">Upload an image or enter a URL. Leave empty to use default cherry icon.</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Discount Ticker</h3>
              <div className="space-y-2">
                <Label>Ticker Text</Label>
                <div className="flex gap-2">
                  <Input 
                    value={tickerText} 
                    onChange={e => setTickerText(e.target.value)} 
                    placeholder="Enter ticker text..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => updateSettings({ ticker_text: tickerText })}
                    disabled={tickerText === settings.ticker_text}
                  >
                    Save
                  </Button>
                </div>
              </div>
              <Button 
                variant={settings.ticker_enabled ? 'destructive' : 'default'} 
                onClick={() => updateSettings({ ticker_enabled: !settings.ticker_enabled })}
              >
                {settings.ticker_enabled ? 'Disable Ticker' : 'Enable Ticker'}
              </Button>
            </div>

            {/* Automation Time Range Settings */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Automation Time Range</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure when the automation should run. The system will generate unlimited orders during this time window.
                After every 80 orders, there's an automatic 10-minute break.
              </p>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <select
                    value={settings.automation_start_hour ?? 11}
                    onChange={(e) => updateSettings({ automation_start_hour: parseInt(e.target.value) })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {HOUR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <select
                    value={settings.automation_end_hour ?? 20}
                    onChange={(e) => updateSettings({ automation_end_hour: parseInt(e.target.value) })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {HOUR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Timezone (Country)</Label>
                  <select
                    value={settings.automation_timezone ?? 'Asia/Karachi'}
                    onChange={(e) => updateSettings({ automation_timezone: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.country} - {tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">Current Settings:</p>
                <p className="text-muted-foreground">
                  Automation runs from {HOUR_OPTIONS.find(h => h.value === (settings.automation_start_hour ?? 11))?.label} to{' '}
                  {HOUR_OPTIONS.find(h => h.value === (settings.automation_end_hour ?? 20))?.label}{' '}
                  ({COMMON_TIMEZONES.find(t => t.value === (settings.automation_timezone ?? 'Asia/Karachi'))?.label})
                </p>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Automation Control</h3>
              <p className="text-sm text-muted-foreground">
                Status: {settings.automation_running ? '🟢 Running' : '🔴 Stopped'}
              </p>
              <p className="text-xs text-muted-foreground">
                • Maximum order limit: PKR 30,000 per bill<br />
                • Unlimited bills during the time window<br />
                • 10-minute break after every 80 orders<br />
                • Orders sync to Google Sheets automatically
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
                ✅ Google Sheets webhook is configured. All orders (manual and automated) are automatically logged with:
                Order ID, Name, Date, Contact Number, Type, Address, Time
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
