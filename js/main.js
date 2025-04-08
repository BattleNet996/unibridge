// Mobile menu toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('button[aria-expanded]');
    if (mobileMenuButton) {
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'sm:hidden';
        mobileMenu.id = 'mobile-menu';
        mobileMenu.innerHTML = `
            <div class="px-2 pt-2 pb-3 space-y-1">
                <a href="index.html" class="bg-primary-50 text-primary-700 block px-3 py-2 rounded-md text-base font-medium">首页</a>
                <a href="features.html" class="text-gray-700 hover:bg-gray-50 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">功能</a>
                <a href="community.html" class="text-gray-700 hover:bg-gray-50 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">社区</a>
                <a href="about.html" class="text-gray-700 hover:bg-gray-50 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">关于我们</a>
                <div class="pt-4 pb-3 border-t border-gray-200">
                    <a href="login.html" class="text-gray-700 hover:bg-gray-50 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">登录</a>
                    <a href="signup.html" class="text-primary-700 hover:bg-primary-50 block px-3 py-2 rounded-md text-base font-medium">注册</a>
                </div>
            </div>
        `;
        
        mobileMenu.style.display = 'none';
        mobileMenuButton.parentNode.parentNode.parentNode.appendChild(mobileMenu);
        
        mobileMenuButton.addEventListener('click', function() {
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            mobileMenu.style.display = expanded ? 'none' : 'block';
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Form validation for contact forms if they exist
    const contactForm = document.querySelector('form.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Basic validation
            let valid = true;
            const requiredFields = this.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    valid = false;
                    field.classList.add('border-red-500');
                    
                    // Add error message if it doesn't exist
                    let errorMsg = field.parentNode.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('p');
                        errorMsg.className = 'text-red-500 text-sm mt-1 error-message';
                        errorMsg.textContent = '此字段为必填项';
                        field.parentNode.appendChild(errorMsg);
                    }
                } else {
                    field.classList.remove('border-red-500');
                    const errorMsg = field.parentNode.querySelector('.error-message');
                    if (errorMsg) {
                        errorMsg.remove();
                    }
                }
            });
            
            if (valid) {
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4';
                successMsg.innerHTML = '<strong class="font-bold">提交成功！</strong><span class="block sm:inline"> 我们会尽快与您联系。</span>';
                
                this.parentNode.appendChild(successMsg);
                this.reset();
                
                // Remove success message after 5 seconds
                setTimeout(() => {
                    successMsg.remove();
                }, 5000);
            }
        });
    }
});
