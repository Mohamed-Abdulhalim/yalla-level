/**
 * js/payment.js
 * Handles the entire checkout flow:
 *   1. User clicks "Buy" on a course card
 *   2. Modal opens asking for name + phone
 *   3. Calls /api/checkout
 *   4. Opens Paymob iFrame in modal
 *   5. Handles success / failure redirect
 */

// ── Course catalogue ──────────────────────────────────────────────────────────
// Keep this in sync with your course cards in index.html
const COURSES = {
  'business-english': {
    id: 'business-english',
    nameAr: 'إنجليزي للبيزنس: من الصفر للاحتراف',
    nameEn: 'Business English: Zero to Pro',
    price: 149,
    originalPrice: 299,
  },
  'leadership': {
    id: 'leadership',
    nameAr: 'فن القيادة: كيف تأثر في الناس',
    nameEn: 'The Art of Leadership',
    price: 199,
    originalPrice: 399,
  },
  'self-confidence': {
    id: 'self-confidence',
    nameAr: 'بناء الثقة بالنفس وتغيير العقلية',
    nameEn: 'Build Self-Confidence & Shift Your Mindset',
    price: 99,
    originalPrice: 199,
  },
  'productivity': {
    id: 'productivity',
    nameAr: 'إدارة الوقت والإنتاجية الفعلية',
    nameEn: 'Real Time Management & Productivity',
    price: 99,
    originalPrice: 199,
  },
  'negotiation': {
    id: 'negotiation',
    nameAr: 'مهارات التفاوض والإقناع',
    nameEn: 'Negotiation & Persuasion Skills',
    price: 179,
    originalPrice: 349,
  },
  'public-speaking': {
    id: 'public-speaking',
    nameAr: 'التحدث أمام الجمهور بثقة',
    nameEn: 'Public Speaking with Confidence',
    price: 149,
    originalPrice: 299,
  },
};

// ── State ─────────────────────────────────────────────────────────────────────
let currentCourse = null;
let currentLang = () => document.getElementById('body').classList.contains('ar') ? 'ar' : 'en';

// ── Open checkout modal ───────────────────────────────────────────────────────
function openCheckout(courseId) {
  currentCourse = COURSES[courseId];
  if (!currentCourse) return console.error('Unknown course:', courseId);

  const isAr = currentLang() === 'ar';
  const courseName = isAr ? currentCourse.nameAr : currentCourse.nameEn;

  // Populate modal content
  document.getElementById('checkout-course-name').textContent = courseName;
  document.getElementById('checkout-price').textContent = `${currentCourse.price} ج.م`;
  document.getElementById('checkout-original-price').textContent = `${currentCourse.originalPrice} ج.م`;

  // Reset form
  document.getElementById('checkout-name').value = '';
  document.getElementById('checkout-phone').value = '';
  document.getElementById('checkout-error').textContent = '';
  document.getElementById('checkout-submit').disabled = false;

  // Show step 1 (details form), hide step 2 (iframe)
  showStep(1);
  document.getElementById('checkout-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.remove('open');
  document.body.style.overflow = '';
  currentCourse = null;
}

function showStep(step) {
  document.getElementById('checkout-step-1').style.display = step === 1 ? 'flex' : 'none';
  document.getElementById('checkout-step-2').style.display = step === 2 ? 'block' : 'none';
}

// ── Submit checkout form ──────────────────────────────────────────────────────
async function submitCheckout() {
  const isAr = currentLang() === 'ar';
  const name  = document.getElementById('checkout-name').value.trim();
  const phone = document.getElementById('checkout-phone').value.replace(/\D/g, '').replace(/^0/, '');
  const paymentType = document.querySelector('input[name="payment-type"]:checked')?.value || 'card';
  const errorEl = document.getElementById('checkout-error');
  const submitBtn = document.getElementById('checkout-submit');

  // Validate
  errorEl.textContent = '';
  if (!name) {
    errorEl.textContent = isAr ? 'من فضلك ادخل اسمك' : 'Please enter your name';
    return;
  }
  if (phone.length !== 10) {
    errorEl.textContent = isAr ? 'رقم الموبايل غلط — لازم يكون 10 أرقام' : 'Invalid phone number — must be 10 digits';
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  submitBtn.textContent = isAr ? 'جاري التحضير...' : 'Preparing...';

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: currentCourse.id,
        courseName: isAr ? currentCourse.nameAr : currentCourse.nameEn,
        amountEGP: currentCourse.price,
        customerName: name,
        customerPhone: phone,
        paymentType,
      }),
    });

    const data = await res.json();

    if (!data.success || !data.iframeUrl) {
      throw new Error(data.error || 'Unknown error');
    }

    // Show Paymob iFrame in step 2
    const iframe = document.getElementById('paymob-iframe');
    iframe.src = data.iframeUrl;
    showStep(2);

  } catch (err) {
    console.error('Checkout error:', err);
    errorEl.textContent = isAr
      ? 'في مشكلة في الدفع — حاول تاني أو كلمنا على واتساب'
      : 'Payment error — please try again or contact us on WhatsApp';
    submitBtn.disabled = false;
    submitBtn.textContent = isAr ? 'ادفع دلوقتي' : 'Pay Now';
  }
}

// ── Listen for Paymob post-payment message ────────────────────────────────────
// Paymob sends a postMessage from the iFrame when payment completes
window.addEventListener('message', (event) => {
  // Only trust messages from Paymob
  if (!event.origin.includes('paymob.com')) return;

  const { success, pending } = event.data || {};

  if (success === true) {
    closeCheckout();
    window.location.href = '/payment-success.html';
  } else if (success === false && pending !== true) {
    closeCheckout();
    window.location.href = '/payment-failed.html';
  }
  // If pending (e.g. Fawry cash), show a pending message
  if (pending === true) {
    closeCheckout();
    window.location.href = '/payment-pending.html';
  }
});

// ── Expose globally ───────────────────────────────────────────────────────────
window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;
window.submitCheckout = submitCheckout;
