// src/components/ADMIN_SEGMENT/ADMIN_TABS/AnalyticsTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProducts, fetchActiveProductsCount } from '../ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays } from 'date-fns';
import { Download, TrendingUp, IndianRupee, Package, AlertTriangle } from 'lucide-react';

const AnalyticsTab = () => {
  const dispatch = useDispatch();
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());

  // Same source as Products tab: list is paginated; totals come from API fields on fetch.
  const { products, totalProducts: adminTotalProductCount, realActiveCount } = useSelector(
    (state) => state.adminGetProducts
  );

  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 15 }));
    dispatch(fetchActiveProductsCount());
  }, [dispatch]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // ============================================
  // REAL ANALYTICS COMPUTED FROM PRODUCTS DATA
  // ============================================

  // Category distribution
  const categoryDistribution = useMemo(() => {
    const categoryMap = new Map();
    
    products.forEach(product => {
      const categoryName = product.category?.name || 'Uncategorized';
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
    });

    return Array.from(categoryMap, ([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [products]);

  // Top products by stock value (price × quantity) as proxy for popularity/value
  const topProductsByValue = useMemo(() => {
    return products
      .filter(p => p.status === 'active')
      .map(product => {
        // Calculate total stock value across variants
        const totalValue = (product.variants || []).reduce((sum, variant) => {
          const price = variant.price?.sale || variant.price?.base || 0;
          const quantity = variant.inventory?.quantity || 0;
          return sum + (price * quantity);
        }, 0);

        // Get total units in stock
        const totalUnits = (product.variants || []).reduce((sum, variant) => 
          sum + (variant.inventory?.quantity || 0), 0);

        return {
          id: product._id,
          name: product.name,
          value: totalValue,
          units: totalUnits,
          slug: product.slug
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [products]);

  // Price range analysis - distribution across price tiers
  const priceRangeData = useMemo(() => {
    const ranges = {
      '0-500': 0,
      '501-1000': 0,
      '1001-2000': 0,
      '2001-5000': 0,
      '5001+': 0
    };

    products.forEach(product => {
      (product.variants || []).forEach(variant => {
        const price = variant.price?.sale || variant.price?.base || 0;
        if (price <= 500) ranges['0-500']++;
        else if (price <= 1000) ranges['501-1000']++;
        else if (price <= 2000) ranges['1001-2000']++;
        else if (price <= 5000) ranges['2001-5000']++;
        else ranges['5001+']++;
      });
    });

    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count
    }));
  }, [products]);

  // Low stock products (using inventory thresholds)
  const lowStockProducts = useMemo(() => {
    const lowStock = [];
    
    products.forEach(product => {
      if (product.status !== 'active') return;
      
      (product.variants || []).forEach(variant => {
        const threshold = variant.inventory?.lowStockThreshold || 5;
        const quantity = variant.inventory?.quantity || 0;
        
        if (quantity <= threshold && quantity > 0) {
          lowStock.push({
            id: `${product._id}-${variant.sku}`,
            name: product.name,
            sku: variant.sku || 'N/A',
            stock: quantity,
            reorderLevel: threshold,
            variant: variant.attributes?.map(attr => attr.value).join(' / ') || 'Default'
          });
        }
      });
    });

    return lowStock.sort((a, b) => a.stock - b.stock).slice(0, 10);
  }, [products]);

  // Revenue potential (price × stock)
  const revenuePotential = useMemo(() => {
    return products.reduce((total, product) => {
      return total + (product.variants || []).reduce((sum, variant) => {
        const price = variant.price?.sale || variant.price?.base || 0;
        const quantity = variant.inventory?.quantity || 0;
        return sum + (price * quantity);
      }, 0);
    }, 0);
  }, [products]);

  // Inventory health metrics
  const inventoryMetrics = useMemo(() => {
    let totalVariants = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let healthyStock = 0;

    products.forEach(product => {
      (product.variants || []).forEach(variant => {
        totalVariants++;
        const quantity = variant.inventory?.quantity || 0;
        const threshold = variant.inventory?.lowStockThreshold || 5;

        if (quantity === 0) outOfStock++;
        else if (quantity <= threshold) lowStock++;
        else healthyStock++;
      });
    });

    return {
      totalVariants,
      outOfStock,
      lowStock,
      healthyStock,
      stockHealthPercentage: totalVariants > 0 
        ? ((healthyStock / totalVariants) * 100).toFixed(1) 
        : 0
    };
  }, [products]);

  // For sales trend - since we don't have real order data yet, 
  // we'll create a placeholder or you can connect this to your orders API when ready
  const salesData = useMemo(() => {
    // This is where you'd integrate with your orders API
    // For now, return empty array or you could show a message
    return [];
  }, []);

  const chartData = useMemo(() => {
    if (dateRange === 'week' && salesData.length > 0) {
      return salesData.slice(-7);
    }
    return salesData;
  }, [dateRange, salesData]);

  const handleExport = (format) => {
    // In a real app, this would generate and download CSV/PDF
    alert(`Exporting as ${format}...`);
  };

  const totalProductCount =
    adminTotalProductCount > 0 ? adminTotalProductCount : products.length;
  const activeProductCountFromList = products.filter((p) => p.status === 'active').length;
  const activeProductDisplay =
    realActiveCount > 0 ? realActiveCount : activeProductCountFromList;
  const totalVariants = inventoryMetrics.totalVariants;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Revenue Potential</p>
              <p className="text-2xl font-bold text-gray-900">₹{revenuePotential.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Based on current inventory × prices</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Inventory Health</p>
              <p className="text-2xl font-bold text-gray-900">{inventoryMetrics.stockHealthPercentage}%</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {inventoryMetrics.healthyStock} healthy variants
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{totalProductCount}</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {activeProductDisplay} active · {totalVariants} variants
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockProducts.length}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-red-600 mt-2">{inventoryMetrics.outOfStock} out of stock</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
          <div className="h-80 w-full">
            {categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} products`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Top Products by Value Bar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Products by Stock Value</h3>
          <div className="h-96 w-full">
            {topProductsByValue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsByValue}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={200}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickMargin={6}
                    tickFormatter={(value) =>
                      typeof value === 'string' && value.length > 22
                        ? `${value.slice(0, 20)}…`
                        : value
                    }
                  />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Stock Value']}
                  />
                  <Legend />
                  <Bar dataKey="value" fill="#4F46E5" name="Stock Value (₹)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No product data available
              </div>
            )}
          </div>
        </div>

        {/* Price Range Analysis Line Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Range Distribution</h3>
          <div className="h-80 w-full">
            {priceRangeData.some(item => item.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceRangeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} variants`, 'Count']} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4F46E5"
                    name="Number of Variants"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No price data available
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alerts</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        SKU: {item.sku} {item.variant !== 'Default' && `· ${item.variant}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-red-600">{item.stock} units left</p>
                    <p className="text-xs text-gray-500">Reorder at: {item.reorderLevel}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No low stock items
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Health Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Health Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Active Product</p>
            <p className="text-2xl font-bold text-gray-900">{activeProductDisplay}</p>
            <p className="text-xs text-gray-500">products</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">Low Stock</p>
            <p className="text-2xl font-bold text-gray-900">{inventoryMetrics.lowStock}</p>
            <p className="text-xs text-gray-500">variants</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Out of Stock</p>
            <p className="text-2xl font-bold text-gray-900">{inventoryMetrics.outOfStock}</p>
            <p className="text-xs text-gray-500">variants</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;

