import React from "react";

/*
  Legacy registration OTP screen preserved as a rollback reference.
  It was intentionally disconnected when registration was changed to:
  form submit -> account created/repaired -> user logged in immediately.

  If product requirements reintroduce registration OTP in the future,
  restore this screen together with:
  - authSlice.verifyOTP thunk
  - LogRegister OTP panel wiring
  - backend /auth/otp-verify-login route
  - backend OTP registration branch in auth.controller.js
*/

const OtpVerification = () => null;

export default OtpVerification;

