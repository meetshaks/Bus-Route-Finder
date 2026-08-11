/**
 * Utility Functions for Bus Route Finder
 */

/**
 * Show notification modal with message
 */
function showNotification(type, title, message) {
    const modal = document.getElementById('notificationModal');
    const icon = document.getElementById('notificationModalIcon');
    const titleEl = document.getElementById('notificationModalTitle');
    const bodyEl = document.getElementById('notificationModalBody');
    let okBtn = document.getElementById('notificationModalOk');

    // Set icon and color
    if (type === 'success') {
        icon.innerHTML = '<i class="fas fa-check-circle text-success"></i>';
        titleEl.style.color = '#16a34a';
    } else if (type === 'info') {
        icon.innerHTML = '<i class="fas fa-info-circle text-info"></i>';
        if (title === 'No Direct Bus Found') {
            titleEl.style.color = '#dc2626';
        } else {
            titleEl.style.color = '#2563eb';
        }
    } else if (type === 'error') {
        icon.innerHTML = '<i class="fas fa-times-circle text-danger"></i>';
        titleEl.style.color = '#dc2626';
    } else {
        icon.innerHTML = '';
        titleEl.style.color = '#1f2937';
    }

    titleEl.textContent = title;
    bodyEl.innerHTML = message;
    modal.style.display = 'flex';

    okBtn.onclick = null;
    okBtn.onclick = function (e) {
        e.preventDefault();
        modal.style.display = 'none';
    };
    okBtn.focus();

    // Allow closing by clicking outside modal
    modal.onclick = function (e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Allow closing with Escape key
    document.onkeydown = function (e) {
        if (modal.style.display === 'flex' && e.key === 'Escape') {
            modal.style.display = 'none';
        }
    };
}

/**
 * Get coordinates for a place
 */
function getPlaceCoordinates(placeName, places) {
    const place = places.find(p => p.name === placeName);
    if (place && place.latitude !== null && place.longitude !== null) {
        return [place.latitude, place.longitude];
    }
    return null;
}

/**
 * Disable developer tools
 */
function disableDeveloperTools() {
    // Disable right click
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    // document.addEventListener('keydown', function (e) {
    //     if (
    //         e.key === 'F12' ||
    //         (e.ctrlKey && e.shiftKey && e.key === 'I') ||
    //         (e.ctrlKey && e.shiftKey && e.key === 'J') ||
    //         (e.ctrlKey && e.key === 'U')
    //     ) {
    //         e.preventDefault();
    //         return false;
    //     }
    // });
}

/**
 * Handle welcome notice modal
 */
function setupWelcomeNotice() {
    const welcomeNotice = document.getElementById('welcomeNotice');
    const closeWelcomeNotice = document.querySelector('.welcome-notice-close');
    const btnAppInfo = document.getElementById('btn-app-info');

    if (welcomeNotice) {
        // Show with a slight delay for better transition effect
        setTimeout(() => {
            welcomeNotice.style.display = 'flex';
            setTimeout(() => {
                welcomeNotice.classList.add('active');
            }, 10);
        }, 500);
    }

    if (closeWelcomeNotice) {
        closeWelcomeNotice.addEventListener('click', function () {
            welcomeNotice.classList.remove('active');
            setTimeout(() => {
                welcomeNotice.style.display = 'none';
            }, 500);
        });
    }

    if (welcomeNotice) {
        welcomeNotice.addEventListener('click', function (e) {
            if (e.target === welcomeNotice) {
                welcomeNotice.classList.remove('active');
                setTimeout(() => {
                    welcomeNotice.style.display = 'none';
                }, 500);
            }
        });
    }

    if (btnAppInfo && welcomeNotice) {
        btnAppInfo.addEventListener('click', function () {
            welcomeNotice.style.display = 'flex';
            setTimeout(() => {
                welcomeNotice.classList.add('active');
            }, 10);
        });
    }
}

// Functions are now globally available - no export needed for regular script loading
// ===== COMPREHENSIVE SECURITY BLOCKING =====
// Block right-click context menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Block F12 (Developer Tools)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
});

// Block Ctrl+Shift+I (Developer Tools)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
});

// Block Ctrl+Shift+J (Console)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
});

// Block Ctrl+Shift+C (Inspect Element)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
    }
});

// Block Ctrl+Shift+K (Console - Firefox)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        return false;
    }
});

// Block Ctrl+Shift+Delete (DevTools - Chrome)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Delete') {
        e.preventDefault();
        return false;
    }
});

// Block copy functionality
document.addEventListener('copy', (e) => {
    e.preventDefault();
    return false;
});

// Block cut functionality
document.addEventListener('cut', (e) => {
    e.preventDefault();
    return false;
});

// Block paste functionality
document.addEventListener('paste', (e) => {
    e.preventDefault();
    return false;
});

// Block text selection on page
document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
});

// Block mouse select
document.addEventListener('mousedown', (e) => {
    if (e.detail > 1) {
        e.preventDefault();
        return false;
    }
});

// Disable drag and drop
document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    return false;
});

// Block keyboard shortcuts for developer tools and cache clearing
document.addEventListener('keydown', (e) => {
    // Ctrl+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
    }
    // Ctrl+P (Print)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        return false;
    }
    // Ctrl+O (Open)
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        return false;
    }
    // Ctrl+U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
    }
});

// Disable right-click on images
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
    }
});

// Detect if DevTools is open
setInterval(() => {
    const start = new Date();
    debugger;
    const end = new Date();
    if (end - start > 100) {
        // DevTools is likely open
        document.body.innerHTML = '<h1 style="text-align:center; margin-top: 50px; color: red;">Developer Tools are not allowed!</h1>';
    }
}, 1000);

// Additional CSS to prevent selection
const style = document.createElement('style');
style.innerHTML = `
            * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-user-drag: none !important;
            }
            body {
                -webkit-touch-callout: none !important;
            }
        `;
document.head.appendChild(style);