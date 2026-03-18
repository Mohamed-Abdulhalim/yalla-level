/**
 * api/checkout.js
 * Paymob payment initiation — Vercel serverless function
 *
 * Set these in Vercel → Settings → Environment Variables:
 *   PAYMOB_API_KEY
 *   PAYMOB_CARD_INTEGRATION_ID
 *   PAYMOB_WALLET_INTEGRATION_ID
 *   PAYMOB_IFRAME_ID
 *   SITE_URL  (e.g. https://yallalevel.com)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    courseId,
    courseName,
    amountEGP,
    customerName,
    customerPhone,
    paymentType = 'card', // 'card' | 'wallet'
  } = req.body;

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!courseId || !amountEGP || !customerPhone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cleanPhone = customerPhone.replace(/\D/g, '').replace(/^0/, '');
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Invalid Egyptian phone number' });
  }

  const amountCents = Math.round(parseFloat(amountEGP) * 100);

  const integrationId =
    paymentType === 'wallet'
      ? process.env.PAYMOB_WALLET_INTEGRATION_ID
      : process.env.PAYMOB_CARD_INTEGRATION_ID;

  try {
    // ── Step 1: Authenticate ──────────────────────────────────────────────
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
    });
    const { token: authToken } = await authRes.json();
    if (!authToken) return res.status(500).json({ error: 'Paymob auth failed' });

    // ── Step 2: Register Order ────────────────────────────────────────────
    const merchantOrderId = `YL-${courseId}-${Date.now()}`;
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        merchant_order_id: merchantOrderId,
        items: [{
          name: courseName || 'Yalla Level Course',
          amount_cents: amountCents,
          description: `Yalla Level — ${courseName}`,
          quantity: 1,
        }],
      }),
    });
    const orderData = await orderRes.json();
    if (!orderData.id) return res.status(500).json({ error: 'Order registration failed' });

    // ── Step 3: Get Payment Key ───────────────────────────────────────────
    const [firstName, ...rest] = (customerName || 'Guest User').trim().split(' ');
    const lastName = rest.join(' ') || 'User';

    const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderData.id,
        currency: 'EGP',
        integration_id: parseInt(integrationId),
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: `+20${cleanPhone}`,
          email: 'NA',
          apartment: 'NA', floor: 'NA', street: 'NA',
          building: 'NA', shipping_method: 'NA',
          postal_code: 'NA', city: 'Cairo',
          country: 'EG', state: 'NA',
        },
      }),
    });
    const { token: paymentToken } = await keyRes.json();
    if (!paymentToken) return res.status(500).json({ error: 'Payment key failed' });

    // ── Step 4: Return iFrame URL ─────────────────────────────────────────
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

    return res.status(200).json({ success: true, iframeUrl, orderId: orderData.id, merchantOrderId });

  } catch (err) {
    console.error('[Paymob] Error:', err);
    return res.status(500).json({ error: 'Payment system error. Please try again.' });
  }
}
