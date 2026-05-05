


// import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
// import { Loader2, AlertCircle } from "lucide-react";
// import { useNavigate } from "react-router-dom";

// /**
//  * RazorpayCheckout Component
//  *
//  * Payment State Machine (managed by PARENT via paymentState + onPaymentStateChange):
//  *   idle        — before Razorpay opens
//  *   initiated   — Razorpay modal is open, user hasn't acted
//  *   success     — payment handler fired (payment captured by Razorpay)
//  *   failed      — payment.failed event fired
//  *   cancelled   — user closed modal without paying (only when state was "initiated")
//  *
//  * ondismiss behaviour:
//  *   - state === "success"   → do nothing (verification running in background)
//  *   - state === "failed"    → do nothing (already handled by onFailure)
//  *   - state === "initiated" → user cancelled → call onClose
//  *   - anything else         → do nothing (safety fallback)
//  *
//  * Props:
//  *   razorpayOrder        - { id, amount, currency } from backend
//  *   razorpayKey          - Razorpay key_id from backend
//  *   orderId              - Your internal order ID
//  *   totalAmount          - Total amount in INR
//  *   userEmail            - User's email
//  *   userName             - User's full name
//  *   userPhone            - User's phone number
//  *   paymentState         - Current state from parent ("idle"|"initiated"|"success"|"failed"|"cancelled")
//  *   onPaymentStateChange - (newState: string) => void  — parent updates its state
//  *   onSuccess            - (razorpayResponse) => void
//  *   onFailure            - (errorMessage: string) => void
//  *   onClose              - () => void  — called ONLY when user cancels (state was "initiated")
//  */
// const RazorpayCheckout = forwardRef(({
//   razorpayOrder,
//   razorpayKey,
//   orderId,
//   totalAmount,
//   userEmail,
//   userName,
//   userPhone,
//   paymentState,
//   onPaymentStateChange,
//   onSuccess,
//   onFailure,
//   onClose,
// }, ref) => {
//   const razorpayInitialized = useRef(false);
//   const razorpayInstance = useRef(null);
//   // Mirror of paymentState in a ref so event handlers always read latest value
//   // without stale closure issues
//   const paymentStateRef = useRef(paymentState || "idle");

//   // Keep ref in sync with prop
//   useEffect(() => {
//     paymentStateRef.current = paymentState;
//   }, [paymentState]);

//   // Expose closeModal() to parent via ref
//   useImperativeHandle(ref, () => ({
//     closeModal: () => {
//       if (razorpayInstance.current) {
//         try { razorpayInstance.current.close(); } catch (e) { /* ignore */ }
//       }
//     },
//   }));

//   // Load Razorpay script dynamically — idempotent
//   const loadRazorpayScript = () =>
//     new Promise((resolve) => {
//       if (window.Razorpay) { resolve(true); return; }
//       const script = document.createElement("script");
//       script.src = "https://checkout.razorpay.com/v1/checkout.js";
//       script.onload = () => resolve(true);
//       script.onerror = () => resolve(false);
//       document.body.appendChild(script);
//     });

//   useEffect(() => {
//     const initPayment = async () => {
//       if (razorpayInitialized.current) return;

//       if (!razorpayOrder?.id) {
//         console.error("RazorpayCheckout: Missing razorpayOrder.id");
//         onPaymentStateChange?.("failed");
//         onFailure?.("Invalid payment order. Please try again.");
//         return;
//       }
//       if (!razorpayKey) {
//         console.error("RazorpayCheckout: Missing razorpayKey");
//         onPaymentStateChange?.("failed");
//         onFailure?.("Payment gateway not configured. Please try again later.");
//         return;
//       }

//       razorpayInitialized.current = true;

//       const isScriptLoaded = await loadRazorpayScript();
//       if (!isScriptLoaded) {
//         onPaymentStateChange?.("failed");
//         onFailure?.("Failed to load payment gateway. Check your internet connection.");
//         return;
//       }

//       const customerName = userName || userEmail?.split("@")[0] || "Customer";

//       const options = {
//         key: razorpayKey,
//         amount: razorpayOrder.amount,
//         currency: razorpayOrder.currency || "INR",
//         name: "OfferWaleBaba",
//         description: `Order #${orderId}`,
//         image: "/logo.png",
//         order_id: razorpayOrder.id,

//         handler: (response) => {
//           // ── SCENARIO A: Payment succeeded ──────────────────────────────
//           // Set state to "success" SYNCHRONOUSLY before anything async
//           paymentStateRef.current = "success";
//           onPaymentStateChange?.("success");

//           console.log("✅ Razorpay payment captured:", response);

//           // Force-close modal immediately (Razorpay doesn't always auto-close)
//           try { razorpayInstance.current?.close(); } catch (e) { /* ignore */ }

//           // Hand off to parent for backend verification
//           onSuccess?.(response);
//         },

