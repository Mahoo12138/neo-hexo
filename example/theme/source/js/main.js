/**
 * Neo-Hexo Example Theme — Client JavaScript
 *
 * Lightweight enhancements: smooth scroll to anchors, external link handling.
 */

(function () {
  'use strict';

  // ─── External Links: open in new tab ─────────────────────────────────────

  document.querySelectorAll('a[href^="http"]').forEach(function (link) {
    if (link.hostname !== location.hostname) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // ─── Smooth scroll for anchor links ──────────────────────────────────────

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── Copy code button ────────────────────────────────────────────────────

  document.querySelectorAll('pre code').forEach(function (block) {
    var pre = block.parentElement;
    if (!pre) return;

    pre.style.position = 'relative';

    var btn = document.createElement('button');
    btn.textContent = 'Copy';
    btn.style.cssText =
      'position:absolute;top:8px;right:8px;padding:4px 8px;' +
      'font-size:12px;background:#334155;color:#94a3b8;border:none;' +
      'border-radius:4px;cursor:pointer;opacity:0;transition:opacity 0.2s;';

    pre.appendChild(btn);

    pre.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
    pre.addEventListener('mouseleave', function () { btn.style.opacity = '0'; });

    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(block.textContent || '').then(function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
      });
    });
  });
})();
