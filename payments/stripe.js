// Stripe integration stub. Real implementation should use the Stripe SDK:
//
//   const stripe = require("stripe")(process.env.STRIPE_API_KEY);
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: Math.round(total * 100), // Stripe wants the smallest currency unit
//     currency: region.toLowerCase(),
//   });
//
// The storefront's checkout page would collect card details via Stripe
// Elements/Payment Element client-side, so card data never touches this
// server directly — this endpoint only confirms the resulting payment
// intent server-side.

async function createPayment(amount, currency) {
  if (!process.env.STRIPE_API_KEY) {
    console.warn(
      "STRIPE_API_KEY not set — simulating a successful payment. Do not ship this to production."
    );
  }

  // Simulated success response, shaped like what a real integration returns.
  return {
    success: true,
    reference: `stripe_sim_${Date.now()}`,
    amount,
    currency,
  };
}

module.exports = { createPayment };
