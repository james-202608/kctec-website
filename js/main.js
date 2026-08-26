// ===== 韩中经贸交流中心 网站脚本 =====

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initMobileMenu();
    initNavbarScroll();
    initContactForm();
    initFAQ();
    initScrollAnimations();
    initSmoothScroll();
    initCounterAnimation();
    
    console.log('🌐 韩中经贸交流中心 / 한중경제무역교류센터 - 网站加载完成');
});

// ===== 主题切换（三主题循环：品牌 → 政务 → 深色 → 品牌）=====
function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem('kctec-theme');
    
    // 三主题配置
    const themes = [
        { name: 'brand', icon: '🎨', label: '品牌模式' },
        { name: 'gov', icon: '🏛️', label: '政务模式' },
        { name: 'dark', icon: '🌙', label: '深色模式' }
    ];
    
    // 初始化主题
    let currentIndex = 0;
    if (saved) {
        const idx = themes.findIndex(t => t.name === saved);
        if (idx >= 0) currentIndex = idx;
    }
    
    applyTheme(themes[currentIndex]);
    
    if (toggle) {
        toggle.title = themes[currentIndex].label + '（点击切换）';
        toggle.addEventListener('click', function() {
            currentIndex = (currentIndex + 1) % themes.length;
            applyTheme(themes[currentIndex]);
            toggle.title = themes[currentIndex].label + '（点击切换）';
            localStorage.setItem('kctec-theme', themes[currentIndex].name);
        });
    }
    
    function applyTheme(theme) {
        if (theme.name === 'brand') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme.name);
        }
        if (toggle) toggle.textContent = theme.icon;
    }
}

// ===== 移动端菜单 =====
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (!mobileMenuBtn || !navLinks) return;
    
    mobileMenuBtn.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        const spans = mobileMenuBtn.querySelectorAll('span');
        if (navLinks.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(3px, 3px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(3px, -3px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
    
    // 点击导航链接后关闭菜单
    const links = navLinks.querySelectorAll('a');
    links.forEach(function(link) {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                navLinks.classList.remove('active');
                const spans = mobileMenuBtn.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    });
}

// ===== 导航栏滚动效果 =====
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

// ===== 联系表单 =====
function initContactForm() {
    const form = document.getElementById('contactForm');
    const message = document.getElementById('formMessage');
    
    if (!form || !message) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = form.querySelector('#name').value.trim();
        const phone = form.querySelector('#phone').value.trim();
        const type = form.querySelector('#type').value;
        const msg = form.querySelector('#message').value.trim();
        
        if (!name || !phone || !type || !msg) {
            showFormMessage(message, '请填写所有必填项！ / 필수항목을 모두 입력해 주세요!', 'error');
            return;
        }
        
        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '提交中... / 제출중...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        
        setTimeout(function() {
            showFormMessage(message, '提交成功！我们会尽快与您联系。 / 제출이 완료되었습니다! 빠른 시일내에 연락드리겠습니다.', 'success');
            form.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }, 1500);
    });
}

function showFormMessage(element, text, type) {
    element.textContent = text;
    element.className = 'form-message ' + type;
    
    setTimeout(function() {
        element.className = 'form-message';
    }, 5000);
}

// ===== FAQ 折叠面板 =====
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length === 0) return;
    
    faqItems.forEach(function(item) {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');
            
            // 关闭所有
            faqItems.forEach(function(i) {
                i.classList.remove('active');
            });
            
            // 如果之前不是打开状态，则打开当前项
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ===== 滚动动画 =====
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // 观察卡片元素
    const cards = document.querySelectorAll('.service-card, .benefit-card, .event-card, .tier-card, .timeline-content, .contact-info-item');
    
    cards.forEach(function(card, index) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease ' + (index % 3 * 0.1) + 's, transform 0.6s ease ' + (index % 3 * 0.1) + 's';
        observer.observe(card);
    });
}

// ===== 平滑滚动 =====
function initSmoothScroll() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    
    anchors.forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = 80; // 导航栏高度
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== 数字计数动画 =====
function initCounterAnimation() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    if (statNumbers.length === 0) return;
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                animateNumber(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(function(el) {
        observer.observe(el);
    });
}

function animateNumber(element) {
    const text = element.textContent;
    const numMatch = text.match(/(\d+)/);
    if (!numMatch) return;
    
    const target = parseInt(numMatch[1]);
    const suffix = text.replace(numMatch[1], '');
    const duration = 1500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 缓动函数
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * easeOut);
        
        element.textContent = current + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target + suffix;
        }
    }
    
    requestAnimationFrame(update);
}
