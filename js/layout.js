(function () {
  var headerHTML = [
    '<header class="site-header">',
    '  <div class="container">',
    '    <a href="/" class="site-logo">Den<span>sanon</span></a>',
    '    <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">',
    '      <span></span><span></span><span></span>',
    '    </button>',
    '    <nav class="site-nav" id="siteNav">',
    '      <a href="/services.html">Services</a>',
    '      <a href="/#products">Products</a>',
    '      <a href="/quote.html">Quote</a>',
    '      <a href="/#contact">Contact</a>',
    '    </nav>',
    '  </div>',
    '</header>'
  ].join('\n');

  var footerHTML = [
    '<footer class="site-footer">',
    '  <div class="container">',
    '    <div class="footer-grid">',
    '      <div class="footer-brand">',
    '        <p class="footer-logo">Den<span>sanon</span></p>',
    '        <p class="footer-copy">&copy; 2026 Densanon LLC. All rights reserved.</p>',
    '      </div>',
    '      <div class="footer-links">',
    '        <h4>Quick Links</h4>',
    '        <a href="/">Home</a>',
    '        <a href="/services.html">Services</a>',
    '        <a href="/quote.html">Quote</a>',
    '        <a href="/#contact">Contact</a>',
    '      </div>',
    '      <div class="footer-contact">',
    '        <h4>Contact</h4>',
    '        <p><a href="tel:+12086609798">(208) 660-9798</a></p>',
    '        <p><a href="mailto:densanon@gmail.com">densanon@gmail.com</a></p>',
    '        <p>Post Falls, Idaho</p>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</footer>'
  ].join('\n');

  // Inject header
  var headerEl = document.getElementById('site-header');
  if (headerEl) {
    headerEl.outerHTML = headerHTML;
  }

  // Inject footer
  var footerEl = document.getElementById('site-footer');
  if (footerEl) {
    footerEl.outerHTML = footerHTML;
  }

  // Hamburger toggle
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      siteNav.classList.toggle('nav-open');
    });
  }

  // Close nav on link click (mobile)
  if (siteNav) {
    siteNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        siteNav.classList.remove('nav-open');
      });
    });
  }

  // Active nav link highlighting
  var pathname = window.location.pathname;
  if (pathname === '/index.html') pathname = '/';

  document.querySelectorAll('.site-nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.indexOf('#') !== -1) return;
    var linkPath = href;
    try {
      linkPath = new URL(href, window.location.origin).pathname;
    } catch (e) {}
    if (linkPath === pathname) {
      a.classList.add('active');
    }
  });
})();