//         prefill: {
//           name: customerName,
//           email: userEmail || "",
//           contact: userPhone || "",
//         },
//         notes: { orderId },
//         theme: { color: "#F7A221" },

//         modal: {
//           ondismiss: () => {
//             const currentState = paymentStateRef.current;
//             console.log(`Razorpay ondismiss fired — paymentState="${currentState}"`);

//             if (currentState === "success") {
//               // ── SCENARIO C: Payment succeeded but modal didn't auto-close ──
//               // User manually closed it — verification is running in background
//               // Do NOT call onClose, do NOT navigate anywhere
//               // Parent is already showing "Verifying payment..." overlay
//               console.log("ondismiss after success — ignoring, verification in progress");
//               return;
//             }

//             if (currentState === "failed") {
//               // Already handled by payment.failed event — do nothing
//               console.log("ondismiss after failure — ignoring, already handled");
//               return;
//             }

//             if (currentState === "initiated") {
//               // ── SCENARIO B: User cancelled without paying ──────────────
//               console.log("ondismiss — user cancelled payment");
//               paymentStateRef.current = "cancelled";
//               onPaymentStateChange?.("cancelled");
//               onClose?.();
//               return;
//             }

//             // Safety fallback — unknown state, treat as cancel
//             console.warn(`ondismiss in unexpected state="${currentState}" — treating as cancel`);
//             onPaymentStateChange?.("cancelled");
//             onClose?.();
//           },
//           escape: true,
//           backdropclose: false,
//         },

//         retry: { enabled: true, retryCount: 2 },

//         config: {
//           display: {
//             blocks: {
//               banks: {
//                 name: "All Payment Methods",
//                 instruments: [
//                   { method: "card" },
//                   { method: "netbanking" },
//                   { method: "upi" },
//                   { method: "wallet" },
//                 ],
//               },
//             },
//             sequence: ["block.banks"],
//             preferences: { show_default_blocks: true },
//           },
//         },
//       };

//       try {
//         razorpayInstance.current = new window.Razorpay(options);

//         razorpayInstance.current.on("payment.failed", (response) => {
//           // ── SCENARIO: Payment explicitly failed ────────────────────────
//           paymentStateRef.current = "failed";
//           onPaymentStateChange?.("failed");

//           console.error("❌ Razorpay payment.failed:", response);
//           const errorMessage =
//             response.error?.description ||
//             response.error?.reason ||
//             "Payment failed. Please try again.";

//           try { razorpayInstance.current?.close(); } catch (e) { /* ignore */ }
//           onFailure?.(errorMessage);
//         });

//         // Mark as initiated just before opening
//         paymentStateRef.current = "initiated";
//         onPaymentStateChange?.("initiated");
//         razorpayInstance.current.open();

//       } catch (error) {
//         console.error("Razorpay initialization error:", error);
//         paymentStateRef.current = "failed";
//         onPaymentStateChange?.("failed");
//         onFailure?.("Failed to initialize payment. Please try again.");
//       }
//     };

//     initPayment();

//     return () => {
//       razorpayInitialized.current = false;
//       // Only close if payment was NOT completed (success or failed already handled)
//       if (
//         razorpayInstance.current &&
//         paymentStateRef.current !== "success" &&
//         paymentStateRef.current !== "failed"
//       ) {
//         try { razorpayInstance.current.close(); } catch (e) { /* ignore */ }
//       }
//       razorpayInstance.current = null;
//         const rzpBanner = document.querySelector(".razorpay-container");
//   if (rzpBanner) rzpBanner.remove();
//   const rzpBackdrop = document.querySelector(".razorpay-backdrop");
//   if (rzpBackdrop) rzpBackdrop.remove();
//     };
//   }, []); // Run once — options captured via refs

//   return null; // No UI — Razorpay renders its own modal
// });

// RazorpayCheckout.displayName = "RazorpayCheckout";

// // ─────────────────────────────────────────────────────────────────────────────
// // PaymentErrorModal
// // ─────────────────────────────────────────────────────────────────────────────
// export const PaymentErrorModal = ({ error, onRetry, onClose, orderId }) => {
//   const navigate = useNavigate();
//   return (
//     <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
//       <div className="relative bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl text-center">
//         <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
//           <AlertCircle size={28} className="text-red-500" />
//         </div>
//         <h3 className="text-xl font-black text-gray-900 mb-2">Payment Failed</h3>
//         <p className="text-sm text-gray-500 font-medium mb-6">
//           {error || "Something went wrong with your payment. Please try again."}
//         </p>
//         <div className="flex gap-3">
//           <button
//             onClick={onClose}
//             className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-xs uppercase tracking-widest hover:border-black transition-all cursor-pointer"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={() => {
//               navigate("/account/userorders", {
//                 state: { openOrderId: orderId },
//               });
//               onClose();
//             }}
//             className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // PaymentLoadingModal
// // ─────────────────────────────────────────────────────────────────────────────
// export const PaymentLoadingModal = ({ message }) => (
//   <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
//     <div className="relative bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl text-center">
//       <div className="flex flex-col items-center gap-4">
//         <Loader2 size={32} className="animate-spin text-[#F7A221]" />
//         <p className="text-sm font-black text-gray-900">{message || "Processing payment..."}</p>
//         <p className="text-[11px] text-gray-400">Please do not close this window</p>
//       </div>
//     </div>
//   </div>
// );

