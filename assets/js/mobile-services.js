// Mobile Services Layout - Header Stacking (CSS handles the rest)
(function() {
  'use strict';
  
  const originalTitle = 'OUR SERVICES';
  const mobileTitle = 'OUR<br>SERVICES';
  
  function initMobileServices() {
    const isMobile = window.innerWidth <= 768;
    const title = document.querySelector('.services-title');
    
    if (isMobile) {
      // Stack the title explicitly to ensure the break
      if (title && title.innerHTML !== mobileTitle) {
        title.innerHTML = mobileTitle;
      }
    } else {
      // Restore Desktop Title
      if (title && title.innerHTML === mobileTitle) {
        title.innerHTML = originalTitle;
      }
    }
  }
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileServices);
  } else {
    initMobileServices();
  }
  
  // Resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initMobileServices, 250);
  });
})();
