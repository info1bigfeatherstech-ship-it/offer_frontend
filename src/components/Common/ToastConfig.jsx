import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { X, Check } from "lucide-react";

const CloseButton = ({ closeToast }) => (
  <button
    onClick={closeToast}
    className="ml-4 p-1 hover:bg-white/10 rounded-md transition-all active:scale-90"
  >
    <X size={14} className="text-gray-500" />
  </button>
);

const ToastConfig = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={200}  // 0.2 seconds = 200 milliseconds
      hideProgressBar={false}
      newestOnTop
      closeOnClick={false}
      pauseOnHover
      draggable
      theme="dark"
      closeButton={CloseButton}
      icon={({ type }) => (
        <div className="flex items-center justify-center w-6 h-6 bg-[#F7A221] rounded-lg shadow-[0_0_10px_rgba(247,162,33,0.3)]">
          <Check size={14} strokeWidth={4} className="text-black" />
        </div>
      )}
      toastClassName={() =>
        "relative flex items-center p-4 mb-4 bg-black border border-white/10 rounded-[12px] shadow-[20px_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
      }
      bodyClassName={() =>
        "flex-1 text-[13px] font-black uppercase tracking-tighter text-white m-0 p-0 pl-3 leading-none"
      }
      progressClassName="!bg-[#F7A221] !h-[4px] !opacity-100"
    />
  );
};

export default ToastConfig;
