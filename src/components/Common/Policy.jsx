import { useEffect, useRef, useState } from "react";
import { useParams, Link, Navigate, useNavigationType } from "react-router-dom";

// ─── POLICIES DATA ────────────────────────────────────────────────────────────
const policiesData = [
  {
    "slug": "return-refund",
    "title": "Return & Refund",
    "subtitle": "Shop with confidence at OfferWaleBaba. If you receive a damaged or wrong item, here's how we make it right.",
    "tag": "Customer Care",
    "": "",
    "sections": [
      {
        "heading": "Eligible Return Reasons",
        "content": "Returns are accepted only for the following reasons:\n• Damaged item received\n• Wrong item delivered\n\nReturns for other reasons (including change of mind) are not covered under this policy unless explicitly approved by OfferWaleBaba."
      },
      {
        "heading": "Return Request Window & Mandatory Proofs",
        "content": "Return requests must be raised within 24 hours from the date and time of delivery. Requests raised after this period may be rejected.\n\nTo process a return, the customer must submit all required evidence:\n• 1 video proof (mandatory)\n• 1 to 3 image proofs (mandatory)\n• A brief message describing the issue\n\nIf sufficient proof is not provided, the request may be rejected."
      },
      {
        "heading": "Review Process & Reverse Pickup",
        "content": "Every return request is reviewed by our support/admin team. After review, the request will be either approved or rejected (with a rejection reason). OfferWaleBaba reserves the right to request additional information before a final decision.\n\nOnce approved, a reverse pickup is initiated through our logistics partner (Shiprocket and its courier network). Customer must ensure the product is packed securely and ready for pickup. Pickup timelines depend on courier serviceability and local operations."
      },
      {
        "heading": "Refund Eligibility & Processing",
        "content": "A return is considered completed only when the item is received back at our warehouse and verified. If the returned item does not match the approved return condition/reason, OfferWaleBaba may partially or fully deny refund.\n\n• For Online-Paid Orders: Refund is processed via original payment gateway/method (Razorpay-supported flow). Once initiated, credit timeline depends on the customer's bank/payment provider (typically 5–10 business days).\n\n• For COD Orders: Refunds are not auto-processed through payment gateway. Refund for COD orders, where applicable, is handled via separate support-assisted method (e.g., bank transfer/UPI after verification)."
      },
      {
        "heading": "RTO / Failed Delivery (Non-Delivery)",
        "content": "If an order cannot be delivered and is returned to our warehouse (RTO — Return to Origin), it is treated differently from a customer return request.\n\nRTO may occur in cases including but not limited to:\n• Customer unavailable at delivery address\n• Customer refused to accept the shipment at delivery\n• Incorrect or incomplete delivery address\n• Multiple failed delivery attempts by the courier partner\n\nImportant: RTO is not the same as a return request for damaged or wrong items. RTO applies when delivery itself could not be completed.\n\nRefund Rules for RTO Orders:\n\n• Partial Prepaid + COD Balance Orders:\nIf the order was placed with a partial online payment and the remaining amount as Cash on Delivery (COD), and the order is marked RTO (including customer refusal at delivery), no refund will be issued against the online part-payment. The collected advance may be used to recover forward shipping, RTO handling, and related operational costs.\n\n• 100% Online Prepaid Orders:\nRefund may be processed only after the product is received back at our warehouse and verified. The refund amount will be calculated after deducting applicable charges, including:\n• Original forward shipping charges\n• Return to Origin (RTO) / reverse logistics charges\n• Applicable platform/payment handling fees\n\nIf deductions exceed or equal the refundable amount, no refund will be issued. Any remaining eligible amount will be refunded via the original online payment method (Razorpay-supported flow). Credit timeline depends on the customer's bank/payment provider (typically 5–10 business days).\n\n• Full COD Orders (no online amount collected):\nNo online refund is applicable, as no online payment was collected for the order.\n\nFor RTO-related assistance, contact support with your Order ID."
      },
      {
        "heading": "Non-Returnable / Rejection Conditions",
        "content": "Return request may be rejected in cases including but not limited to:\n• Incorrect or insufficient proof\n• Request outside allowed return window (24 hours from delivery)\n• Product tampered/misused after delivery\n• Reason not covered under eligible return reasons\n• Item not matching the originally delivered product\n\nFor approved damaged/wrong-item cases, reverse pickup is arranged by OfferWaleBaba. Any exceptional charges (if applicable) will be communicated at the time of resolution.\n\nFailed delivery / RTO cases are not processed under the customer return flow and are handled as per the RTO / Failed Delivery section above."
      },
      {
        "heading": "Cancellation vs Return vs RTO & Policy Updates",
        "content": "Cancellation applies before dispatch (as per order status and eligibility).\n\nReturn applies after successful delivery for eligible damaged/wrong-item cases and follows this policy.\n\nRTO / failed delivery applies when the order could not be delivered and is returned to our warehouse. RTO refund rules are defined separately in this policy and are not treated as order cancellation or product return.\n\nOfferWaleBaba may update this policy from time to time to reflect operational or platform changes. Updated versions will be posted on the website with revised date.\n\nFor return/refund assistance, contact us with your Order ID:\nEmail: support.offerwalebaba@gmail.com\n"
      }
    ]
  },
  {
    "slug": "order-cancellation",
    "title": "Order Cancellation",
    "subtitle": "Plans change — we understand. Here's everything you need to know about cancelling an order on OfferWaleBaba.",
    "tag": "Orders",
    "updated": "",
    "sections": [
      {
        "heading": "1) When You Can Cancel an Order",
        "content": "You can request cancellation only while the order is in a cancellable stage, generally before shipment processing is completed.\n\nTypical cancellable statuses:\n• pending\n• confirmed (before shipment handover)\n• processing (only if not already packed/assigned for dispatch)\n\nOnce shipment is created/handover starts, cancellation may not be possible."
      },
      {
        "heading": "2) When Cancellation May Not Be Possible",
        "content": "Cancellation requests may be rejected if:\n• Order is already shipped / out for delivery / delivered\n• Shipment label/AWB has been generated and courier movement has started\n• Product is made-to-order, personalized, or explicitly marked non-cancellable\n• There is suspected abuse/fraud or repeated misuse of cancellation flow\n\nIn such cases, customer may use Return & Refund Policy (if eligible after delivery)."
      },
      {
        "heading": "3) How to Request Cancellation",
        "content": "Cancellation can be requested by:\n• Account order section (if cancellation action is available), or\n• Contacting support with Order ID\n\nRequired details:\n• Order ID\n• Registered phone/email\n• Reason for cancellation (optional but recommended)"
      },
      {
        "heading": "4) Auto-Cancellation Scenarios",
        "content": "OfferWaleBaba may auto-cancel orders in cases such as:\n• Payment not completed within allowed hold time\n• Payment authorization failure\n• Inventory unavailability\n• Address/serviceability failure\n• Compliance/risk checks failure\n• Technical or operational issues\n\nCustomer will be notified on registered contact details."
      },
      {
        "heading": "5) Refund Rules After Cancellation",
        "content": "A) Fully Online Paid Orders:\nIf cancellation is approved, refund is initiated to original payment source. Settlement timeline depends on bank/payment provider (typically 5–10 business days after initiation).\n\nB) Partial Payment + COD Orders:\nIf only advance was paid online and order is cancelled before dispatch, paid advance is refunded as per applicable checks. COD balance is not charged if order is cancelled before delivery.\n\nC) Full COD Orders:\nNo payment refund applicable if no online amount was collected. If any prepaid fee was collected (if applicable), it is handled as per communicated terms."
      },
      {
        "heading": "6) Failed / Duplicate Payments",
        "content": "If amount is debited but order is not confirmed due to payment failure/timeout:\nPayment status is reconciled automatically or via support.\nEligible amount is reversed/refunded to original payment method as per gateway/bank timelines."
      },
      {
        "heading": "7) Cancellation Charges",
        "content": "Usually no cancellation charge before dispatch.\nIn exceptional cases (special handling/packaging/logistics already incurred), charges may apply if disclosed at order time or by policy update."
      },
      {
        "heading": "8) Offer/Coupon Impact on Cancellation",
        "content": "On cancellation, applied discounts/coupons may lapse or may not be reinstated automatically.\nFirst-order or one-time promotional benefits may be revoked if misuse/fraud is detected.\nCoupon reusability is subject to campaign rules."
      },
      {
        "heading": "9) Bulk/Fraud/Abuse Protection",
        "content": "OfferWaleBaba reserves the right to:\n• Limit or block cancellations from accounts showing suspicious patterns\n• Cancel risky orders proactively\n• Restrict COD/partial payment options for repeated non-serious ordering behavior"
      },
      {
        "heading": "10) Important Clarification",
        "content": "Cancellation = before delivery (order stopped)\nReturn = after delivery (item sent back under Return & Refund Policy)"
      },
      {
        "heading": "11) Contact for Cancellation Support",
        "content": "For help with cancellation:\nEmail: support.offerwalebaba@gmail.com\nPlease keep your Order ID ready for faster assistance."
      },
      {
        "heading": "12) Policy Changes",
        "content": "OfferWaleBaba may update this policy at any time for operational reasons."
      }
    ]
  },
  {
    "slug": "terms-conditions",
    "title": "Terms & Conditions",
    "subtitle": "By using OfferWaleBaba, you agree to these terms. Please read them carefully before making a purchase.",
    "tag": "terms",
    "updated": "",
    "sections": [
      {
        "heading": "1) Eligibility and Account",
        "content": "You must provide accurate information during registration and checkout.\n\nYou are responsible for maintaining account confidentiality and all activity under your account.\n\nWe may suspend or terminate accounts involved in fraud, abuse, or policy violations."
      },
      {
        "heading": "2) Product Information and Pricing",
        "content": "We aim to provide accurate product descriptions, images, pricing, and stock data.\n\nMinor visual variation may occur due to lighting/display settings.\n\nPrices, discounts, and offers may change without prior notice.\n\nOrders may be cancelled/refused in case of pricing error, stock unavailability, or suspicious activity."
      },
      {
        "heading": "3) Orders and Acceptance",
        "content": "Placing an order is a purchase request, not an automatic acceptance.\n\nOrder confirmation may be subject to payment verification, address validation, and serviceability checks.\n\nWe reserve the right to cancel or limit any order for operational/compliance reasons."
      },
      {
        "heading": "4) Payment Methods",
        "content": "OfferWaleBaba may support: Full online payment\n• Full COD\n•  Partial online advance + COD balance at delivery (where enabled)\n\nAdditional terms:\n• Partial payment percentages and eligibility may be configured by admin/business rules.\n• For hybrid/partial payment orders, remaining amount is collected as COD through delivery workflow.\n• Payment failures may lead to cancellation or pending state as per system rules."
      },
      {
        "heading": "5) Shipping and Delivery",
        "content": "Delivery timelines are estimated and may vary by location/courier.\n\nShipment tracking status is provided on best-effort basis from logistics partners.\n\nDelays due to courier, weather, strike, regulatory restrictions, or force majeure are beyond direct control."
      },
      {
        "heading": "6) Returns and Refunds",
        "content": "Returns are accepted only as per the posted Return & Refund Policy.\n\nApproved returns may require reverse pickup and verification.\n\nRefund initiation and settlement timelines depend on payment mode and banking rails.\n\nCOD refunds are handled via designated support-assisted channels where applicable."
      },
      {
        "heading": "7) Coupons, Promotions, and Abuse Prevention",
        "content": "Coupons are subject to eligibility criteria, expiry, usage caps, minimum order value, and account type rules.\n\nFirst-order offers are valid only for genuinely eligible users as per platform checks.\n\nWe reserve the right to revoke discounts or block accounts in case of misuse, fraud, or technical exploitation."
      },
      {
        "heading": "8) User Conduct",
        "content": "Users must not:\n• Provide false identity or payment details\n• Abuse return/refund or promotional systems\n• Attempt unauthorized access, scraping, reverse engineering, or service disruption\n• Upload unlawful, infringing, or harmful content\n\nViolations may result in account restriction, order cancellation, reporting, and claim recovery."
      },
      {
        "heading": "9) Intellectual Property",
        "content": "All content on OfferWaleBaba (logo, text, design, images, software, branding) is owned/licensed by us and protected by applicable IP laws. Unauthorized reproduction or commercial use is prohibited."
      },
      
     
      {
        "heading": "10) Force Majeure",
        "content": "We are not liable for delay/failure caused by events beyond reasonable control, including natural disasters, internet outages, government restrictions, pandemics, labor disruptions, or courier network failures."
      },
    
      {
        "heading": "11) Changes to Terms",
        "content": "We may modify these Terms at any time. Revised Terms become effective upon publication. Continued platform use indicates acceptance of updated Terms."
      },
      {
        "heading": "12) Contact Information",
        "content": "For support/queries:\nEmail: support.offerwalebaba@gmail.com"
      }
    ]
  },
  {
    "slug": "privacy-policy",
    "title": "Privacy Policy",
    "subtitle": "Your privacy and trust matter to us. This policy explains how we collect, use, and protect your information.",
    "tag": "Data & Privacy",
    "updated": "",
    "sections": [
      {
        "heading": "Information We Collect",
        "content": "We collect information you provide directly to us such as your name, email address, shipping address, phone number, and payment details when you place an order or create an account.\n\nWe also collect information automatically when you use our platform, including your IP address, browser type, pages visited, and purchase history. This helps us understand how you use our services and improve your experience."
      },
      {
        "heading": "How We Use Your Information",
        "content": "Your information is used to process and deliver your orders, send order confirmations and shipping updates, provide customer support, and personalise your shopping experience.\n\nWe may also use your data to send promotional communications if you have opted in. We do not sell, rent, or trade your personal information to third parties for their marketing purposes."
      },
      {
        "heading": "Data Security",
        "content": "We implement industry-standard SSL encryption and secure payment gateways to protect your data during transmission and storage. All payment transactions are processed through certified third-party gateways.\n\nOfferWaleBaba does not store your credit or debit card details on our servers. Our systems are regularly audited and tested to ensure your information remains protected against unauthorized access."
      },
      {
        "heading": "Cookies & Tracking",
        "content": "We use cookies and similar tracking technologies to personalize your shopping experience, analyze website traffic, and improve platform performance. Cookies help us remember your preferences and keep you logged in.\n\nYou may disable cookies through your browser settings at any time, though some features of our website may become unavailable or function differently as a result."
      },
      {
        "heading": "Your Rights",
        "content": "You have the right to access, correct, or request deletion of your personal data at any time. To exercise these rights, contact our support team with a clear description of your request.\n\nWe will respond to all privacy-related requests within 7 business days. If you believe your data has been handled improperly, you also have the right to raise a complaint with the relevant data protection authority."
      },
      {
        "heading": "Contact Us",
        "content": "For privacy-related concerns or questions about your data:\nEmail: support.offerwalebaba@gmail.com\n"
      }
    ]
  },
  {
    "slug": "shipping-policy",
    "title": "Shipping Policy",
    "subtitle": "Fast, reliable delivery across India. Here's what to expect after you place your order on OfferWaleBaba.",
    "tag": "Delivery",
    "updated": "May 8, 2026",
    "sections": [
      {
        "heading": "1) Order Processing",
        "content": "Orders are processed after successful order confirmation.\n\nDepending on selected payment mode, confirmation may happen:\n• Immediately (e.g., eligible COD flow), or\n• After payment verification (online/advance payment flows).\n\nOnce confirmed, shipment is initiated through our logistics integration (Shiprocket and partner couriers), subject to serviceability and operational checks."
      },
      {
        "heading": "2) Shipping Coverage & Serviceability",
        "content": "Delivery availability depends on courier serviceability for the destination PIN code.\n\nIf a location is not serviceable, order may be cancelled and applicable refund rules will apply.\n\nDelivery timelines may vary by city, PIN code, weather, holidays, and courier network performance."
      },
      {
        "heading": "3) Shipping Charges",
        "content": "Shipping charges (if applicable) are shown during checkout before final order placement.\n\nCharges may vary based on order value, package weight/size, destination, and ongoing offers.\n\nAny promotional free-shipping conditions (if active) are applied at checkout as per campaign rules."
      },
      {
        "heading": "4) Payment Modes and Shipping Impact",
        "content": "OfferWaleBaba may support:\n• Full COD\n• Full Online Payment\n• Partial Online Advance + Remaining COD\n\nFor partial-payment orders:\nAdvance amount is collected online at checkout.\nRemaining balance is collected as COD at delivery, as configured under current business policy."
      },
      {
        "heading": "5) Shipment Creation and Dispatch Workflow",
        "content": "After order confirmation:\nShipment request is created in logistics system.\nAWB/tracking details are generated when accepted by courier pipeline.\nOrder status progression is managed through shipment updates/webhooks/tracking sync.\n\nTypical status flow:\nConfirmed → Shipped → Out for Delivery → Delivered\nAdditional states like cancellation/RTO may apply based on courier outcomes."
      },
      {
        "heading": "6) Tracking Your Order",
        "content": "Customers can track orders from the account/order section where available. Tracking information may include:\n• Tracking number/AWB\n• Courier name\n• Current shipment status\n• Timeline updates (where available)\n\nTracking events are dependent on courier scans and may not update in real-time in some regions."
      },
      {
        "heading": "7) Delivery Attempts",
        "content": "Courier partners may make one or more delivery attempts as per their policy.\nCustomer must provide accurate delivery address and reachable phone number.\nFailed delivery due to unavailable recipient, incorrect address, or unreachable contact may result in return/RTO handling."
      },
      {
        "heading": "8) Delays",
        "content": "Estimated delivery timelines are not guaranteed. Delays may occur due to:\n• High order volume\n• Remote location constraints\n• Weather/natural events\n• Transport disruptions/strikes\n• Regulatory restrictions\n• Courier operational constraints\n\nOfferWaleBaba is not liable for delays caused by third-party courier/network factors beyond reasonable control."
      },
      {
        "heading": "9) Address and Contact Accuracy",
        "content": "Customer is responsible for providing correct:\n• Full name\n• Mobile number\n• Complete address with landmark and PIN code\n\nIncorrect or incomplete information may cause delay, failed delivery, or cancellation."
      },
      {
        "heading": "10) Undelivered / RTO (Return to Origin)",
        "content": "Orders may be marked undelivered/RTO in cases such as:\n• Customer unavailable despite attempts\n• Refusal at doorstep\n• Address issues\n• Courier operational failure\n\nIn such cases, refund/settlement (if applicable) follows our Cancellation/Refund policy and payment-mode rules."
      },
      {
        "heading": "11) Shipment Exceptions",
        "content": "In case of shipment exceptions (lost/damaged in transit, operational mismatch), OfferWaleBaba will investigate with logistics partners before final resolution. Resolution timeline may vary based on courier response cycle."
      },
      {
        "heading": "12) Damaged/Wrong Item on Delivery",
        "content": "If delivered item is damaged or wrong:\nCustomer should raise a return request as per Return & Refund Policy.\nRequired proof (video/images) and timeline conditions apply."
      },
      {
        "heading": "13) Policy Updates",
        "content": "OfferWaleBaba reserves the right to update this Shipping Policy from time to time. Revised policy becomes effective upon posting with updated date."
      },
      {
        "heading": "14) Contact Us",
        "content": "For shipping-related support, contact:\nEmail: support.offerwalebaba@gmail.com\nPlease share your Order ID for quicker assistance."
      }
    ]
  }
];

