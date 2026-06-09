


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
import storeLogo from "../../../assets/logo2.svg";

/** Razorpay checkout runs in a cross-origin iframe; Chrome blocks loopback/private image URLs (LNA). */
const resolveRazorpayBrandImageUrl = (viteAssetUrl) => {
  if (typeof window === "undefined" || !viteAssetUrl) return undefined;
  const { hostname, protocol } = window.location;
  const isLocalNetwork =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /\.local$/i.test(hostname);
  if (isLocalNetwork || protocol !== "https:") return undefined;
  return viteAssetUrl;
};

let razorpayScriptLoadPromise = null;
let activeRazorpayInstance = null;
let lastRazorpayClosedAt = 0;
let razorpaySessionGeneration = 0;
let razorpayPreparedGeneration = -1;
let razorpayDismissFinalizedGeneration = -1;

/** ~45 frames ≈ 750ms cap — only wait while Razorpay DOM is still visible. */
const RAZORPAY_DOM_WAIT_MAX_FRAMES = 45;

const countRazorpayDom = () => {
  if (typeof document === "undefined") return {};
  return {
    containers: document.querySelectorAll(".razorpay-container").length,
    backdrops: document.querySelectorAll(".razorpay-backdrop").length,
    iframes: document.querySelectorAll('iframe[src*="razorpay.com"]').length,
    spinners: document.querySelectorAll(".razorpay-body-spinner").length,
  };
};
// #endregion

const removeRazorpayDomArtifacts = () => {
  if (typeof document === "undefined") return;

  document
    .querySelectorAll(
      [
        ".razorpay-container",
        ".razorpay-backdrop",
        ".razorpay-body-spinner",
        'iframe[src*="razorpay.com"]',
        'iframe[name*="razorpay"]',
        'div[id*="razorpay"]',
      ].join(", ")
    )
    .forEach((node) => node.remove());

  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
};

const hasRazorpayDomArtifacts = () => {
  const dom = countRazorpayDom();
  return (
    (dom.containers || 0) +
      (dom.backdrops || 0) +
      (dom.iframes || 0) +
      (dom.spinners || 0) >
    0
  );
};

/** Let Razorpay finish its own afterClose before we touch DOM (avoids replaceChild null). */
const waitForRazorpayDomGone = (maxFrames = RAZORPAY_DOM_WAIT_MAX_FRAMES) =>
  new Promise((resolve) => {
    let frames = 0;
    const tick = () => {
      const dom = countRazorpayDom();
      const stillPresent = hasRazorpayDomArtifacts();
      if (!stillPresent || frames >= maxFrames) {
        resolve({ frames, dom, forced: stillPresent && frames >= maxFrames });
        return;
      }
      frames += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

/** Mimics full page refresh for Razorpay only — fixes corrupted window.Razorpay singleton. */
const hardResetRazorpayScript = () =>
  new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    document
      .querySelectorAll('script[src*="checkout.razorpay.com"]')
      .forEach((node) => node.remove());
    razorpayScriptLoadPromise = null;
    try {
      delete window.Razorpay;
    } catch {
      window.Razorpay = undefined;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/** Call when user dismisses / closes Razorpay — never remove DOM here. */
export const markRazorpaySessionClosed = () => {
  activeRazorpayInstance = null;
  lastRazorpayClosedAt = Date.now();
  razorpaySessionGeneration += 1;
};

/** Cancel path only: wait for Razorpay afterClose, then clear leftover DOM (no script reload). */
export const finalizeRazorpayDismiss = async () => {
  await waitForRazorpayDomGone();
  removeRazorpayDomArtifacts();
  razorpayDismissFinalizedGeneration = razorpaySessionGeneration;
};

/** Before second+ open: reload checkout.js (DOM already cleared on dismiss). */
export const prepareRazorpayCheckoutSession = async () => {
  if (typeof window === "undefined") return;

  const needsReset = lastRazorpayClosedAt > 0;
  if (!needsReset) return;

  if (razorpayDismissFinalizedGeneration !== razorpaySessionGeneration) {
    await waitForRazorpayDomGone();
    removeRazorpayDomArtifacts();
    razorpayDismissFinalizedGeneration = razorpaySessionGeneration;
  }

  await hardResetRazorpayScript();
  razorpayPreparedGeneration = razorpaySessionGeneration;
};

/** Hard reset — only when checkout never opened or init failed. */
export const destroyRazorpayCheckoutSession = () => {
  if (activeRazorpayInstance) {
    try {
      activeRazorpayInstance.close();
    } catch {
      /* ignore */
    }
    activeRazorpayInstance = null;
  }
  markRazorpaySessionClosed();
};

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
 *   onRecoveryStart      - () => void — called when user cancels, before async cleanup
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
  onRecoveryStart,
}, ref) => {
  const razorpayInitialized = useRef(false);
  const razorpayInstance = useRef(null);
  const paymentStateRef = useRef(paymentState || "idle");
  const onRecoveryStartRef = useRef(onRecoveryStart);

  useEffect(() => {
    paymentStateRef.current = paymentState;
  }, [paymentState]);

  useEffect(() => {
    onRecoveryStartRef.current = onRecoveryStart;
  }, [onRecoveryStart]);
 
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

      if (razorpayPreparedGeneration !== razorpaySessionGeneration) {
        await prepareRazorpayCheckoutSession();
      }

      const isScriptLoaded = await ensureRazorpayScript();
      if (!isScriptLoaded) {
        onPaymentStateChange?.("failed");
        onFailure?.("Failed to load payment gateway. Check your internet connection.");
        return;
      }
      const customerName = userName || userEmail?.split("@")[0] || "Customer";
      const brandImageUrl = resolveRazorpayBrandImageUrl(storeLogo);

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "OfferWaleBaba",
        description: `Payment for Order ${orderId}`,
        order_id: razorpayOrder.id,
 
        handler: (response) => {
          // Payment succeeded
          paymentStateRef.current = "success";
          onPaymentStateChange?.("success");
 
          console.log("✅ Razorpay payment captured:", response);
 
          try { razorpayInstance.current?.close(); } catch (e) { /* ignore */ }
          razorpayInstance.current = null;
          markRazorpaySessionClosed();

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
              onRecoveryStartRef.current?.();
              paymentStateRef.current = "cancelled";
              onPaymentStateChange?.("cancelled");
              razorpayInstance.current = null;
              markRazorpaySessionClosed();
              void finalizeRazorpayDismiss().then(() => onClose?.());
              return;
            }

            // Safety fallback
            console.warn(`ondismiss in unexpected state="${currentState}" — treating as cancel`);
            onRecoveryStartRef.current?.();
            onPaymentStateChange?.("cancelled");
            razorpayInstance.current = null;
            markRazorpaySessionClosed();
            void finalizeRazorpayDismiss().then(() => onClose?.());
          },
          escape: true,
          backdropclose: false,
        },
 
        retry: { enabled: true, retryCount: 2 },
      };

      if (brandImageUrl) {
        options.image = brandImageUrl;
      }

      try {
        razorpayInstance.current = new window.Razorpay(options);
        activeRazorpayInstance = razorpayInstance.current;

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
          razorpayInstance.current = null;
          markRazorpaySessionClosed();
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
      razorpayInstance.current = null;
    };
  }, [razorpayOrder?.id, razorpayKey]); // Re-init when gateway order or key changes
 
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
 


