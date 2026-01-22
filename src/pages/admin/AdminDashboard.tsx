import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Cherry, LogOut, Package, ShoppingCart, Settings, BarChart3, 
  Plus, Trash2, Edit, Play, Square, Printer
} from 'lucide-react';
import { Product, Order, SiteSettings } from '@/types';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [todayStats, setTodayStats] = useState({ orders: 0, revenue: 0 });

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '', price: '', discount_percentage: '0', image_url: ''
  });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    // Fetch products
    const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (productsData) setProducts(productsData as Product[]);

    // Fetch orders
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (ordersData) {
      setOrders(ordersData as Order[]);
      // Calculate today's stats
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = ordersData.filter(o => o.created_at.startsWith(today));
      setTodayStats({
        orders: todayOrders.length,
        revenue: todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
      });
    }

    // Fetch settings
    const { data: settingsData } = await supabase.from('site_settings').select('*').limit(1).single();
    if (settingsData) setSettings(settingsData as SiteSettings);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: productForm.name,
      price: parseFloat(productForm.price),
      discount_percentage: parseInt(productForm.discount_percentage) || 0,
      image_url: productForm.image_url || null,
    };

    if (editingProduct) {
      await supabase.from('products').update(productData).eq('id', editingProduct);
      toast.success('Product updated!');
    } else {
      await supabase.from('products').insert(productData);
      toast.success('Product added!');
    }
    
    setProductForm({ name: '', price: '', discount_percentage: '0', image_url: '' });
    setEditingProduct(null);
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    toast.success('Product deleted!');
    fetchData();
  };

  const updateSettings = async (updates: Partial<SiteSettings>) => {
    if (!settings) return;
    await supabase.from('site_settings').update(updates).eq('id', settings.id);
    toast.success('Settings updated!');
    fetchData();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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
              <Button type="submit"><Plus className="mr-2 h-4 w-4" />{editingProduct ? 'Update' : 'Add'} Product</Button>
            </form>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map(product => (
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
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{order.order_id}</td>
                      <td className="p-3">{order.customer_name}</td>
                      <td className="p-3">{order.phone_number}</td>
                      <td className="p-3 font-bold">PKR {Number(order.total_amount).toLocaleString()}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${order.order_type === 'AUTO' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{order.order_type}</span></td>
                      <td className="p-3 text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Discount Ticker</h3>
              <div>
                <Label>Ticker Text</Label>
                <Input value={settings.ticker_text || ''} onChange={e => updateSettings({ ticker_text: e.target.value })} />
              </div>
              <Button variant={settings.ticker_enabled ? 'destructive' : 'default'} onClick={() => updateSettings({ ticker_enabled: !settings.ticker_enabled })}>
                {settings.ticker_enabled ? 'Disable Ticker' : 'Enable Ticker'}
              </Button>
            </div>
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold">Automation Control</h3>
              <p className="text-sm text-muted-foreground">Status: {settings.automation_running ? '🟢 Running' : '🔴 Stopped'}</p>
              <Button variant={settings.automation_running ? 'destructive' : 'default'} onClick={() => updateSettings({ automation_running: !settings.automation_running })}>
                {settings.automation_running ? <><Square className="mr-2 h-4 w-4" />Stop Automation</> : <><Play className="mr-2 h-4 w-4" />Start Automation</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
