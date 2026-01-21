const IMG_MAP = {
    'Combo 4': '/static/images/combo_4.png',
    'Combo 8': '/static/images/combo_8.png',
    'Combo 12': '/static/images/combo_12.png',
    'Combo 16': '/static/images/combo_16.png',
    'Personal': '/static/images/personal.png',
    'Familiar': '/static/images/familiar.png',
    'Fries': 'placeholder_fries',
    'Soda': 'placeholder_soda'
};

/* SVG Placeholders for Missing Images */
const PLACEHOLDER_SVG = {
    'placeholder_fries': '<div style="width:40px;height:40px;background:#e6b800;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">🍟</div>',
    'placeholder_soda': '<div style="width:40px;height:40px;background:#cc0000;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">🥤</div>'
};

async function fetchState() {
    try {
        const [ordersRes, statsRes] = await Promise.all([
            fetch('/api/orders'),
            fetch('/api/queue-stats')
        ]);

        if (ordersRes.ok && statsRes.ok) {
            const orders = await ordersRes.json();
            const stats = await statsRes.json();

            renderCustomerView(orders, stats);
            document.getElementById('wait-time').textContent = ((stats.total_estimated_wait_time ?? 0) || 0) + ' min';
        }
    } catch (e) {
        console.error("Polling error", e);
    }
}

