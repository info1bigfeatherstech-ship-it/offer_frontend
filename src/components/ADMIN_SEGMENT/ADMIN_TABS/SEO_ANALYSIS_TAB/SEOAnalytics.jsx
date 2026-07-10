import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Globe, Smartphone, MousePointer2, ArrowUpRight, ArrowDownRight, X, Loader2 } from "lucide-react";
import { 
  useGetSeoOverviewQuery, 
  useGetSeoTrafficQuery, 
  useGetSeoDevicesQuery,
  useGetSeoLocationsQuery,
  useGetSeoSourcesQuery,
  setDateRange,
  toggleLocationsDrawer,
  setChartMetric,
  formatChartDate,
  formatNumber,
  formatDuration,
  formatBounceRate,
  getRangeParam,
  getDisplayRange
} from "../../ADMIN_REDUX_MANAGEMENT/adminSeoAnalytics";

const COLORS = ["#4f46e5", "#94a3b8", "#cbd5e1", "#818cf8", "#a5b4fc"];

const getErrorMessage = (...errors) => {
  for (const err of errors) {
    if (!err) continue;
    const msg = err?.data?.message || err?.error || err?.message;
    if (msg) return String(msg);
  }
  return "Please refresh the page or try again later";
};

const SEOAnalytics = () => {
  const dispatch = useDispatch();
  
  const seoUiState = useSelector((state) => state.seoUi) || {};
  const { dateRange = '7d', isLocationsDrawerOpen = false, chartMetric = 'activeUsers' } = seoUiState;
  
  const [timeView, setTimeView] = useState(getDisplayRange(dateRange));

  const { data: overviewData, isLoading: overviewLoading, error: overviewError } = useGetSeoOverviewQuery();
  const { data: trafficData, isLoading: trafficLoading, error: trafficError } = useGetSeoTrafficQuery(dateRange);
  const { data: devicesData, isLoading: devicesLoading, error: devicesError } = useGetSeoDevicesQuery();
  const { data: locationsData, isLoading: locationsLoading, error: locationsError } = useGetSeoLocationsQuery();
  const { data: sourcesData, isLoading: sourcesLoading, error: sourcesError } = useGetSeoSourcesQuery();

  const handleTimeViewChange = (view) => {
    setTimeView(view);
    const rangeParam = getRangeParam(view);
    dispatch(setDateRange(rangeParam));
  };

  const chartData = useMemo(() => {
    if (!trafficData?.data) return [];
    return trafficData.data.map(item => ({
      name: formatChartDate(item.date),
      activeUsers: item.activeUsers || 0,
      sessions: item.sessions || 0,
      newUsers: item.newUsers || 0,
    }));
  }, [trafficData]);

  const deviceChartData = useMemo(() => {
    if (!devicesData?.data) return [];
    return [
      { name: "Mobile", value: devicesData.data.mobile || 0, color: "#4f46e5" },
      { name: "Desktop", value: devicesData.data.desktop || 0, color: "#94a3b8" },
      { name: "Tablet", value: devicesData.data.tablet || 0, color: "#cbd5e1" },
    ].filter(d => d.value > 0);
  }, [devicesData]);

  const totalSessions = useMemo(() => {
    return deviceChartData.reduce((sum, d) => sum + d.value, 0);
  }, [deviceChartData]);

  const deviceChartWithPercentage = deviceChartData.map(d => ({
    ...d,
    percentage: totalSessions > 0 ? ((d.value / totalSessions) * 100).toFixed(2) : 0
  }));

  const locationList = useMemo(() => {
    if (!locationsData?.data) return [];
    return locationsData.data.slice(0, 5);
  }, [locationsData]);

  const sourceList = useMemo(() => {
    if (!sourcesData?.data) return [];
    return sourcesData.data.slice(0, 5);
  }, [sourcesData]);

  const metrics = useMemo(() => {
    if (!overviewData?.data) {
      return [
        { label: "Total Visitors", val: "0", trend: null, positive: true },
        { label: "Avg. Session", val: "0m 0s", trend: null, positive: true },
        { label: "New Users", val: "0", trend: null, positive: true },
        { label: "Bounce Rate", val: "0%", trend: null, positive: false },
      ];
    }

    const data = overviewData.data;
    return [
      { 
        label: "Total Visitors", 
        val: formatNumber(data.totalUsers || 0), 
        trend: null,
        positive: true,
        raw: data.totalUsers || 0
      },
      { 
        label: "Avg. Session", 
        val: formatDuration(data.averageSessionDuration || 0), 
        trend: null,
        positive: false,
        raw: data.averageSessionDuration || 0
      },
      { 
        label: "New Users", 
        val: formatNumber(data.newUsers || 0), 
        trend: null,
        positive: true,
        raw: data.newUsers || 0
      },
      { 
        label: "Bounce Rate", 
        val: formatBounceRate(data.bounceRate || 0), 
        trend: null,
        positive: false,
        raw: data.bounceRate || 0
      },
    ];
  }, [overviewData]);

  if (overviewLoading || trafficLoading || devicesLoading || locationsLoading || sourcesLoading) {
    return (
      <div className="max-w-[1400px] mx-auto p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (overviewError || trafficError || devicesError || locationsError || sourcesError) {
    return (
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Error loading analytics data</p>
          <p className="text-red-400 text-sm mt-2">
            {getErrorMessage(overviewError, trafficError, devicesError, locationsError, sourcesError)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 space-y-8 font-sans text-slate-900">
      
      {/* 1. HEADER SECTION */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">SEO Overview</h1>
          <p className="text-sm text-slate-500">Track your organic performance and user distribution.</p>
        </div>
      </div>

      {/* 2. TOP METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-medium text-slate-500 mb-1">{m.label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-semibold">{m.val}</h3>
              {m.trend && (
                <span className={`flex items-center text-xs font-medium ${m.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {m.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. MAIN TRAFFIC SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-base font-semibold">Traffic Trends</h2>
          <div className="flex gap-2">
            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
              {["Days", "Weeks", "Months"].map((t) => (
                <button
                  key={t}
                  onClick={() => handleTimeViewChange(t)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeView === t ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
              {['activeUsers', 'sessions', 'newUsers'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => dispatch(setChartMetric(metric))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                    chartMetric === metric ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {metric === 'activeUsers' ? 'Active Users' : metric}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10} 
                  interval={Math.floor(chartData.length / 6)}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  formatter={(value) => [formatNumber(value), chartMetric === 'activeUsers' ? 'Active Users' : chartMetric === 'sessions' ? 'Sessions' : 'New Users']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey={chartMetric} 
                  stroke="#4f46e5" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorMetric)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              No traffic data available
            </div>
          )}
        </div>
      </div>

      {/* 4. GEO & DEVICE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Globe size={16} className="text-slate-400" /> Top Locations
            </h3>
            <button 
              onClick={() => dispatch(toggleLocationsDrawer(true))} 
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {locationList.length > 0 ? (
              locationList.map((location, i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{location.city || 'Unknown'}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-tight">Top City</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatNumber(location.sessions || 0)} sessions</span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                No location data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-8">
            <Smartphone size={16} className="text-slate-400" /> Device Distribution
          </h3>
          {deviceChartWithPercentage.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              <div className="h-[180px] w-[180px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={deviceChartWithPercentage} 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={4} 
                      dataKey="value" 
                      stroke="none"
                    >
                      {deviceChartWithPercentage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-semibold">{deviceChartWithPercentage[0]?.percentage || 0}%</span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                    {deviceChartWithPercentage[0]?.name || '—'}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-3 w-full">
                {deviceChartWithPercentage.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-50 bg-slate-50/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                      <span className="text-xs font-medium text-slate-600">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-900">{d.percentage}%</span>
                      <span className="text-[10px] text-slate-400">{formatNumber(d.value)} sessions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400">
              No device data available
            </div>
          )}
        </div>
      </div>

      {/* 5. TRAFFIC SOURCES SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-6">
          <MousePointer2 size={16} className="text-slate-400" /> Traffic Sources
        </h3>
        {sourceList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sourceList.map((source, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50/30 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-sm font-medium text-slate-700 capitalize">{source.source.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatNumber(source.sessions)} sessions</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 py-8">
            No source data available
          </div>
        )}
      </div>

      {/* 6. SIDEBAR DRAWER (FULL LOCATIONS LIST) */}
      {isLocationsDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[998]" onClick={() => dispatch(toggleLocationsDrawer(false))} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[999] shadow-xl border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <div className="p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold tracking-tight">Geographic Data</h2>
                <button onClick={() => dispatch(toggleLocationsDrawer(false))} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                {locationsData?.data && locationsData.data.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-4">City</th>
                        <th className="pb-4 text-right">Sessions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {locationsData.data.map((item, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <p className="text-sm font-medium text-slate-800">{item.city || 'Unknown'}</p>
                          </td>
                          <td className="py-4 text-right text-sm font-semibold text-slate-900">
                            {formatNumber(item.sessions || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center text-slate-400 py-8">
                    No location data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SEOAnalytics;