function getPolicyBySlug(slug) {
  return policiesData.find((p) => p.slug === slug) || null;
}

const POLICY_PARA_CLASS =
  "text-[#2a2010]/75 leading-[1.88] text-base sm:text-[1.02rem] font-light";
const POLICY_SUBHEADING_CLASS =
  "font-semibold text-zinc-800 leading-[1.88] text-base sm:text-[1.02rem]";

function formatInlineImportant(text) {
  if (text.startsWith("Important:")) {
    return (
      <>
        <strong className="font-semibold text-zinc-800">Important:</strong>
        {text.slice("Important:".length)}
      </>
    );
  }
  return text;
}

function isStandaloneSubheading(line, nextLine) {
  const t = line.trim();
  if (!t || t.startsWith("•")) return false;
  if (!t.endsWith(":")) return false;
  if (t.startsWith("Important:")) return false;
  if (nextLine && nextLine.trim().startsWith("•")) return true;
  if (/^(Refund Rules for RTO Orders|For return\/refund assistance)/.test(t)) return true;
  if (t.length < 80 && !/\.\s/.test(t.slice(0, -1))) return true;
  return false;
}

function renderBulletLabel(raw) {
  const colonIdx = raw.indexOf(":");
  const endsWithColon = colonIdx > 0 && colonIdx === raw.length - 1;
  const inlineLabel = colonIdx > 0 && colonIdx < raw.length - 1;

  if (endsWithColon) {
    return <span className="font-semibold text-zinc-800">{raw}</span>;
  }
  if (inlineLabel) {
    return (
      <>
        <span className="font-semibold text-zinc-800">{raw.slice(0, colonIdx + 1)}</span>
        {raw.slice(colonIdx + 1)}
      </>
    );
  }
  return raw;
}

