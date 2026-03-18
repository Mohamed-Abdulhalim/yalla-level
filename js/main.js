
  // ─── LANGUAGE TOGGLE ───
  function toggleLang() {
    const body = document.getElementById('body');
    const btn = document.getElementById('lang-btn');
    const isAr = body.classList.contains('ar');

    if (isAr) {
      body.classList.remove('ar');
      body.classList.add('en');
      body.setAttribute('lang', 'en');
      body.setAttribute('dir', 'ltr');
      btn.textContent = 'عربي';
    } else {
      body.classList.remove('en');
      body.classList.add('ar');
      body.setAttribute('lang', 'ar');
      body.setAttribute('dir', 'rtl');
      btn.textContent = 'English';
    }
  }

  // ─── SCROLL REVEAL ───
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // ─── COUNTER ANIMATION ───
  function animateCounters() {
    document.querySelectorAll('.stat-num span').forEach(el => {
      const target = parseInt(el.textContent);
      if (isNaN(target)) return;
      let start = 0;
      const duration = 1500;
      const step = target / (duration / 16);
      const counter = setInterval(() => {
        start += step;
        if (start >= target) {
          el.textContent = target.toLocaleString();
          clearInterval(counter);
        } else {
          el.textContent = Math.floor(start).toLocaleString();
        }
      }, 16);
    });
  }

  const heroObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setTimeout(animateCounters, 600);
      heroObserver.disconnect();
    }
  });
  heroObserver.observe(document.querySelector('.hero-stats'));

  // ─── PHONE CAPTURE ───
  function submitPhone() {
    const input = document.getElementById('phone-input');
    const btn = document.querySelector('.capture-btn');
    const body = document.getElementById('body');
    const isAr = body.classList.contains('ar');

    let phone = input.value.replace(/\D/g, '');

    // Validate Egyptian mobile number
    if (phone.length < 10 || phone.length > 11) {
      input.style.borderColor = 'var(--primary)';
      input.focus();
      input.placeholder = isAr ? 'رقم غلط — حاول تاني' : 'Invalid number — try again';
      setTimeout(() => {
        input.placeholder = '1X XXXX XXXX';
        input.style.borderColor = '';
      }, 2000);
      return;
    }

    // Remove leading 0 if present, prepend country code
    if (phone.startsWith('0')) phone = phone.slice(1);
    const fullNumber = '2' + phone; // Egypt: 20 + number without leading 0

    const msg = isAr
      ? 'السلام%20عليكم،%20عايز%20أجرّب%20الدرس%20المجاني%20على%20Yalla%20Level'
      : 'Hi%2C%20I%20want%20to%20try%20the%20free%20lesson%20on%20Yalla%20Level';

    // Show loading state
    btn.classList.add('loading');
    btn.innerHTML = isAr ? 'جاري الإرسال...' : 'Sending...';

    setTimeout(() => {
      btn.classList.remove('loading');
      btn.classList.add('success');
      btn.innerHTML = isAr ? '✓ تم! هنتواصل معاك دلوقتي' : '✓ Done! We\'ll reach out now';
      input.value = '';

      // Open WhatsApp with their number pre-filled as context
      window.open(`https://wa.me/201554265712?text=${msg}%20-%20رقمي%3A%20%2B${fullNumber}`, '_blank');

      setTimeout(() => {
        btn.classList.remove('success');
        btn.innerHTML = isAr
          ? '<span data-ar>ابدأ مجاناً ⚡</span>'
          : '<span data-en>Start Free ⚡</span>';
      }, 4000);
    }, 800);
  }

  // Allow Enter key on phone input
  document.getElementById('phone-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitPhone();
  });

  // Numbers only input
  document.getElementById('phone-input').addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '');
  });
  function openMobileNav() {
    document.getElementById('mobile-nav').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileNav() {
    document.getElementById('mobile-nav').classList.remove('open');
    document.body.style.overflow = '';
  }
  // Close on backdrop click
  document.getElementById('mobile-nav').addEventListener('click', function(e) {
    if (e.target === this) closeMobileNav();
  });
  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileNav();
  });

  // ─── NAVBAR SHRINK — mobile-aware ───
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    const isMobile = window.innerWidth <= 768;
    if (window.scrollY > 50) {
      nav.style.padding = isMobile ? '10px 4%' : '12px 5%';
    } else {
      nav.style.padding = isMobile ? '14px 4%' : '20px 5%';
    }
  });

