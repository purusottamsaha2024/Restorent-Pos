const API_URL = '/api/orders';

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

const PLACEHOLDER_SVG = {
    'placeholder_fries': '<div style="width:40px;height:40px;background:#e6b800;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-right:10px;">🍟</div>',
    'placeholder_soda': '<div style="width:40px;height:40px;background:#cc0000;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-right:10px;">🥤</div>'
};

async function fetchOrders() {
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            const orders = await res.json();
            renderKitchen(orders);
        }
    } catch (e) {
        console.error("Polling error", e);
    }
}

async function updateStatus(id, status) {
    await fetch(`${API_URL}/${id}/status?status=${status}`, { method: 'PATCH' });
    fetchOrders();
}

function renderKitchen(orders) {
    const container = document.getElementById('kitchen-grid');
    container.innerHTML = '';

    const activeOrders = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    activeOrders.sort((a, b) => a.order_number - b.order_number);

    if (activeOrders.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No active orders</div>';
        return;
    }

    activeOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'card animate-in';
        card.style = `border-left: 6px solid ${getStatusColor(order.status)}; display: flex; flex-direction: column; justify-content: space-between;`;

        // Items Visualization
        let itemsHtml = order.items.map(i => {
            const imgUrl = IMG_MAP[i.name] || '';
            let imgTag = '';
            if (imgUrl.startsWith('placeholder')) {
                imgTag = PLACEHOLDER_SVG[imgUrl];
            } else if (imgUrl) {
                imgTag = `<img src="${imgUrl}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; margin-right: 10px;">`;
            }

            return `
            <div style="display: flex; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                ${imgTag}
                <div style="flex: 1;">
                    <b style="color: var(--primary); font-size: 1.1rem;">${i.quantity}x</b> 
                    <span style="font-size: 1.1rem;">${i.name}</span>
                </div>
            </div>
        `}).join('');

        let actionBtn = '';
        if (order.status === 'PENDING') {
            actionBtn = `<button class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.1rem;" onclick="updateStatus('${order.id}', 'PREPARING')">🔥 START</button>`;
        } else if (order.status === 'PREPARING') {
            actionBtn = `<button class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.1rem; background: var(--success); color: white;" onclick="updateStatus('${order.id}', 'READY')">✅ READY</button>`;
        } else if (order.status === 'READY') {
            actionBtn = `<div style="text-align: center; font-size: 1.2rem; color: var(--success); padding: 10px; background: rgba(0,255,0,0.1); border-radius: 8px;">WAITING PICKUP</div>`;
        }

        // Add DELETE button for cleanup
        const deleteBtn = `<span onclick="updateStatus('${order.id}', 'COMPLETED')" style="cursor: pointer; color: #444; font-size: 0.8rem; float: right;">Clear</span>`;

        card.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div>
                        <h1 style="font-size: 2.5rem; margin: 0; line-height: 1;">#${order.order_number}</h1>
                        ${order.customer_name ? `<div style="font-size: 1.2rem; font-weight: bold; color: var(--primary); margin-top: 4px;">${order.customer_name}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        ${getTimerHtml(order.id, order.estimated_wait_time, order.created_at)}
                        <span class="status-badge" style="background: ${getStatusColor(order.status)}; color: white;">${order.status}</span>
                    </div>
                </div>
                <div style="margin-bottom: 20px;">
                    ${itemsHtml}
                </div>
            </div>
            <div>
                ${actionBtn}
                <div style="margin-top: 10px; font-size: 0.8rem; color: #666; display: flex; justify-content: space-between;">
                    <span>Created: ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    ${order.status === 'READY' ? deleteBtn : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    updateTimers();
}

function updateTimers() {
    document.querySelectorAll('.timer-container').forEach(el => {
        const total = parseFloat(el.dataset.total);
        const created = new Date(el.dataset.created);
        const now = new Date();
        const elapsed = (now - created) / 1000;
        let remaining = total - elapsed;
        if (remaining < 0) remaining = 0;

        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        el.querySelector('.timer-text').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        const circle = el.querySelector('.timer-circle-progress');
        const dashArray = 226;
        const offset = dashArray - (remaining / total) * dashArray;
        circle.style.strokeDashoffset = offset;

        // Kitchen specific: Flash red if overdue/close?
        if (remaining < 60) circle.style.stroke = '#ff3d00';
        else if (remaining < 300) circle.style.stroke = '#ff9100';
        else circle.style.stroke = '#00e676';
    });
}

function getStatusColor(status) {
    if (status === 'PENDING') return '#a0a0a0';
    if (status === 'PREPARING') return '#FF4500';
    if (status === 'READY') return '#00e676';
    return '#333';
}

// Timer Helper
function getTimerHtml(orderId, waitTime, createdAt) {
    const totalSecs = waitTime * 60;
    const dashArray = 226;
    return `
    <div class="timer-container" id="ktimer-${orderId}" data-total="${totalSecs}" data-created="${createdAt}" style="width: 60px; height: 60px;">
        <svg class="timer-svg" viewBox="0 0 88 88">
            <circle class="timer-circle-bg" cx="44" cy="44" r="36"></circle>
            <circle class="timer-circle-progress" cx="44" cy="44" r="36" stroke-dasharray="${dashArray}" stroke-dashoffset="0"></circle>
        </svg>
        <div class="timer-text" style="font-size: 0.8rem;">--:--</div>
    </div>`;
}

setInterval(fetchOrders, 3000);
fetchOrders();