// export default RazorpayCheckout;




//tamanna
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
 
let razorpayScriptLoadPromise = null;

const ensureRazorpayScript = () => {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptLoadPromise) return razorpayScriptLoadPromise;

  razorpayScriptLoadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  }).finally(() => {
    if (!window.Razorpay) {
      razorpayScriptLoadPromise = null;
    }
  });

  return razorpayScriptLoadPromise;
};

/**
 * RazorpayCheckout Component - FIXED: Removed deprecated config.display
 *
 * Payment State Machine (managed by PARENT via paymentState + onPaymentStateChange):
 *   idle        — before Razorpay opens
 *   initiated   — Razorpay modal is open, user hasn't acted
 *   success     — payment handler fired (payment captured by Razorpay)
 *   failed      — payment.failed event fired
 *   cancelled   — user closed modal without paying (only when state was "initiated")
 *
 * Props:
 *   razorpayOrder        - { id, amount, currency } from backend
 *   razorpayKey          - Razorpay key_id from backend
 *   orderId              - Your internal order ID
 *   totalAmount          - Total amount in INR
 *   userEmail            - User's email
 *   userName             - User's full name
 *   userPhone            - User's phone number
 *   paymentState         - Current state from parent ("idle"|"initiated"|"success"|"failed"|"cancelled")
 *   onPaymentStateChange - (newState: string) => void
 *   onSuccess            - (razorpayResponse) => void
 *   onFailure            - (errorMessage: string) => void
 *   onClose              - () => void — called ONLY when user cancels (state was "initiated")
 */
const RazorpayCheckout = forwardRef(({
  razorpayOrder,
  razorpayKey,
  orderId,
  totalAmount,
  userEmail,
  userName,
  userPhone,
  paymentState,
  onPaymentStateChange,
  onSuccess,
  onFailure,
  onClose,
}, ref) => {
  const razorpayInitialized = useRef(false);
  const razorpayInstance = useRef(null);
  const paymentStateRef = useRef(paymentState || "idle");
 
  // Keep ref in sync with prop
  useEffect(() => {
    paymentStateRef.current = paymentState;
  }, [paymentState]);
 
  // Expose closeModal() to parent via ref
  useImperativeHandle(ref, () => ({
    closeModal: () => {
      if (razorpayInstance.current) {
        try { razorpayInstance.current.close(); } catch (e) { /* ignore */ }
      }
    },
  }));
 
  useEffect(() => {
    const initPayment = async () => {
      if (razorpayInitialized.current) return;
 
      if (!razorpayOrder?.id) {
        console.error("RazorpayCheckout: Missing razorpayOrder.id");
        onPaymentStateChange?.("failed");
        onFailure?.("Invalid payment order. Please try again.");
        return;
      }
      if (!razorpayKey) {
        console.error("RazorpayCheckout: Missing razorpayKey");
        onPaymentStateChange?.("failed");
        onFailure?.("Payment gateway not configured. Please try again later.");
        return;
      }
 
      razorpayInitialized.current = true;
 
      const isScriptLoaded = await ensureRazorpayScript();
      if (!isScriptLoaded) {
        onPaymentStateChange?.("failed");
        onFailure?.("Failed to load payment gateway. Check your internet connection.");
        return;
      }
      const customerName = userName || userEmail?.split("@")[0] || "Customer";
 
      // FIXED: Removed the deprecated config.display block that was causing "Browser not supported" error
      // The config object has been completely removed as it's not supported in standard checkout
      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "OfferWaleBaba",
        description: `Order #${orderId}`,
        image: "/logo.png",
        order_id: razorpayOrder.id,
 
        handler: (response) => {
          // Payment succeeded
          paymentStateRef.current = "success";
          onPaymentStateChange?.("success");
 
          console.log("✅ Razorpay payment captured:", response);
 
          // Force-close modal immediately
          try { razorpayInstance.current?.close(); } catch (e) { /* ignore */ }
 
          // Hand off to parent for backend verification
          onSuccess?.(response);
        },
 
        prefill: {
          name: customerName,
          email: userEmail || "",
          contact: userPhone || "",
        },
        notes: { orderId },
        theme: { color: "#F7A221" },
 
        modal: {
          ondismiss: () => {
            const currentState = paymentStateRef.current;
            console.log(`Razorpay ondismiss fired — paymentState="${currentState}"`);
 
            if (currentState === "success") {
              // Payment succeeded but modal didn't auto-close
              console.log("ondismiss after success — ignoring, verification in progress");
              return;
            }
 
            if (currentState === "failed") {
              // Already handled by payment.failed event
              console.log("ondismiss after failure — ignoring, already handled");
              return;
            }
 
            if (currentState === "initiated") {
              // User cancelled without paying
              console.log("ondismiss — user cancelled payment");
              paymentStateRef.current = "cancelled";
              onPaymentStateChange?.("cancelled");
              onClose?.();
              return;
            }
 
            // Safety fallback
            console.warn(`ondismiss in unexpected state="${currentState}" — treating as cancel`);
            onPaymentStateChange?.("cancelled");
            onClose?.();
          },
          escape: true,
          backdropclose: false,
        },
 
        retry: { enabled: true, retryCount: 2 },
      };
 
      try {
        razorpayInstance.current = new window.Razorpay(options);
 
        razorpayInstance.current.on("payment.failed", (response) => {
          // Payment explicitly failed
          paymentStateRef.current = "failed";
          onPaymentStateChange?.("failed");
 
          console.error("❌ Razorpay payment.failed:", response);
          const errorMessage =
            response.error?.description ||
            response.error?.reason ||
            "Payment failed. Please try again.";
 
          try { razorpayInstance.current?.close(); } catch (e) { /* ignore */ }
          onFailure?.(errorMessage);
        });
 
        // Mark as initiated just before opening
        paymentStateRef.current = "initiated";
        onPaymentStateChange?.("initiated");
        razorpayInstance.current.open();
 
      } catch (error) {
        console.error("Razorpay initialization error:", error);
        paymentStateRef.current = "failed";
        onPaymentStateChange?.("failed");
        onFailure?.("Failed to initialize payment. Please try again.");
      }
    };
 
    initPayment();
 
    return () => {
      razorpayInitialized.current = false;
      // Only close if payment was NOT completed
      if (
        razorpayInstance.current &&
        paymentStateRef.current !== "success" &&
        paymentStateRef.current !== "failed"
      ) {
        try { razorpayInstance.current.close(); } catch (e) { /* ignore */ }
      }
      razorpayInstance.current = null;
    };
  }, []); // Run once — options captured via refs
 
  return null;
});
 
