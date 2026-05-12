import React, { useEffect, useState } from "react";
// import toast from "react-hot-toast";
import { toast } from "react-toastify";

export default function InfluencerFormPage() {
    const [status, setStatus] = useState("idle");
    const [captcha, setCaptcha] = useState({ q: "", ans: 0 });
    const [userAnswer, setUserAnswer] = useState("");
    const [isVerified, setIsVerified] = useState(false);

    const niches = [
        "Tech",
        "Fashion",
        "Beauty",
        "Fitness",
        "Lifestyle",
        "Gaming",
        "Food",
        "Travel",
        "Comedy",
        "Education",
        "Other",
    ];

    const generateCaptcha = () => {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;

        setCaptcha({
            q: `${a} + ${b} = ?`,
            ans: a + b,
        });

        setUserAnswer("");
        setIsVerified(false);
    };

    const handleCaptchaChange = (e) => {
        const value = e.target.value;

        setUserAnswer(value);

        if (parseInt(value) === captcha.ans) {
            setIsVerified(true);
        } else {
            setIsVerified(false);
        }
    };

    useEffect(() => {
        generateCaptcha();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isVerified) {
            toast.error("Please solve verification first");
            return;
        }

        setStatus("loading");

        const form = e.target;

        try {
            const response = await fetch(
                "https://formspree.io/f/maqvajdo",
                {
                    method: "POST",
                    body: new FormData(form),
                    headers: {
                        Accept: "application/json",
                    },
                }
            );

            if (response.ok) {
                toast.success("Collaboration request submitted successfully!");

                form.reset();

                setUserAnswer("");
                setIsVerified(false);

                generateCaptcha();

                setStatus("idle");
            } else {
                toast.error("Failed to submit form");
                setStatus("error");
            }

        } catch (err) {
            console.log(err);

            toast.error("Something went wrong");

            setStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-[0.2em] mb-5">
                        Influencer Collaboration
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-tight">
                        Work With <span className="text-amber-500">Offer Wale Baba</span>
                    </h1>

                    <p className="mt-4 text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Join hands with India’s growing wholesale & ecommerce brand.
                        Let’s create impactful content together.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">

                    {/* Top */}
                    <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 sm:px-10 py-8">
                        <h2 className="text-white text-2xl font-black tracking-tight">
                            Influencer Partner Form
                        </h2>

                        <p className="text-slate-300 text-sm mt-2">
                            We usually respond within 24 hours.
                        </p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="p-6 sm:p-10 space-y-6"
                    >

                        {/* Hidden Inputs */}
                        <input
                            type="hidden"
                            name="_subject"
                            value="New Influencer Collaboration Request"
                        />

                        <input
                            type="hidden"
                            name="_captcha"
                            value="false"
                        />

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Full Name *
                            </label>

                            <input
                                type="text"
                                name="fullname"
                                required
                                placeholder="Enter your full name"
                                className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                            />
                        </div>

                        {/* Contact */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Email / Phone *
                            </label>

                            <input
                                type="text"
                                name="contact"
                                required
                                placeholder="Enter email or phone number"
                                className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                            />
                        </div>

                        {/* Social Link */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Instagram / YouTube Link *
                            </label>

                            <input
                                type="url"
                                name="sociallink"
                                required
                                placeholder="Paste your profile link"
                                className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                            />
                        </div>

                        {/* Followers + Niche */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Followers Count *
                                </label>

                                <input
                                    type="number"
                                    name="followers"
                                    required
                                    placeholder="e.g. 25000"
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Niche / Category *
                                </label>

                                <select
                                    name="niche"
                                    required
                                    className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700"
                                >
                                    <option value="">Select niche</option>

                                    {niches.map((niche) => (
                                        <option key={niche} value={niche}>
                                            {niche}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Short Message *
                            </label>

                            <textarea
                                rows={5}
                                required
                                name="message"
                                placeholder="Tell us about your audience and collaboration idea..."
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 resize-none"
                            />
                        </div>

                        {/* Verification */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Verification
                            </label>

                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

                                <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                                    {captcha.q}
                                </div>

                                <input
                                    type="number"
                                    placeholder="Answer"
                                    value={userAnswer}
                                    onChange={handleCaptchaChange}
                                    className="w-full sm:max-w-[140px] h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                            </div>

                            {!isVerified && userAnswer && (
                                <p className="text-red-500 text-xs mt-2">
                                    Incorrect answer
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={generateCaptcha}
                                className="text-xs text-amber-500 hover:underline mt-2"
                            >
                                Change Question
                            </button>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className={`
                w-full
                h-14
                rounded-2xl
                font-black
                uppercase
                tracking-[0.15em]
                transition-all
                duration-300
 
                ${isVerified
                                    ? "bg-[#0F172A] hover:bg-amber-500 text-white"
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }
              `}
                        >
                            {status === "loading"
                                ? "Submitting..."
                                : isVerified
                                    ? "Submit Collaboration Request"
                                    : "Solve Verification First"}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}