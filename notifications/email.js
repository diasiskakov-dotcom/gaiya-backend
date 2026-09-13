// Order confirmation email. Rendering is real and tested below — it's
// only the actual "send" call that's stubbed pending real Postmark/
// Sendgrid credentials, since that's a business account, not code.

const fs = require("fs");
const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "templates/order-confirmation.html");
const REGION_SYMBOLS = { KZT: "₸", USD: "$", EUR: "€" };

function formatMoney(amount, region) {
  const symbol = REGION_SYMBOLS[region] || "";
  return `${symbol} ${Number(amount).toLocaleString("en-US")}`;
}

// Renders the real template against a real order object — this part has
// no external dependency and is fully testable without any API key.
function renderConfirmationEmail(order, productLookup) {
  let template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  const itemBlockMatch = template.match(
    /<!-- BEGIN item loop:[\s\S]*?<!-- END item loop -->/
  );
  if (!itemBlockMatch) {
    throw new Error("Email template is missing the item loop markers");
  }
  const itemBlockTemplate = itemBlockMatch[0];

  const renderedItems = order.items
    .map((item) => {
      const product = productLookup(item.sku);
      let block = itemBlockTemplate;
      block = block.replace(/{{itemImageUrl}}/g, product?.imageUrl || "");
      block = block.replace(/{{itemName}}/g, product?.title || item.sku);
      block = block.replace(/{{itemColor}}/g, product?.color || "");
      block = block.replace(/{{itemSize}}/g, product?.size || "");
      block = block.replace(/{{itemQuantity}}/g, item.quantity);
      block = block.replace(
        /{{itemPrice}}/g,
        formatMoney(product?.price ?? 0, order.region)
      );
      return block;
    })
    .join("");

  template = template.replace(itemBlockTemplate, renderedItems);

  const addressLines = order.shippingAddress
    ? [
        order.shippingAddress.street,
        order.shippingAddress.city,
        order.shippingAddress.country,
      ]
        .filter(Boolean)
        .join("<br>")
    : "";

  const replacements = {
    "{{orderNumber}}": order.orderNumber,
    "{{customerFirstName}}": order.customer.firstName || "",
    "{{subtotal}}": formatMoney(order.totals.subtotal, order.region),
    "{{shipping}}":
      order.totals.shipping > 0
        ? formatMoney(order.totals.shipping, order.region)
        : "Complimentary",
    "{{total}}": formatMoney(order.totals.total, order.region),
    "{{shippingAddressLines}}": addressLines,
    "{{shippingMethod}}":
      order.shippingMethod === "express"
        ? "Express — next business day"
        : "Standard — 2–4 business days",
    "{{storeUrl}}": process.env.STORE_URL || "https://gaiya.com",
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.split(key).join(value);
  }

  return template;
}

async function sendOrderConfirmation(order, productLookup = () => null) {
  const html = renderConfirmationEmail(order, productLookup);

  if (!process.env.POSTMARK_API_KEY) {
    console.log(
      `[email stub] Rendered confirmation for ${order.orderNumber} → ${order.customer.email} (${html.length} chars). Not sent — POSTMARK_API_KEY not set.`
    );
    return { simulated: true, html };
  }

  // Real implementation, e.g. with Postmark:
  //
  //   const postmark = require("postmark");
  //   const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
  //   await client.sendEmail({
  //     From: process.env.EMAIL_FROM,
  //     To: order.customer.email,
  //     Subject: `Your GAÏYA order ${order.orderNumber} is confirmed`,
  //     HtmlBody: html,
  //   });

  throw new Error("Real email provider not yet wired up");
}

module.exports = { sendOrderConfirmation, renderConfirmationEmail };
