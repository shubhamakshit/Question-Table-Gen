// Navbar Auto-hide on Scroll
(function() {
    let lastScrollTop = 0;
    let scrollThreshold = 10;
    let isScrolling = false;
    
    const navbar = document.querySelector('.modern-app-bar');
    
    if (!navbar) return;
    
    function handleScroll() {
        if (isScrolling) return;
        
        isScrolling = true;
        
        requestAnimationFrame(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Only hide/show if we've scrolled more than the threshold
            if (Math.abs(scrollTop - lastScrollTop) > scrollThreshold) {
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    // Scrolling down & past 100px
                    navbar.classList.add('hidden');
                } else {
                    // Scrolling up
                    navbar.classList.remove('hidden');
                }
                
                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            }
            
            isScrolling = false;
        });
    }
    
    // Debounced scroll event
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(handleScroll, 10);
    }, { passive: true });
    
    // Show navbar on mouse move to top
    document.addEventListener('mousemove', function(e) {
        if (e.clientY < 100) {
            navbar.classList.remove('hidden');
        }
    });
    
    // Always show navbar when at top of page
    window.addEventListener('scroll', function() {
        if (window.pageYOffset === 0) {
            navbar.classList.remove('hidden');
        }
    }, { passive: true });
})();
