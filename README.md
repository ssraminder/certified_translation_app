<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1obfZF7oOAe0Q_QEMBWYn_FjOOBculy8j

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the required keys in [.env.local](.env.local):

   ```bash
   API_KEY=your_google_api_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   BREVO_API_KEY=your_brevo_api_key
   BREVO_TEST_EMAIL=your_test_email@example.com
   ```
3. Run the app:
   `npm run dev`

The project includes sample Netlify functions for Ping, Supabase, Cloud Vision, Gemini, Stripe, and Brevo that you can invoke from the UI to verify your environment configuration.
