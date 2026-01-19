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

            renderCustomerView(orders);
            document.getElementById('wait-time').textContent = stats.total_estimated_wait_time + ' min';
        }
    } catch (e) {
        console.error("Polling error", e);
    }
}

function renderCustomerView(orders) {
    const preparingList = document.getElementById('preparing-list');
    const readyList = document.getElementById('ready-list');

    preparingList.innerHTML = '';
    readyList.innerHTML = '';

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

        if (order.status === 'PREPARING' || order.status === 'PENDING') {
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
            const card = document.createElement('div');
            card.className = 'card animate-in';
            card.style = "background: rgba(0, 230, 118, 0.1); border: 2px solid var(--success); text-align: center; padding: 30px;";
            card.innerHTML = `
                <div style="font-size: 0.9rem; color: var(--success); text-transform: uppercase; margin-bottom: 8px;">Order</div>
                <h1 style="margin:0; font-size: 5rem; color: white; line-height: 1;">#${order.order_number}</h1>
                ${order.customer_name ? `<h2 style="margin: 10px 0 0 0; color: #fff;">${order.customer_name}</h2>` : ''}
                <div style="margin-top: 16px; font-weight: bold; color: var(--success);">PLEASE COLLECT</div>
                ${itemsContainer}
            `;
            readyList.appendChild(card);
        }
    });
}

function updateTimers() {
    document.querySelectorAll('.timer-container').forEach(el => {
        const total = parseFloat(el.dataset.total); // seconds
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

        // Color
        if (remaining < 60) circle.style.stroke = '#ff3d00'; // Red
        else if (remaining < 300) circle.style.stroke = '#ff9100'; // Orange
        else circle.style.stroke = '#00e676'; // Green
    });
}

// Global Interval
setInterval(updateTimers, 1000);

// Initial Load
fetchState();
setInterval(fetchState, 3000);

// Helper to create Timer HTML
function getTimerHtml(orderId, waitTime, createdAt) {
    const totalSecs = waitTime * 60;
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
        <div class="timer-text">--:--</div>
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
