import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  X,
  Truck,
  Wallet,
  MapPin,
  BadgeDollarSign,
  ShoppingBag,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import axiosInstance from '../../../../../SERVICES/axiosInstance';

const DeliveryTab = () => {
  const [activeModal, setActiveModal] = useState(null);
  const closeModal = () => setActiveModal(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  const [testMsg, setTestMsg] = useState(null);

  const [activeProvider, setActiveProvider] = useState('shiprocket');
  const [warehouseId, setWarehouseId] = useState('');
  const [pickupPincode, setPickupPincode] = useState('');
  const [keysConfigured, setKeysConfigured] = useState(false);
  const [shipmozoReady, setShipmozoReady] = useState(false);
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setSaveOk(false);
    try {
      const res = await axiosInstance.get('/shipping-provider/admin/settings');
      if (!res.data?.success || !res.data?.data) {
        throw new Error(res.data?.message || 'Could not load shipping settings');
      }
      const d = res.data.data;
      setActiveProvider(d.activeProvider === 'shipmozo' ? 'shipmozo' : 'shiprocket');
      setWarehouseId(d.shipmozo?.warehouseId || '');
      setPickupPincode(d.shipmozo?.pickupPincode || '');
      setKeysConfigured(Boolean(d.shipmozo?.keysConfigured));
      setShipmozoReady(Boolean(d.shipmozo?.ready));
      setMissing(Array.isArray(d.shipmozo?.missing) ? d.shipmozo.missing : []);
    } catch (e) {
      setFetchError(
        e.response?.data?.message || e.message || 'Could not load shipping settings'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveShippingPartner = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await axiosInstance.put('/shipping-provider/admin/settings', {
        activeProvider,
        shipmozo: {
          warehouseId: warehouseId.trim() || null,
          pickupPincode: pickupPincode.trim() || null
        }
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Update failed');
      }
      setSaveOk(true);
      await loadSettings();
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        (Array.isArray(e.response?.data?.errors) && e.response.data.errors.join(' ')) ||
        e.message ||
        'Could not save settings';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestShipmozo = async () => {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await axiosInstance.post('/shipping-provider/admin/shipmozo/test');
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Connection test failed');
      }
      setTestMsg({ ok: true, text: res.data?.message || 'Shipmozo API reachable' });
    } catch (e) {
      setTestMsg({
        ok: false,
        text: e.response?.data?.message || e.message || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleLoadWarehouses = async () => {
    try {
      const res = await axiosInstance.get('/shipping-provider/admin/shipmozo/warehouses');
      const list = res.data?.warehouses || [];
      if (!list.length) {
        setTestMsg({ ok: false, text: 'No warehouses returned from Shipmozo' });
        return;
      }
      const def = list.find((w) => String(w.default).toUpperCase() === 'YES') || list[0];
      if (def?.id != null) {
        setWarehouseId(String(def.id));
        if (def.pincode) setPickupPincode(String(def.pincode).replace(/\D/g, '').slice(0, 6));
        setTestMsg({
          ok: true,
          text: `Loaded warehouse ${def.address_title || def.id} (id ${def.id})`
        });
      }
    } catch (e) {
      setTestMsg({
        ok: false,
        text: e.response?.data?.message || e.message || 'Failed to load warehouses'
      });
    }
  };

  const sections = [
    {
      title: 'Delivery charges',
      items: [
        {
          id: 'min-order',
          title: 'Minimum order value for delivery',
          description: 'Set a minimum value for orders to be eligible for delivery',
          icon: <ShoppingBag size={20} className="text-blue-500" />,
          kind: 'placeholder'
        },
        {
          id: 'delivery-charge',
          title: 'Delivery charge',
          description: 'Set charges for delivery',
          icon: <Truck size={20} className="text-blue-500" />,
          kind: 'placeholder'
        },
        {
          id: 'cod-charge',
          title: 'Cash on delivery charges',
          description: 'Switch on Cash on Delivery to set charges',
          icon: <Wallet size={20} className="text-blue-500" />,
          kind: 'placeholder'
        }
      ]
    },
    {
      title: 'Shipping',
      items: [
        {
          id: 'delivery-partners',
          title: 'Shipping partners (Shiprocket / Shipmozo)',
          description:
            'Choose which partner handles NEW orders. Existing orders stay on their original partner.',
          icon: <BadgeDollarSign size={20} className="text-blue-500" />,
          kind: 'shipping-partners'
        },
        {
          id: 'pickup-address',
          title: 'Pickup addresses',
          description: 'Set up & manage your pickup addresses',
          icon: <MapPin size={20} className="text-blue-500" />,
          kind: 'placeholder'
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <h1 className="text-2xl text-gray-900 mb-8">Delivery settings</h1>

      <div className="space-y-6">
        {sections.map((section, sIdx) => (
          <div
            key={sIdx}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-200">
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                {section.title}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModal(item)}
                  className="w-full flex items-center cursor-pointer justify-between px-6 py-5 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block">{item.icon}</div>
                    <div>
                      <h3 className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-300 group-hover:text-blue-500 transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg text-gray-900">{activeModal.title}</h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {activeModal.kind === 'shipping-partners' ? (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Active partner is used for <strong>checkout rates and new orders only</strong>.
                    Orders already created on Shiprocket keep processing on Shiprocket after you
                    switch.
                  </p>

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="animate-spin" size={16} /> Loading…
                    </div>
                  ) : fetchError ? (
                    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{fetchError}</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-gray-400">
                          Active partner for new orders
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { id: 'shiprocket', label: 'Shiprocket' },
                            { id: 'shipmozo', label: 'Shipmozo' }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setActiveProvider(opt.id)}
                              className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                                activeProvider === opt.id
                                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-sm font-medium">{opt.label}</div>
                              {opt.id === 'shipmozo' && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                  {shipmozoReady
                                    ? 'Ready'
                                    : `Missing: ${missing.join(', ') || 'setup'}`}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4 space-y-3">
                        <h3 className="text-sm font-medium text-gray-800">Shipmozo setup</h3>

                        <div
                          className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
                            keysConfigured
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-amber-50 text-amber-900'
                          }`}
                        >
                          {keysConfigured ? (
                            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                          ) : (
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                          )}
                          <span>
                            {keysConfigured
                              ? 'API keys configured via server env (SHIPMOZO_PUBLIC_KEY / SHIPMOZO_PRIVATE_KEY). Keys cannot be entered here.'
                              : 'API keys missing in server env. Set SHIPMOZO_PUBLIC_KEY and SHIPMOZO_PRIVATE_KEY, then restart the server.'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-xs text-gray-400">Warehouse ID</label>
                            <input
                              type="text"
                              value={warehouseId}
                              onChange={(e) => setWarehouseId(e.target.value)}
                              className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">
                              Shipmozo pickup pincode (not Shiprocket STORE_PINCODE)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={pickupPincode}
                              onChange={(e) =>
                                setPickupPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleLoadWarehouses}
                            disabled={!keysConfigured}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Load warehouses from Shipmozo
                          </button>
                          <button
                            type="button"
                            disabled={testing || !keysConfigured}
                            onClick={handleTestShipmozo}
                            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {testing ? 'Testing…' : 'Test Shipmozo connection'}
                          </button>
                        </div>
                        {testMsg && (
                          <div
                            className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
                              testMsg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {testMsg.ok ? (
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                            ) : (
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            )}
                            <span>{testMsg.text}</span>
                          </div>
                        )}
                      </div>

                      {saveError && (
                        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" />
                          <span>{saveError}</span>
                        </div>
                      )}
                      {saveOk && (
                        <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                          <span>Saved. New checkouts will use {activeProvider}.</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-6">
                    Configure your{' '}
                    <span className="text-gray-700">{activeModal.title.toLowerCase()}</span>{' '}
                    settings below.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">
                      Amount / Value
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 shrink-0 border-t border-gray-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              {activeModal.kind === 'shipping-partners' ? (
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={handleSaveShippingPartner}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl shadow-md"
                >
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryTab;
