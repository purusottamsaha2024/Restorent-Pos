const API_URL = '/api/orders';

let currentOrder = {};
let totalAmount = 0;
let orderReadyTime = 15; // Single order-level ready time in minutes (default 15)

function addToOrder(name, price, img) {
    if (currentOrder[name]) {
        currentOrder[name].qty += 1;
    } else {
        currentOrder[name] = { price: price, qty: 1, img: img };
    }
    // Set default ready time to 15 when cart becomes non-empty
    if (Object.keys(currentOrder).length === 1 && orderReadyTime === 15) {
        orderReadyTime = 15;
        updateReadyTimeUI();
    }
    updateUI();
}

function removeFromOrder(name) {
    if (!currentOrder[name]) return;
    currentOrder[name].qty -= 1;
    if (currentOrder[name].qty <= 0) {
        delete currentOrder[name];
    }
    // Reset ready time to 15 if cart becomes empty
    if (Object.keys(currentOrder).length === 0) {
        orderReadyTime = 15;
        updateReadyTimeUI();
    }
    updateUI();
}

// Allow tapping the quantity badge to remove 1 (mobile-friendly)
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ready time selector
    orderReadyTime = 15;
    updateReadyTimeUI();
    
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
    
    // Show/hide ready time selector based on cart state
    const selector = document.getElementById('ready-time-selector');
    if (selector) {
        if (Object.keys(currentOrder).length > 0) {
            selector.style.display = 'block';
        } else {
            selector.style.display = 'none';
        }
    }
    
    updateReadyTimeUI();
}

// Update the ready time selector UI
function updateReadyTimeUI() {
    const options = [15, 20, 25, 30];
    options.forEach(min => {
        const btn = document.getElementById(`ready-time-${min}`);
        if (btn) {
            if (orderReadyTime === min) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    const display = document.getElementById('wait-time-display');
    if (display) {
        display.textContent = `${orderReadyTime} min`;
    }
    const input = document.getElementById('wait-time-input');
    if (input) {
        input.value = orderReadyTime;
    }
}

// Set order ready time
function setOrderReadyTime(minutes) {
    orderReadyTime = minutes;
    updateReadyTimeUI();
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
    // Use proper currency symbol
    const name = `Custom (₡${price.toLocaleString()})`;
    addToOrder(name, price, 'placeholder_manual');
    closeManualModal();
}

// --- Payment & Modals ---

function showReviewModal() {
    if (totalAmount === 0) {
        alert("Please add items to the order first!");
        return;
    }

    // Build review list
    let reviewHtml = '';
    for (const [name, item] of Object.entries(currentOrder)) {
        const itemTotal = item.price * item.qty;
        // Escape name for use in HTML attributes
        const safeName = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        reviewHtml += `
            <div class="review-item" data-name="${safeName}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 1.1rem;">${item.qty}x ${name}</div>
                        <div style="color: #888; font-size: 0.9rem;">₡${item.price.toLocaleString()} each</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">₡${itemTotal.toLocaleString()}</div>
                        <button class="qty-btn" onclick="editReviewItem('${safeName}', -1)" style="width: 32px; height: 32px; padding: 0;" aria-label="Decrease quantity">−</button>
                        <span style="min-width: 30px; text-align: center;">${item.qty}</span>
                        <button class="qty-btn" onclick="editReviewItem('${safeName}', 1)" style="width: 32px; height: 32px; padding: 0;" aria-label="Increase quantity">+</button>
                        <button class="qty-btn" onclick="removeReviewItem('${safeName}')" style="width: 32px; height: 32px; padding: 0; background: #ff4444;" aria-label="Remove item">×</button>
                    </div>
                </div>
            </div>
        `;
    }

    document.getElementById('review-items').innerHTML = reviewHtml;
    document.getElementById('review-total').textContent = `₡${totalAmount.toLocaleString()}`;
    
    // Display order ready time
    const totalPrepTimeEl = document.getElementById('review-total-prep-time');
    if (totalPrepTimeEl) {
        totalPrepTimeEl.textContent = `${orderReadyTime} min`;
    }
    
    // Update ready time selector in review modal
    updateReviewReadyTimeUI();
    
    document.getElementById('review-modal').classList.remove('hidden');
}

function updateReviewReadyTimeUI() {
    const options = [15, 20, 25, 30];
    options.forEach(min => {
        const btn = document.getElementById(`review-ready-time-${min}`);
        if (btn) {
            if (orderReadyTime === min) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    const display = document.getElementById('review-total-prep-time');
    if (display) {
        display.textContent = `${orderReadyTime} min`;
    }
}

function editReviewItem(itemName, delta) {
    // Find the actual item name (handle escaped names)
    const actualName = Object.keys(currentOrder).find(name => 
        name.replace(/'/g, "\\'").replace(/"/g, '&quot;') === itemName
    ) || itemName;
    
    if (delta > 0) {
        addToOrder(actualName, currentOrder[actualName].price, currentOrder[actualName].img);
    } else {
        removeFromOrder(actualName);
    }
    showReviewModal(); // Refresh review
}

function removeReviewItem(itemName) {
    // Find the actual item name (handle escaped names)
    const actualName = Object.keys(currentOrder).find(name => 
        name.replace(/'/g, "\\'").replace(/"/g, '&quot;') === itemName
    ) || itemName;
    
    delete currentOrder[actualName];
    updateUI();
    showReviewModal(); // Refresh review
}

function closeReviewModal() {
    document.getElementById('review-modal').classList.add('hidden');
}

function proceedToPayment() {
    closeReviewModal();
    
    // Use the order-level ready time
    document.getElementById('wait-time-input').value = orderReadyTime;
    document.getElementById('cust-name').value = ""; // Reset name
    document.getElementById('payment-modal').classList.remove('hidden');
}

function showPaymentModal() {
    showReviewModal(); // Show review first
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
    // Use order-level ready time (allow manual override in payment modal if needed)
    const waitTime = parseInt(document.getElementById('wait-time-input').value) || orderReadyTime;

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
    // Reset Order and ready time
    currentOrder = {};
    orderReadyTime = 15; // Reset to default
    updateUI();

    document.getElementById('success-order-num').textContent = `#${order.order_number}`;
    document.getElementById('success-time').textContent = `${order.estimated_wait_time} mins`;
    document.getElementById('success-modal').classList.remove('hidden');
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
}
