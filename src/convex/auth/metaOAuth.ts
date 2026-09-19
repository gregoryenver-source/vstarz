import Facebook from "@auth/core/providers/facebook";
import Instagram from "@auth/core/providers/instagram";

/**
 * Official Meta OAuth providers for VStarz.
 *
 * Both apps are created in the Meta developer console (developers.facebook.com).
 * Required env vars (set once the Meta apps exist):
 *   AUTH_FACEBOOK_ID / AUTH_FACEBOOK_SECRET
 *   AUTH_INSTAGRAM_ID / AUTH_INSTAGRAM_SECRET
 *
 * When the env vars are absent the providers are omitted — the app still works
 * with phone/email/anonymous sign-in, and the UI hides the Facebook/Instagram
 * buttons (via the `authProviders` query).
 */

const hasFacebook = Boolean(
  process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET,
);
const hasInstagram = Boolean(
  process.env.AUTH_INSTAGRAM_ID && process.env.AUTH_INSTAGRAM_SECRET,
);

const metaProviders = [];

if (hasFacebook) {
  metaProviders.push(
    Facebook({
      authorization: {
        params: {
          scope: "email,public_profile",
        },
      },
      // Default Auth.js profile maps id/name/email/picture — good as-is.
    }),
  );
}

if (hasInstagram) {
  metaProviders.push(
    Instagram({
      // Instagram API never returns email — profile() default handles that.
      authorization: "https://api.instagram.com/oauth/authorize?scope=user_profile",
    }),
  );
}

export const metaOAuthProviders = metaProviders;
