/**
 * api/paymob-callback.js
 * Paymob sends a POST here after every transaction (success or fail)
 *
 * Set in Paymob dashboard → Payment Integrations → Processed Callback URL:
 *   https://yallalevel.com/api/paymob-callback
 *
 * Environment variables:
 *   PAYMOB_HMAC_SECRET  — Paymob dashboard → Settings → HMAC Secret
 */

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { obj, hmac } = req.body;

  // ── Verify HMAC — do not skip, prevents spoofed callbacks ────────────────
  if (process.env.PAYMOB_HMAC_SECRET) {
    const valid = verifyHmac(obj, hmac, process.env.PAYMOB_HMAC_SECRET);
    if (!valid) {
      console.warn('[Paymob Callback] Invalid HMAC — possible spoofed request');
      return res.status(401).send('Unauthorized');
    }
  }

  const isPaid       = obj?.success === true;
  const isPending    = obj?.pending === true;
  const orderId      = obj?.order?.merchant_order_id;   // e.g. "YL-business-english-1234567"
  const amountEGP    = (obj?.amount_cents || 0) / 100;
  const method       = obj?.source_data?.type || 'unknown';
  const phone        = obj?.billing_data?.phone_number;
  const txnId        = obj?.id;

  if (isPaid) {
    console.log(`✅ PAID — Order: ${orderId} | ${amountEGP} EGP | via ${method} | phone: ${phone} | txn: ${txnId}`);

    // ── TODO: wire up your fulfilment logic here ──────────────────────────
    // Examples of what to do on successful payment:
    //
    // 1. Save to a database (Supabase, PlanetScale, etc.):
    //    await db.orders.create({ orderId, phone, amountEGP, method, txnId })
    //
    // 2. Send a WhatsApp message to the student (via Twilio or WhatsApp Business API):
    //    await sendWhatsApp(phone, `مبروك! تم تسجيلك في الكورس. هنتواصل معاك خلال ساعة ✅`)
    //
    // 3. Add them to a Google Sheet (quick & dirty for launch):
    //    await appendToSheet([orderId, phone, amountEGP, method, new Date().toISOString()])
    //
    // For launch week: even just console.log is fine — Vercel logs are real-time
    // and you'll see every payment come through.

  } else if (isPending) {
    console.log(`⏳ PENDING — Order: ${orderId} | ${method}`);
    // Fawry payments are pending until the user pays at the kiosk
    // You'll get a second callback with success=true when they do

  } else {
    console.log(`❌ FAILED — Order: ${orderId} | ${method}`);
  }

  // Always respond 200 — Paymob retries if it doesn't get 200
  return res.status(200).send('OK');
}

// ── HMAC Verification ─────────────────────────────────────────────────────────
// Paymob concatenates specific fields in a specific order and signs with HMAC-SHA512
function verifyHmac(obj, receivedHmac, secret) {
  try {
    // Fields Paymob uses for the HMAC, in this exact order
    const fields = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_voided,
      obj.order?.id,
      obj.owner,
      obj.pending,
      obj.source_data?.pan,
      obj.source_data?.sub_type,
      obj.source_data?.type,
      obj.success,
    ];

    const concatenated = fields.map(f => (f === null || f === undefined ? '' : String(f))).join('');
    const computed = crypto.createHmac('sha512', secret).update(concatenated).digest('hex');
    return computed === receivedHmac;
  } catch (e) {
    console.error('[HMAC] Verification error:', e);
    return false;
  }
}
