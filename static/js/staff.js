const API_URL = '/api/orders';

let currentOrder = {};
let totalAmount = 0;

function addToOrder(name, price, img) {
    if (currentOrder[name]) {
        currentOrder[name].qty += 1;
    } else {
        currentOrder[name] = { price: price, qty: 1, img: img };
    }
    updateUI();
}

function removeFromOrder(name) {
    if (!currentOrder[name]) return;
    currentOrder[name].qty -= 1;
    if (currentOrder[name].qty <= 0) {
        delete currentOrder[name];
    }
    updateUI();
}

// Allow tapping the quantity badge to remove 1 (mobile-friendly)
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.menu-item[data-name]');
    cards.forEach(card => {
        const name = card.dataset.name;
        const price = Number(card.dataset.price || 0);
        const img = card.dataset.img || '';

        // Card click adds item
        card.addEventListener('click', () => addToOrder(name, price, img));

        // Build +/- controls
        const controls = document.createElement('div');
        controls.className = 'qty-controls';
        controls.innerHTML = `
            <button class="qty-btn" aria-label="Remove" data-action="minus">−</button>
            <span class="qty-display" id="display-${name}">0</span>
            <button class="qty-btn" aria-label="Add" data-action="plus">+</button>
        `;
        controls.addEventListener('click', (e) => e.stopPropagation());

        controls.querySelector('[data-action="plus"]').addEventListener('click', () => addToOrder(name, price, img));
        controls.querySelector('[data-action="minus"]').addEventListener('click', () => removeFromOrder(name));

        card.appendChild(controls);
    });

    document.querySelectorAll('.qty-badge').forEach(badge => {
        const name = badge.id.replace('qty-', '');
        badge.style.cursor = 'pointer';
        badge.title = 'Tap to remove one';
        badge.addEventListener('click', (e) => {
            e.stopPropagation(); // avoid adding another item
            removeFromOrder(name);
        });
    });
});

function updateUI() {
    totalAmount = 0;
    let summaryText = [];

    // Reset basic badges and displays
    document.querySelectorAll('.qty-badge').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.qty-display').forEach(el => el.textContent = '0');
    document.querySelectorAll('.qty-controls').forEach(el => el.classList.remove('active'));

    for (const [name, item] of Object.entries(currentOrder)) {
        totalAmount += item.price * item.qty;
        summaryText.push(`${item.qty}x ${name}`);

        const badge = document.getElementById(`qty-${name}`);
        if (badge) {
            badge.textContent = item.qty;
            badge.classList.remove('hidden');
        }
        const display = document.getElementById(`display-${name}`);
        if (display) {
            display.textContent = item.qty;
            display.parentElement.classList.add('active');
        }
    }

    document.getElementById('total-text').textContent = `₡${totalAmount.toLocaleString()}`;
    document.getElementById('summary-text').textContent = summaryText.join(', ') || 'Cart Empty';
    document.getElementById('modal-total').textContent = `₡${totalAmount.toLocaleString()}`;
}

// --- Manual Entry Logic ---

function openManualEntry() {
    document.getElementById('manual-input').value = ""; // Clear Input
    document.getElementById('manual-modal').classList.remove('hidden');
    // Auto focus
    setTimeout(() => document.getElementById('manual-input').focus(), 100);
}

function closeManualModal() {
    document.getElementById('manual-modal').classList.add('hidden');
}

function numInput(num) {
    const input = document.getElementById('manual-input');
    input.value = input.value + num;
}

function numClear() {
    document.getElementById('manual-input').value = "";
}

function addManualItem() {
    const price = parseInt(document.getElementById('manual-input').value);
    if (!price || price <= 0) {
        alert("Please enter a valid price");
        return;
    }
    const name = `Custom (₡${price})`;
    addToOrder(name, price, 'placeholder_manual');
    closeManualModal();
}

// --- Payment & Modals ---

function showPaymentModal() {
    if (totalAmount === 0) {
        alert("Please add items to the order first!");
        return;
    }

    // Pre-calculate Estimated Wait Time based on simple logic for the input field
    let totalPieces = 0;
    for (const [name, item] of Object.entries(currentOrder)) {
        if (name.includes('4')) totalPieces += 4 * item.qty;
        else if (name.includes('8')) totalPieces += 8 * item.qty;
        else if (name.includes('12')) totalPieces += 12 * item.qty;
        else if (name.includes('16')) totalPieces += 16 * item.qty;
        else if (name.includes('Personal')) totalPieces += 2 * item.qty;
        else if (name.includes('Familiar')) totalPieces += 8 * item.qty;
        else totalPieces += 2 * item.qty;
    }

    let est = 15;
    if (totalPieces > 8) est = 20;
    if (totalPieces > 16) est = 20 + (totalPieces - 16);

    document.getElementById('wait-time-input').value = est;
    document.getElementById('cust-name').value = ""; // Reset name
    document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
}

async function processPayment(method) {
    const items = Object.entries(currentOrder).map(([name, item]) => ({
        name: name,
        quantity: item.qty,
        price: item.price
    }));

    const custName = document.getElementById('cust-name').value;
    const waitTime = parseInt(document.getElementById('wait-time-input').value) || null;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: items,
                total_price: totalAmount,
                payment_method: method,
                customer_name: custName,
                estimated_wait_time: waitTime
            })
        });

        if (res.ok) {
            const order = await res.json();
            showSuccess(order);
        } else {
            const err = await res.text();
            console.error(err);
            alert("Error placing order: " + err);
        }
    } catch (err) {
        console.error("Payment failed", err);
        alert("Network error: " + err);
    }
}

function showSuccess(order) {
    closePaymentModal();
    // Reset Order
    currentOrder = {};
    updateUI();

    document.getElementById('success-order-num').textContent = `#${order.order_number}`;
    document.getElementById('success-time').textContent = `${order.estimated_wait_time} mins`;
    document.getElementById('success-modal').classList.remove('hidden');
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
}