function renderCustomerView(orders, stats = {}) {
    // Check for new READY orders before rendering
    checkReadyNotifications(orders);
    
    const preparingList = document.getElementById('preparing-list');
    const readyList = document.getElementById('ready-list');

    preparingList.innerHTML = '';
    readyList.innerHTML = '';

    let preparingCount = 0;
    let readyCount = 0;

    orders.forEach(order => {
        // Visualize items for "Preparing" orders
        let itemsHtml = order.items.map(i => {
            const imgUrl = IMG_MAP[i.name] || '';
            if (imgUrl.startsWith('placeholder')) {
                return PLACEHOLDER_SVG[imgUrl];
            }
            if (imgUrl) return `<img src="${imgUrl}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; border: 1px solid #333;">`;
            return '';
        }).join('');

        // Container for item images
        const itemsContainer = itemsHtml ? `<div style="display: flex; gap: 4px; justify-content: center; margin-top: 10px; flex-wrap: wrap;">${itemsHtml}</div>` : '';

        // Only show PREPARING for actual PREPARING orders, not PENDING
        if (order.status === 'PREPARING') {
            preparingCount += 1;
            const card = document.createElement('div');
            card.className = 'card animate-in';
            card.style = "border: 1px solid var(--preparing); text-align: center; padding: 20px; display: flex; flex-direction: column; align-items: center;";
            card.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; width: 100%;">
                    <div>
                        <h1 style="margin:0; font-size: 3rem; color: var(--text-main); line-height: 1;">#${order.order_number}</h1>
                        ${order.customer_name ? `<h3 style="margin: 5px 0 0 0; color: #fff;">${order.customer_name}</h3>` : ''}
                    </div>
                    ${getTimerHtml(order.id, order.estimated_wait_time, order.created_at)}
                </div>
                <div style="margin-top: 16px;">
                    ${CHICKEN_ANIM_HTML}
                    <div style="font-size: 0.8rem; color: #888;">PREPARING</div>
                </div>
                ${itemsContainer}
            `;
            preparingList.appendChild(card);
        } else if (order.status === 'READY') {
            readyCount += 1;
            const card = document.createElement('div');
            card.className = 'card animate-in';
            card.style = "background: rgba(0, 230, 118, 0.1); border: 2px solid var(--success); text-align: center; padding: 30px;";
            card.innerHTML = `
                <div style="font-size: 0.9rem; color: var(--success); text-transform: uppercase; margin-bottom: 8px;">Order</div>
                <h1 style="margin:0; font-size: 5rem; color: white; line-height: 1;">#${order.order_number}</h1>
                ${order.customer_name ? `<h2 style="margin: 10px 0 0 0; color: #fff;">${order.customer_name}</h2>` : ''}
                <div style="margin-top: 16px; font-weight: bold; color: var(--success);">PLEASE COLLECT</div>
                ${itemsContainer}
                <button onclick="markOrderCompleted('${order.id}')" style="margin-top: 16px; padding: 10px 20px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 8px; color: white; cursor: pointer; font-size: 0.9rem;">Mark as Completed</button>
            `;
            readyList.appendChild(card);
        }
    });

    // Update stat pills
    const totalActive = preparingCount + readyCount;
    const safeSet = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    safeSet('stat-preparing', preparingCount || 0);
    safeSet('stat-ready', readyCount || 0);
    safeSet('stat-total', (stats.active_orders_count ?? totalActive ?? 0) || 0);
}

function updateTimers() {
    document.querySelectorAll('.timer-container').forEach(el => {
        let total = parseFloat(el.dataset.total); // seconds
        if (!total || total <= 0) total = 900; // 15 min fallback
        const created = new Date(el.dataset.created);
        const now = new Date();
        const elapsed = (now - created) / 1000;
        let remaining = total - elapsed;

        if (remaining < 0) remaining = 0;

        // Text
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        el.querySelector('.timer-text').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Ring
        const circle = el.querySelector('.timer-circle-progress');
        const dashArray = 226;
        const offset = dashArray - (remaining / total) * dashArray;
        circle.style.strokeDashoffset = offset;

        // Color-coded timers: green <5min, yellow 5-10min, orange 10-15min, red >15min
        const remainingMins = remaining / 60;
        if (remainingMins < 5) {
            circle.style.stroke = '#ff3d00'; // Red - urgent
            el.querySelector('.timer-text').style.color = '#ff3d00';
        } else if (remainingMins < 10) {
            circle.style.stroke = '#ff9100'; // Orange - getting close
            el.querySelector('.timer-text').style.color = '#ff9100';
        } else if (remainingMins < 15) {
            circle.style.stroke = '#ffd700'; // Yellow - watch
            el.querySelector('.timer-text').style.color = '#ffd700';
        } else {
            circle.style.stroke = '#00e676'; // Green - on time
            el.querySelector('.timer-text').style.color = '#00e676';
        }
    });
}

// Global Interval
setInterval(updateTimers, 1000);

// Mark order as completed
async function markOrderCompleted(orderId) {
    try {
        await fetch(`/api/orders/${orderId}/status?status=COMPLETED`, { method: 'PATCH' });
        fetchState();
    } catch (e) {
        console.error("Error marking order as completed", e);
    }
}

// Initial Load
fetchState();
setInterval(fetchState, 3000);

// Helper to create Timer HTML
function getTimerHtml(orderId, waitTime, createdAt) {
    const safeWait = (waitTime && waitTime > 0) ? waitTime : 15; // default 15 mins if missing
    const totalSecs = safeWait * 60;
    const now = new Date();
    const created = new Date(createdAt);
    const elapsed = (now - created) / 1000;
    const remaining = Math.max(0, totalSecs - elapsed);

    // Circle circumference for r=36 is ~226
    const dashArray = 226;

    return `
    <div class="timer-container" id="timer-${orderId}" data-total="${totalSecs}" data-created="${createdAt}">
        <svg class="timer-svg" viewBox="0 0 88 88">
            <circle class="timer-circle-bg" cx="44" cy="44" r="36"></circle>
            <circle class="timer-circle-progress" cx="44" cy="44" r="36" stroke-dasharray="${dashArray}" stroke-dashoffset="0"></circle>
        </svg>
        <div class="timer-text">${Math.floor(remaining/60)}:${Math.floor(remaining%60).toString().padStart(2,'0')}</div>
    </div>`;
}

// Chicken Animation HTML
const CHICKEN_ANIM_HTML = `
<div class="cooking-anim">
    <div class="chicken-bounce">🐔</div>
    <div class="fire-base">🔥</div>
    <div class="smoke-particle"></div>
    <div class="smoke-particle"></div>
    <div class="smoke-particle"></div>
</div>`;

// Notification system
let lastReadyOrders = new Set();
function checkReadyNotifications(orders) {
    const currentReady = new Set(orders.filter(o => o.status === 'READY').map(o => o.id));
    const newReady = [...currentReady].filter(id => !lastReadyOrders.has(id));
    
    if (newReady.length > 0) {
        playReadyNotification();
    }
    
    lastReadyOrders = currentReady;
}

function playReadyNotification() {
    // Create audio context for notification sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log("Audio notification not available");
    }
    
    // Visual flash
    document.body.style.transition = 'background-color 0.1s';
    document.body.style.backgroundColor = 'rgba(0, 230, 118, 0.2)';
    setTimeout(() => {
        document.body.style.backgroundColor = '';
    }, 200);
}