function parseBulletSection(lines, startIdx) {
  const items = [];
  let i = startIdx;

  while (i < lines.length && lines[i].startsWith("•")) {
    const raw = lines[i].replace(/^•\s*/, "");
    i++;

    const bodyParagraphs = [];
    while (i < lines.length && !lines[i].startsWith("•")) {
      bodyParagraphs.push(lines[i]);
      i++;
    }

    let nestedBullets = null;
    if (i < lines.length && lines[i].startsWith("•")) {
      const lastBody = bodyParagraphs[bodyParagraphs.length - 1] || "";
      const isNested = raw.endsWith(":") || lastBody.endsWith(":");

      if (isNested) {
        nestedBullets = [];
        while (i < lines.length && lines[i].startsWith("•")) {
          nestedBullets.push(lines[i].replace(/^•\s*/, ""));
          i++;
        }
      }
    }

    items.push({ raw, bodyParagraphs, nestedBullets });
  }

  const node = (
    <ul
      key={`bullets-${startIdx}`}
      className="list-disc pl-5 sm:pl-6 space-y-3 marker:text-[#C8973A]"
    >
      {items.map((item, idx) => (
        <li key={idx} className={POLICY_PARA_CLASS}>
          {renderBulletLabel(item.raw)}
          {item.bodyParagraphs.map((para, pi) => (
            <p key={pi} className={pi === 0 ? "mt-1.5" : "mt-2"}>
              {formatInlineImportant(para)}
            </p>
          ))}
          {item.nestedBullets?.length > 0 && (
            <ul className="list-disc pl-5 mt-2 space-y-1.5 marker:text-[#C8973A]">
              {item.nestedBullets.map((nb, ni) => (
                <li key={ni}>{nb}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );

  return { node, consumed: i - startIdx };
}

function PolicyContentBlock({ block, blockIndex }) {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];

    if (line.startsWith("•")) {
      const { node, consumed } = parseBulletSection(lines, i);
      elements.push(node);
      i += consumed;
      continue;
    }

    if (isStandaloneSubheading(line, next)) {
      elements.push(
        <p key={`${blockIndex}-${i}`} className={POLICY_SUBHEADING_CLASS}>
          {line}
        </p>
      );
      i++;
      continue;
    }

    elements.push(
      <p key={`${blockIndex}-${i}`} className={POLICY_PARA_CLASS}>
        {formatInlineImportant(line)}
      </p>
    );
    i++;
  }

  return (
    <div
      className="space-y-3 animate-para-fade-up"
      style={{ animationDelay: `${0.1 + blockIndex * 0.08}s` }}
    >
      {elements}
    </div>
  );
}

function PolicyContent({ content }) {
  const blocks = content.split("\n\n").filter((b) => b.trim());

  return (
    <div className="space-y-5">
      {blocks.map((block, bi) => (
        <PolicyContentBlock key={bi} block={block} blockIndex={bi} />
      ))}
    </div>
  );
}

// ─── SECTION COMPONENT ────────────────────────────────────────────────────────
function PolicySection({ section, index, isActive, onVisible }) {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(index); },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index, onVisible]);

  return (
    <div ref={ref} id={`section-${index}`} className="scroll-mt-8 mb-16 lg:mb-24">
      <div className="animate-section-fade-up">
        <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font- text-zinc-800 mb-6 leading-tight">
          {section.heading}
        </h2>
        <div className="h-[2px] w-12 bg-[#C8973A] mb-8 rounded-full animate-gold-rule" />
        <PolicyContent content={section.content} />
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PolicyPage() {
  const { slug } = useParams();
  const navigationType = useNavigationType();
  const policy = getPolicyBySlug(slug);
  const [activeSection, setActiveSection] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    setActiveSection(0);
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug, navigationType]);

  const handleSidebarClick = (index) => {
    const el = document.getElementById(`section-${index}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 32;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (!policy) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-white font-sans page-transition" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: auto; }
        
        .page-transition {
          animation: pageFadeIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        
        @keyframes pageFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-hero-pill {
          animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-hero-title {
          animation: slideUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.05s forwards;
          transform: translateY(100%);
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .animate-hero-date {
          animation: fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
          opacity: 0;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-section-fade-up {
          animation: sectionFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
          transform: translateY(28px);
        }
        
        @keyframes sectionFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-gold-rule {
          animation: goldRuleScale 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
          transform: scaleX(0);
          transform-origin: left;
        }
        
        @keyframes goldRuleScale {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        
        .animate-para-fade-up {
          animation: paraFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
          transform: translateY(12px);
        }
        
        @keyframes paraFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-sidebar-item {
          animation: sidebarFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
          transform: translateX(-16px);
        }
        
        @keyframes sidebarFadeIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-glow-pulse {
          animation: glowPulse 8s ease-in-out infinite;
        }
        
        @keyframes glowPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        
        .animate-glow-pulse-slow {
          animation: glowPulseSlow 10s ease-in-out infinite;
        }
        
        @keyframes glowPulseSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        
        .animate-contact-cta {
          animation: ctaFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
          transform: translateY(30px);
        }
        
        @keyframes ctaFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── HERO (dark gold) ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #050505 0%, #140B05 30%, #2A1408 65%, #090909 100%)"
        }}
      >
        <div
          className="pointer-events-none absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full blur-[120px] animate-glow-pulse"
          style={{ background: "radial-gradient(circle, rgba(255,140,0,0.28) 0%, transparent 72%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full blur-[120px] animate-glow-pulse-slow"
          style={{ background: "radial-gradient(circle, rgba(255,94,0,0.22) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(200,151,58,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,151,58,1) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12 pt-20 pb-32 text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#C8973A]/25 bg-[#C8973A]/10 px-5 py-2 animate-hero-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8973A] animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C8973A]/80">
              {policy.tag}
            </span>
          </div>
          <div className="overflow-hidden mb-5">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl text-white tracking-[-2px] leading-[0.92] animate-hero-title">
              {policy.title}
            </h1>
          </div>
          {/* <p className="text-[#C8973A]/55 text-sm tracking-widest uppercase font-medium animate-hero-date">
            Effective {policy.updated}
          </p> */}
        </div>

        <div className="relative" style={{ marginBottom: "-2px" }}>
          <svg viewBox="0 0 1440 90" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none">
            <path d="M0,60 C240,90 480,20 720,50 C960,80 1200,15 1440,55 L1440,90 L0,90 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── CONTENT BODY ──────────────────────────────────────────────── */}
      <section className="bg-white pt-10 pb-24 px-6 lg:px-12">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-[300px_1fr] gap-12 lg:gap-20">
          {/* ── LEFT SIDEBAR ── */}
          <aside className="lg:sticky lg:top-10 h-fit">
            <ul className="space-y-0">
              {policy.sections.map((section, i) => (
                <li
                  key={i}
                  className="animate-sidebar-item"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <button
                    onClick={() => handleSidebarClick(i)}
                    className="w-full text-left group relative py-4 pr-4 border-b border-[#e8dcc8] transition-all duration-200"
                  >
                    <div
                      className={`absolute bottom-0 left-0 h-[2px] bg-[#C8973A] rounded-full transition-all duration-300 ease-out ${
                        activeSection === i ? "w-[60%]" : "w-0"
                      }`}
                    />
                    <span
                      className="text-sm sm:text-[0.95rem] transition-colors duration-200"
                      style={{ color: activeSection === i ? "#644304" : "#16120c" }}
                    >
                      {section.heading}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-10 pt-8 border-t border-[#e8dcc8]">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#9a8060] font-semibold mb-4">
                Other Policies
              </p>
              <ul className="space-y-1">
                {policiesData
                  .filter((p) => p.slug !== slug)
                  .map((p) => (
                    <li key={p.slug}>
                      <Link
                        to={`/policies/${p.slug}`}
                        className="block py-2 text-sm text-[#9a8060] hover:text-[#C8973A] transition-colors duration-200 font-medium"
                      >
                        {p.title} →
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </aside>

          {/* ── RIGHT CONTENT ── */}
          <div ref={contentRef}>
            {policy.sections.map((section, i) => (
              <PolicySection
                key={`${slug}-${i}`}
                section={section}
                index={i}
                isActive={activeSection === i}
                onVisible={setActiveSection}
              />
            ))}

            {/* CONTACT CTA */}
            <div className="relative mt-8 overflow-hidden rounded-[32px] border border-orange-400/10 p-8 sm:p-10 lg:p-12 shadow-[0_0_80px_rgba(255,115,0,0.08)] animate-contact-cta"
              style={{ background: "linear-gradient(135deg, #090909 0%, #140B05 35%, #1F0F05 65%, #090909 100%)" }}
            >
              <div
                className="pointer-events-none absolute -top-16 -right-10 h-[260px] w-[260px] rounded-full blur-[100px]"
                style={{ background: "radial-gradient(circle, rgba(255,115,0,0.22) 0%, transparent 72%)" }}
              />
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-[180px] w-[180px] rounded-full blur-[90px]"
                style={{ background: "radial-gradient(circle, rgba(255,166,0,0.14) 0%, transparent 70%)" }}
              />
              <div className="relative z-10">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-300/70">
                  Support
                </p>
                <h3 className="text-3xl sm:text-4xl font-black tracking-[-1px] text-white leading-tight">
                  We're here to help.
                </h3>
                <p className="mt-5 max-w-xl text-sm sm:text-base leading-8 text-white/65">
                  Have questions regarding this policy, your order, or refunds? Our support
                  team is available to assist you anytime.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/contact"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-8 py-4 text-sm font-bold text-black transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(255,115,0,0.35)]"
                  >
                    Contact Support
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </Link>
                  <Link
                    to="/#hero-section"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-8 py-4 text-sm font-bold text-white transition-all duration-300 hover:border-orange-400/30 hover:bg-white/[0.06]"
                  >
                    Back To Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}