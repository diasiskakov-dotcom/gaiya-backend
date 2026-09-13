// Seed data — mirrors the ten sample products already shown in the
// static frontend (gaiya_catalog.html), so the API and the storefront
// agree on what exists. In production this would be replaced by real
// records entered through the admin panel.

const products = [
  {
    id: "prod_twill_trench",
    title: "The Twill Trench",
    description:
      "An architectural silhouette softened by relaxed shoulders and a fluid drape. Cut from double-faced wool with a single interior button closure.",
    category: "Coats & Outerwear",
    tag: "In development",
    images: ["sample-01-trench-dev.jpeg"],
    variants: [
      { sku: "TWT-BRN-XS", size: "XS", color: "Brown", inventory: 4 },
      { sku: "TWT-BRN-S", size: "S", color: "Brown", inventory: 6 },
      { sku: "TWT-BRN-M", size: "M", color: "Brown", inventory: 5 },
      { sku: "TWT-BRN-L", size: "L", color: "Brown", inventory: 3 },
      { sku: "TWT-BRN-XL", size: "XL", color: "Brown", inventory: 0 },
      { sku: "TWT-BRN-XXL", size: "XXL", color: "Brown", inventory: 2 },
    ],
    prices: { KZT: 268000, USD: 560, EUR: 520 },
  },
  {
    id: "prod_sculpted_blazer",
    title: "The Sculpted Blazer",
    description:
      "A tailored blazer with a sculpted cutout shoulder detail finished in brushed gold hardware.",
    category: "Blazers",
    tag: "New",
    images: ["sample-02-blazer-cutout-front.jpeg"],
    variants: [
      { sku: "SCB-BLK-S", size: "S", color: "Black", inventory: 5 },
      { sku: "SCB-BLK-M", size: "M", color: "Black", inventory: 5 },
      { sku: "SCB-BLK-L", size: "L", color: "Black", inventory: 4 },
    ],
    prices: { KZT: 214000, USD: 447, EUR: 415 },
  },
  {
    id: "prod_double_breasted_blazer",
    title: "The Double-Breasted Blazer",
    description:
      "A double-breasted navy blazer with gold-tone buttons, cut for a structured, confident line.",
    category: "Blazers",
    tag: "New",
    images: ["sample-03-navy-blazer.jpeg"],
    variants: [
      { sku: "DBB-NVY-S", size: "S", color: "Navy", inventory: 6 },
      { sku: "DBB-NVY-M", size: "M", color: "Navy", inventory: 6 },
      { sku: "DBB-NVY-L", size: "L", color: "Navy", inventory: 3 },
    ],
    prices: { KZT: 186000, USD: 389, EUR: 361 },
  },
  {
    id: "prod_leather_trench",
    title: "The Leather Trench",
    description:
      "A long belted trench in supple faux leather, finished with classic double-breasted closures.",
    category: "Coats & Outerwear",
    tag: "Bestseller",
    images: ["sample-05-leather-trench.jpeg"],
    variants: [
      { sku: "LTR-BRN-S", size: "S", color: "Brown", inventory: 4 },
      { sku: "LTR-BRN-M", size: "M", color: "Brown", inventory: 5 },
      { sku: "LTR-BRN-L", size: "L", color: "Brown", inventory: 2 },
    ],
    prices: { KZT: 312000, USD: 652, EUR: 605 },
  },
  {
    id: "prod_wrap_maxi_skirt",
    title: "The Wrap Maxi Skirt",
    description:
      "An asymmetric pinstripe wrap skirt with a fluid, draped front panel.",
    category: "Skirts",
    tag: null,
    images: ["sample-06-wrap-skirt.jpeg"],
    variants: [
      { sku: "WMS-NVY-XS", size: "XS", color: "Navy", inventory: 5 },
      { sku: "WMS-NVY-S", size: "S", color: "Navy", inventory: 5 },
      { sku: "WMS-NVY-M", size: "M", color: "Navy", inventory: 4 },
    ],
    prices: { KZT: 118000, USD: 247, EUR: 229 },
  },
  {
    id: "prod_belted_shirt_dress",
    title: "The Belted Shirt Dress",
    description:
      "A voluminous belted shirt dress with dramatic sleeves and a gathered skirt.",
    category: "Dresses",
    tag: "New",
    images: ["sample-07-red-dress.jpeg"],
    variants: [
      { sku: "BSD-RED-XS", size: "XS", color: "Red", inventory: 3 },
      { sku: "BSD-RED-S", size: "S", color: "Red", inventory: 4 },
      { sku: "BSD-RED-M", size: "M", color: "Red", inventory: 4 },
    ],
    prices: { KZT: 172000, USD: 360, EUR: 334 },
  },
  {
    id: "prod_plaid_vest",
    title: "The Plaid Vest",
    description:
      "A sleeveless double-breasted vest in a charcoal windowpane plaid with a back strap detail.",
    category: "Blazers",
    tag: null,
    images: ["sample-09-plaid-vest-front.jpeg"],
    variants: [
      { sku: "PLV-CHR-S", size: "S", color: "Charcoal Plaid", inventory: 6 },
      { sku: "PLV-CHR-M", size: "M", color: "Charcoal Plaid", inventory: 6 },
      { sku: "PLV-CHR-L", size: "L", color: "Charcoal Plaid", inventory: 2 },
    ],
    prices: { KZT: 94000, USD: 197, EUR: 182 },
  },
  {
    id: "prod_tailored_plaid_jacket",
    title: "The Tailored Plaid Jacket",
    description:
      "A tailored jacket in green windowpane plaid with a waist-tied back for a sculpted silhouette.",
    category: "Blazers",
    tag: "Bestseller",
    images: ["sample-10-plaid-jacket-front.jpeg"],
    variants: [
      { sku: "TPJ-GRN-S", size: "S", color: "Green Plaid", inventory: 5 },
      { sku: "TPJ-GRN-M", size: "M", color: "Green Plaid", inventory: 5 },
      { sku: "TPJ-GRN-L", size: "L", color: "Green Plaid", inventory: 3 },
    ],
    prices: { KZT: 198000, USD: 414, EUR: 384 },
  },
  {
    id: "prod_asymmetric_shirt_dress",
    title: "The Asymmetric Shirt Dress",
    description:
      "In development — an asymmetric shirt dress with a pleated skirt panel and belted waist.",
    category: "Dresses",
    tag: "Coming soon",
    images: ["sample-04-sketch-shirtdress.jpeg"],
    variants: [],
    prices: {},
  },
  {
    id: "prod_layered_shirt_jacket",
    title: "The Layered Shirt Jacket",
    description: "In development — a layered shirt jacket with a dropped hem.",
    category: "Coats & Outerwear",
    tag: "Coming soon",
    images: ["sample-08-sketch-flats.jpeg"],
    variants: [],
    prices: {},
  },
];

const regions = [
  { code: "KZT", name: "Kazakhstan", symbol: "₸" },
  { code: "USD", name: "International (USD)", symbol: "$" },
  { code: "EUR", name: "International (EUR)", symbol: "€" },
];

const discounts = [
  {
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    usageLimit: 500,
    timesUsed: 0,
    active: true,
  },
];

module.exports = { products, regions, discounts };
