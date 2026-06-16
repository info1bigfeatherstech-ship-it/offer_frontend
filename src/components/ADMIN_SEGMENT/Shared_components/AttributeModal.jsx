import React, { useState } from 'react';

const AttributeModal = ({ onAdd, onClose, initialValue = null }) => {
  const isEditMode = !!initialValue;
  const [newAttribute, setNewAttribute] = useState({
    key: initialValue?.key || '',
    value: initialValue?.value || '',
  });

  const handleAdd = () => {
    if (newAttribute.key && newAttribute.value) {
      onAdd(isEditMode ? { ...newAttribute, id: initialValue.id } : { ...newAttribute, id: Date.now() });
      setNewAttribute({ key: '', value: '' });
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        {/* <h3 className="text-xl font-bold text-gray-900 mb-4">Add Attribute</h3> */}
        <h3 className="text-xl font-bold text-gray-900 mb-4">{isEditMode ? 'Edit Attribute' : 'Add Attribute'}</h3>
        <div className="space-y-4">
          <input
            type="text"
            value={newAttribute.key}
            onChange={(e) => setNewAttribute({ ...newAttribute, key: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg"
            placeholder="Key (e.g., Material)"
            autoFocus
          />
          <input
            type="text"
            value={newAttribute.value}
            onChange={(e) => setNewAttribute({ ...newAttribute, value: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg"
            placeholder="Value (e.g., Cotton)"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isEditMode ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttributeModal;