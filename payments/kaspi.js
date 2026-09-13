// Kaspi Pay integration stub.
//
// There's no official Node SDK for Kaspi Pay — a real implementation needs to
// follow Kaspi's merchant API documentation directly (obtained through their
// merchant onboarding process, which is a business step, not a code step).
// The general shape most Kazakhstan payment integrations of this kind take:
//
//   1. Server creates a payment order with Kaspi's API, receiving a QR code
//      or deep link.
//   2. Customer scans/opens it in the Kaspi app and confirms payment.
//   3. Kaspi sends a webhook to a callback URL on this server confirming
//      success or failure.
//   4. This server verifies the webhook signature and updates order status.
//
// This means checkout won't be able to synchronously return success/failure
// the way the Stripe flow can — the UI will need a "waiting for payment
// confirmation" state after the customer is redirected to Kaspi, until the
// webhook lands. Budget real design time for that state before launch.

async function createKaspiPayment(amount, currency) {
  if (currency !== "KZT") {
    throw new Error("Kaspi Pay only supports KZT-denominated payments");
  }

  if (!process.env.KASPI_MERCHANT_ID) {
    console.warn(
      "KASPI_MERCHANT_ID not set — simulating a successful payment. Do not ship this to production."
    );
  }

  // Simulated success response. A real implementation returns a QR/deep-link
  // payload here instead, and the order stays in a "pending" state until the
  // webhook below fires.
  return {
    success: true,
    reference: `kaspi_sim_${Date.now()}`,
    amount,
    currency,
  };
}

// Placeholder for the webhook handler Kaspi would call. Wire this up as a
// route once real credentials and their webhook signature scheme are in hand.
async function handleKaspiWebhook(payload) {
  // 1. Verify payload signature against KASPI_API_KEY
  // 2. Look up the order by payload.merchantOrderId
  // 3. Update order status to "paid" or "cancelled"
  throw new Error("Not implemented — wire up once Kaspi credentials exist");
}

module.exports = { createKaspiPayment, handleKaspiWebhook };
