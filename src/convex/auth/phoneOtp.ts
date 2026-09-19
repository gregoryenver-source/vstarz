import { Phone } from "@convex-dev/auth/providers/Phone";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

/**
 * Phone OTP sign-in (primary auth method for VStarz).
 *
 * The identifier is the full E.164 number (e.g. "+27794999885") — the client
 * composes it from the country-code dropdown + local number.
 *
 * Delivery: Twilio SMS (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_PHONE_NUMBER in the environment). Until those keys are added, the
 * provider logs the code server-side so the flow can be tested end-to-end.
 */

export const phoneOtp = Phone({
  id: "phone-otp",
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: phone, token }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const appName = process.env.VLY_APP_NAME || "VStarz";

    const message = `${appName}: Your verification code is ${token}. It expires in 15 minutes. Do not share this code.`;

    if (!accountSid || !authToken || !fromNumber) {
      // No SMS provider configured yet — surface the code in server logs so
      // the flow is testable. Sign-in still works via the logged code.
      console.warn(
        `[phone-otp] SMS not configured (missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER). OTP for ${phone}: ${token}`,
      );
      return;
    }

    try {
      const params = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: message,
      });
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        params.toString(),
        {
          auth: { username: accountSid, password: authToken },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail =
          error.response?.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
            ? String(error.response.data.message)
            : error.message;
        throw new Error(`SMS delivery failed: ${detail}`);
      }
      throw new Error("SMS delivery failed.");
    }
  },
});