RazorpayCheckout.displayName = "RazorpayCheckout";
 
// ─────────────────────────────────────────────────────────────────────────────
// PaymentErrorModal
// ─────────────────────────────────────────────────────────────────────────────
export const PaymentErrorModal = ({ error, onRetry, onClose, orderId }) => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Payment Failed</h3>
        <p className="text-sm text-gray-500 font-medium mb-6">
          {error || "Something went wrong with your payment. Please try again."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-xs uppercase tracking-widest hover:border-black transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              navigate("/account/userorders", {
                state: { openOrderId: orderId },
              });
              onClose();
            }}
            className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};
 
// ─────────────────────────────────────────────────────────────────────────────
// PaymentLoadingModal
// ─────────────────────────────────────────────────────────────────────────────
export const PaymentLoadingModal = ({ message }) => (
  <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    <div className="relative bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl text-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={32} className="animate-spin text-[#F7A221]" />
        <p className="text-sm font-black text-gray-900">{message || "Processing payment..."}</p>
        <p className="text-[11px] text-gray-400">Please do not close this window</p>
      </div>
    </div>
  </div>
);
 
export default RazorpayCheckout;
 



// import React, { useEffect, useRef } from "react";
// import { useDispatch } from "react-redux";
// import { Loader2, AlertCircle, X } from "lucide-react";

// /**
//  * RazorpayCheckout Component
//  * 
//  * Props:
//  *   razorpayOrder   - { id, amount, currency } from backend
//  *   razorpayKey     - Razorpay key_id from backend
//  *   orderId         - Your order ID
//  *   totalAmount     - Total amount in INR
//  *   userEmail       - User's email
//  *   userName        - User's full name
//  *   userPhone       - User's phone number
//  *   onSuccess       - Callback on successful payment
//  *   onFailure       - Callback on payment failure
//  *   onClose         - Callback when modal is closed
//  *   onRetry         - Callback to retry payment
//  */
// const RazorpayCheckout = ({
//   razorpayOrder,
//   razorpayKey,
//   orderId,
//   totalAmount,
//   userEmail,
//   userName,
//   userPhone,
//   onSuccess,
//   onFailure,
//   onClose,
//   onRetry,
// }) => {
//   const dispatch = useDispatch();
//   const razorpayInitialized = useRef(false);
//   const razorpayInstance = useRef(null);

//   // Load Razorpay script dynamically
//   const loadRazorpayScript = () => {
//     return new Promise((resolve) => {
//       if (window.Razorpay) {
//         resolve(true);
//         return;
//       }
//       const script = document.createElement("script");
//       script.src = "https://checkout.razorpay.com/v1/checkout.js";
//       script.onload = () => resolve(true);
//       script.onerror = () => resolve(false);
//       document.body.appendChild(script);
//     });
//   };

//   useEffect(() => {
//     const initPayment = async () => {
//       // Prevent double initialization
//       if (razorpayInitialized.current) return;

//       // Validate required props
//       if (!razorpayOrder?.id) {
//         console.error("RazorpayCheckout: Missing razorpayOrder.id");
//         onFailure?.("Invalid payment order. Please try again.");
//         return;
//       }

//       if (!razorpayKey) {
//         console.error("RazorpayCheckout: Missing razorpayKey");
//         onFailure?.("Payment gateway not configured. Please try again later.");
//         return;
//       }

//       razorpayInitialized.current = true;

//       // Load Razorpay script
//       const isScriptLoaded = await loadRazorpayScript();
//       if (!isScriptLoaded) {
//         onFailure?.("Failed to load payment gateway. Please check your internet connection.");
//         return;
//       }

//       // Prepare customer name
//       const customerName = userName || userEmail?.split("@")[0] || "Customer";

//       const options = {
//         key: razorpayKey,
//         amount: razorpayOrder.amount,
//         currency: razorpayOrder.currency || "INR",
//         name: "Your Store Name",
//         description: `Order #${orderId}`,
//         image: "/logo.png", // Optional: Add your store logo URL
//         order_id: razorpayOrder.id,
//         handler: async (response) => {
//           // Payment successful - response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
//           console.log("Razorpay payment response:", response);
//           onSuccess?.(response);
//         },
//         prefill: {
//           name: customerName,
//           email: userEmail || "",
//           contact: userPhone || "",
//         },
//         notes: {
//           orderId: orderId,
//         },
//         theme: {
//           color: "#F7A221",
//         },
//         modal: {
//           ondismiss: () => {
//             console.log("Razorpay modal closed by user");
//             onClose?.();
//           },
//           escape: true,
//           backdropclose: false,
//         },
//         retry: {
//           enabled: true,
//           retryCount: 2,
//         },
//         config: {
//           display: {
//             blocks: {
//               banks: {
//                 name: "All Payment Methods",
//                 instruments: [
//                   { method: "card" },
//                   { method: "netbanking" },
//                   { method: "upi" },
//                   { method: "wallet" },
//                 ],
//               },
//             },
//             sequence: ["block.banks"],
//             preferences: {
//               show_default_blocks: true,
//             },
//           },
//         },
//       };

//       try {
//         razorpayInstance.current = new window.Razorpay(options);
        
//         // Add event listeners for better error handling
//         razorpayInstance.current.on("payment.failed", (response) => {
//           console.error("Razorpay payment failed:", response);
//           const errorMessage = response.error?.description || response.error?.reason || "Payment failed. Please try again.";
//           onFailure?.(errorMessage);
//         });

//         razorpayInstance.current.open();
//       } catch (error) {
//         console.error("Razorpay initialization error:", error);
//         onFailure?.("Failed to initialize payment. Please try again.");
//       }
//     };

//     initPayment();

//     // Cleanup
//     return () => {
//       if (razorpayInstance.current) {
//         // Razorpay doesn't have a close method, but we can clean up references
//         razorpayInstance.current = null;
//       }
//       razorpayInitialized.current = false;
//     };
//   }, [razorpayOrder, razorpayKey, orderId, userName, userEmail, userPhone, onSuccess, onFailure, onClose]);

//   // This component doesn't render anything visible
//   // It just opens the Razorpay modal
//   return null;
// };

// // Error Modal Component - shown when payment fails
// export const PaymentErrorModal = ({ error, onRetry, onClose }) => (
//   <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
//     <div className="relative bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl text-center">
//       <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
//         <AlertCircle size={28} className="text-red-500" />
//       </div>
//       <h3 className="text-xl font-black text-gray-900 mb-2">Payment Failed</h3>
//       <p className="text-sm text-gray-500 font-medium mb-6">
//         {error || "Something went wrong with your payment. Please try again."}
//       </p>
//       <div className="flex gap-3">
//         <button
//           onClick={onClose}
//           className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-xs uppercase tracking-widest hover:border-black transition-all cursor-pointer"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={onRetry}
//           className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//         >
//           Try Again
//         </button>
//       </div>
//     </div>
//   </div>
// );

// // Loading Modal - shown while processing
// export const PaymentLoadingModal = ({ message }) => (
//   <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
//     <div className="relative bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl text-center">
//       <div className="flex flex-col items-center gap-4">
//         <Loader2 size={32} className="animate-spin text-[#F7A221]" />
//         <p className="text-sm font-black text-gray-900">{message || "Processing payment..."}</p>
//         <p className="text-[11px] text-gray-400">Please do not close this window</p>
//       </div>
//     </div>
//   </div>
// );

// export default RazorpayCheckout;




// 
// import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
// import { Loader2, AlertCircle } from "lucide-react";

/**
 * RazorpayCheckout Component
 *
 * Props:
 *   razorpayOrder   - { id, amount, currency } from backend
 *   razorpayKey     - Razorpay key_id from backend
 *   orderId         - Your order ID
 *   totalAmount     - Total amount in INR
 *   userEmail       - User's email
 *   userName        - User's full name
 *   userPhone       - User's phone number
 *   onSuccess       - Callback on successful payment
 *   onFailure       - Callback on payment failure
 *   onClose         - Callback when modal is closed by user (no payment)
 *
 * Ref methods (via forwardRef):
 *   ref.current.closeModal() — imperatively close the Razorpay modal from parent
 */
// const RazorpayCheckout = forwardRef(({
//   razorpayOrder,
//   razorpayKey,
//   orderId,
//   totalAmount,
//   userEmail,
//   userName,
//   userPhone,
//   onSuccess,
//   onFailure,
//   onClose,
// }, ref) => {
//   const razorpayInitialized = useRef(false);
//   const razorpayInstance = useRef(null);
//   const paymentCompleted = useRef(false); // Tracks if payment was attempted (success or failure)
//   const paymentSucceeded = useRef(false); // Tracks if payment was successful

//   // Expose closeModal() to parent via ref
//   useImperativeHandle(ref, () => ({
//     closeModal: () => {
//       if (razorpayInstance.current) {
//         try {
//           razorpayInstance.current.close();
//         } catch (e) {
//           // ignore
//         }
//       }
//     }
//   }));

//   // Load Razorpay script dynamically
//   const loadRazorpayScript = () => {
//     return new Promise((resolve) => {
//       if (window.Razorpay) {
//         resolve(true);
//         return;
//       }
//       const script = document.createElement("script");
//       script.src = "https://checkout.razorpay.com/v1/checkout.js";
//       script.onload = () => resolve(true);
//       script.onerror = () => resolve(false);
//       document.body.appendChild(script);
//     });
//   };

//   useEffect(() => {
//     const initPayment = async () => {
//       if (razorpayInitialized.current) return;

//       if (!razorpayOrder?.id) {
//         console.error("RazorpayCheckout: Missing razorpayOrder.id");
//         onFailure?.("Invalid payment order. Please try again.");
//         return;
//       }

//       if (!razorpayKey) {
//         console.error("RazorpayCheckout: Missing razorpayKey");
//         onFailure?.("Payment gateway not configured. Please try again later.");
//         return;
//       }

//       razorpayInitialized.current = true;

//       const isScriptLoaded = await loadRazorpayScript();
//       if (!isScriptLoaded) {
//         onFailure?.("Failed to load payment gateway. Please check your internet connection.");
//         return;
//       }

//       const customerName = userName || userEmail?.split("@")[0] || "Customer";

//       const options = {
//         key: razorpayKey,
//         amount: razorpayOrder.amount,
//         currency: razorpayOrder.currency || "INR",
//         name: "Your Store Name",
//         description: `Order #${orderId}`,
//         image: "/logo.png",
//         order_id: razorpayOrder.id,
//         handler: (response) => {
//           // CRITICAL: Set flags FIRST before ANYTHING else
//           paymentCompleted.current = true;
//           paymentSucceeded.current = true;
          
//           console.log("Razorpay payment response:", response);

//           // CRITICAL: Force close the modal IMMEDIATELY
//           // Razorpay does NOT auto-close reliably after handler
//           try {
//             if (razorpayInstance.current) {
//               razorpayInstance.current.close();
//             }
//           } catch (e) {
//             console.warn("Error closing Razorpay modal:", e);
//           }

//           // Now call onSuccess callback
//           onSuccess?.(response);
//         },
//         prefill: {
//           name: customerName,
//           email: userEmail || "",
//           contact: userPhone || "",
//         },
//         notes: {
//           orderId: orderId,
//         },
//         theme: {
//           color: "#F7A221",
//         },
//         modal: {
//           ondismiss: () => {
//             // Only call onClose if:
//             // 1. Payment was NOT successful (paymentSucceeded.current === false)
//             // 2. AND payment was NOT already completed (to avoid double calls)
//             if (!paymentSucceeded.current && !paymentCompleted.current) {
//               console.log("Razorpay modal closed by user without payment");
//               onClose?.();
//             } else {
//               console.log("Razorpay modal closed after payment completion — ignoring onClose");
//             }
//           },
//           escape: true,
//           backdropclose: false,
//         },
//         retry: {
//           enabled: true,
//           retryCount: 2,
//         },
//         config: {
//           display: {
//             blocks: {
//               banks: {
//                 name: "All Payment Methods",
//                 instruments: [
//                   { method: "card" },
//                   { method: "netbanking" },
//                   { method: "upi" },
//                   { method: "wallet" },
//                 ],
//               },
//             },
//             sequence: ["block.banks"],
//             preferences: {
//               show_default_blocks: true,
//             },
//           },
//         },
//       };

//       try {
//         razorpayInstance.current = new window.Razorpay(options);

//         razorpayInstance.current.on("payment.failed", (response) => {
//           // Mark that payment was attempted (failed)
//           paymentCompleted.current = true;
//           paymentSucceeded.current = false;
          
//           console.error("Razorpay payment failed:", response);
//           const errorMessage =
//             response.error?.description ||
//             response.error?.reason ||
//             "Payment failed. Please try again.";
          
//           // Close modal on failure too
//           try {
//             razorpayInstance.current?.close();
//           } catch (e) {
//             // ignore
//           }
          
//           onFailure?.(errorMessage);
//         });

//         razorpayInstance.current.open();
//       } catch (error) {
//         console.error("Razorpay initialization error:", error);
//         onFailure?.("Failed to initialize payment. Please try again.");
//       }
//     };

//     initPayment();

//     return () => {
//       razorpayInitialized.current = false;
//       // Cleanup: close modal if still open
//       if (razorpayInstance.current && !paymentCompleted.current) {
//         try {
//           razorpayInstance.current.close();
//         } catch (e) {
//           // ignore
//         }
//       }
//       razorpayInstance.current = null;
//     };
//   }, []); // Empty dependency array - run once

//   return null;
// });

// RazorpayCheckout.displayName = "RazorpayCheckout";

// // ─────────────────────────────────────────────────────────────────────────────
// // PaymentErrorModal
// // ─────────────────────────────────────────────────────────────────────────────
// export const PaymentErrorModal = ({ error, onRetry, onClose }) => (
//   <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
//     <div className="relative bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl text-center">
//       <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
//         <AlertCircle size={28} className="text-red-500" />
//       </div>
//       <h3 className="text-xl font-black text-gray-900 mb-2">Payment Failed</h3>
//       <p className="text-sm text-gray-500 font-medium mb-6">
//         {error || "Something went wrong with your payment. Please try again."}
//       </p>
//       <div className="flex gap-3">
//         <button
//           onClick={onClose}
//           className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-xs uppercase tracking-widest hover:border-black transition-all cursor-pointer"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={onRetry}
//           className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//         >
//           Try Again
//         </button>
//       </div>
//     </div>
//   </div>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // PaymentLoadingModal
// // ─────────────────────────────────────────────────────────────────────────────
// export const PaymentLoadingModal = ({ message }) => (
//   <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
//     <div className="relative bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl text-center">
//       <div className="flex flex-col items-center gap-4">
//         <Loader2 size={32} className="animate-spin text-[#F7A221]" />
//         <p className="text-sm font-black text-gray-900">{message || "Processing payment..."}</p>
//         <p className="text-[11px] text-gray-400">Please do not close this window</p>
//       </div>
//     </div>
//   </div>
// );

// export default RazorpayCheckout;
// // 






// use the down code 
// import React, { useEffect, useRef } from "react";
// import { useDispatch } from "react-redux";
// import { Loader2, AlertCircle, X } from "lucide-react";

// /**
//  * RazorpayCheckout Component
//  * 
//  * Props:
//  *   razorpayOrder   - { id, amount, currency } from backend
//  *   razorpayKey     - Razorpay key_id from backend
//  *   orderId         - Your order ID
//  *   totalAmount     - Total amount in INR
//  *   userEmail       - User's email
//  *   userName        - User's full name
//  *   userPhone       - User's phone number
//  *   onSuccess       - Callback on successful payment
//  *   onFailure       - Callback on payment failure
//  *   onClose         - Callback when modal is closed
//  *   onRetry         - Callback to retry payment
//  */
// const RazorpayCheckout = ({
//   razorpayOrder,
//   razorpayKey,
//   orderId,
//   totalAmount,
//   userEmail,
//   userName,
//   userPhone,
//   onSuccess,
//   onFailure,
//   onClose,
//   onRetry,
// }) => {
//   const dispatch = useDispatch();
//   const razorpayInitialized = useRef(false);
//   const razorpayInstance = useRef(null);

//   // Load Razorpay script dynamically
//   const loadRazorpayScript = () => {
//     return new Promise((resolve) => {
//       if (window.Razorpay) {
//         resolve(true);
//         return;
//       }
//       const script = document.createElement("script");
//       script.src = "https://checkout.razorpay.com/v1/checkout.js";
//       script.onload = () => resolve(true);
//       script.onerror = () => resolve(false);
//       document.body.appendChild(script);
//     });
//   };

//   useEffect(() => {
//     const initPayment = async () => {
//       // Prevent double initialization
//       if (razorpayInitialized.current) return;

//       // Validate required props
//       if (!razorpayOrder?.id) {
//         console.error("RazorpayCheckout: Missing razorpayOrder.id");
//         onFailure?.("Invalid payment order. Please try again.");
//         return;
//       }

//       if (!razorpayKey) {
//         console.error("RazorpayCheckout: Missing razorpayKey");
//         onFailure?.("Payment gateway not configured. Please try again later.");
//         return;
//       }

//       razorpayInitialized.current = true;

//       // Load Razorpay script
//       const isScriptLoaded = await loadRazorpayScript();
//       if (!isScriptLoaded) {
//         onFailure?.("Failed to load payment gateway. Please check your internet connection.");
//         return;
//       }

//       // Prepare customer name
//       const customerName = userName || userEmail?.split("@")[0] || "Customer";

//       const options = {
//         key: razorpayKey,
//         amount: razorpayOrder.amount,
//         currency: razorpayOrder.currency || "INR",
//         name: "Your Store Name",
//         description: `Order #${orderId}`,
//         image: "/logo.png", // Optional: Add your store logo URL
//         order_id: razorpayOrder.id,
//         handler: async (response) => {
//           // Payment successful - response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
//           console.log("Razorpay payment response:", response);
//           onSuccess?.(response);
//         },
//         prefill: {
//           name: customerName,
//           email: userEmail || "",
//           contact: userPhone || "",
//         },
//         notes: {
//           orderId: orderId,
//         },
//         theme: {
//           color: "#F7A221",
//         },
//         modal: {
//           ondismiss: () => {
//             console.log("Razorpay modal closed by user");
//             onClose?.();
//           },
//           escape: true,
//           backdropclose: false,
//         },
//         retry: {
//           enabled: true,
//           retryCount: 2,
//         },
//         config: {
//           display: {
//             blocks: {
//               banks: {
//                 name: "All Payment Methods",
//                 instruments: [
//                   { method: "card" },
//                   { method: "netbanking" },
//                   { method: "upi" },
//                   { method: "wallet" },
//                 ],
//               },
//             },
//             sequence: ["block.banks"],
//             preferences: {
//               show_default_blocks: true,
//             },
//           },
//         },
//       };

//       try {
//         razorpayInstance.current = new window.Razorpay(options);
        
//         // Add event listeners for better error handling
//         razorpayInstance.current.on("payment.failed", (response) => {
//           console.error("Razorpay payment failed:", response);
//           const errorMessage = response.error?.description || response.error?.reason || "Payment failed. Please try again.";
//           onFailure?.(errorMessage);
//         });

//         razorpayInstance.current.open();
//       } catch (error) {
//         console.error("Razorpay initialization error:", error);
//         onFailure?.("Failed to initialize payment. Please try again.");
//       }
//     };

//     initPayment();

//     // Cleanup
//     return () => {
//       if (razorpayInstance.current) {
//         // Razorpay doesn't have a close method, but we can clean up references
//         razorpayInstance.current = null;
//       }
//       razorpayInitialized.current = false;
//     };
//   }, [razorpayOrder, razorpayKey, orderId, userName, userEmail, userPhone, onSuccess, onFailure, onClose]);

//   // This component doesn't render anything visible
//   // It just opens the Razorpay modal
//   return null;
// };

// // Error Modal Component - shown when payment fails
// export const PaymentErrorModal = ({ error, onRetry, onClose }) => (
//   <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
//     <div className="relative bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl text-center">
//       <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
//         <AlertCircle size={28} className="text-red-500" />
//       </div>
//       <h3 className="text-xl font-black text-gray-900 mb-2">Payment Failed</h3>
//       <p className="text-sm text-gray-500 font-medium mb-6">
//         {error || "Something went wrong with your payment. Please try again."}
//       </p>
//       <div className="flex gap-3">
//         <button
//           onClick={onClose}
//           className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-xs uppercase tracking-widest hover:border-black transition-all cursor-pointer"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={onRetry}
//           className="flex-1 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#F7A221] hover:text-black transition-all cursor-pointer"
//         >
//           Try Again
//         </button>
//       </div>
//     </div>
//   </div>
// );

// // Loading Modal - shown while processing
// export const PaymentLoadingModal = ({ message }) => (
//   <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
//     <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
//     <div className="relative bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl text-center">
//       <div className="flex flex-col items-center gap-4">
//         <Loader2 size={32} className="animate-spin text-[#F7A221]" />
//         <p className="text-sm font-black text-gray-900">{message || "Processing payment..."}</p>
//         <p className="text-[11px] text-gray-400">Please do not close this window</p>
//       </div>
//     </div>
//   </div>
// );

// export default RazorpayCheckout;