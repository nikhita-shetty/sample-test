/**
 * SAP Order-to-Cash (O2C) Credit Control Center & AI Risk Advisor
 * Form & Business Logic for KaarTech Scenario Test
 */

// Global State & Constants
const DEFAULT_CREDIT_LIMIT = 150000;
const STORAGE_KEY = 'sap_o2c_orders_v1';

// Initial SAP Sample Mock Orders (Pre-populated for instant demonstration)
const INITIAL_ORDERS = [
  {
    id: 'SO-1001',
    customer: 'KaarTech Logistics Solutions',
    outstandingDue: 100000,
    qty: 50,
    unitPrice: 2000,
    orderValue: 100000,
    totalExposure: 200000,
    creditLimit: 150000,
    status: 'BLOCKED',
    overrideReason: null,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'SO-1002',
    customer: 'Bangalore Tech Park Ltd',
    outstandingDue: 30000,
    qty: 25,
    unitPrice: 2000,
    orderValue: 50000,
    totalExposure: 80000,
    creditLimit: 150000,
    status: 'APPROVED',
    overrideReason: null,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'SO-1003',
    customer: 'Global Hardware Corp',
    outstandingDue: 120000,
    qty: 20,
    unitPrice: 2000,
    orderValue: 40000,
    totalExposure: 160000,
    creditLimit: 150000,
    status: 'BLOCKED',
    overrideReason: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'SO-1004',
    customer: 'Vertex Infotech Solutions',
    outstandingDue: 10000,
    qty: 40,
    unitPrice: 2000,
    orderValue: 80000,
    totalExposure: 90000,
    creditLimit: 150000,
    status: 'APPROVED',
    overrideReason: null,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
  }
];

let ordersState = [];
let activeSelectedOrderIdForRelease = null;

// Currency Formatter (INR ₹)
const formatINR = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initEventListeners();
  updateLiveMeter();
  renderApp();
});

// Load State from LocalStorage or Defaults
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      ordersState = JSON.parse(saved);
    } catch (e) {
      ordersState = [...INITIAL_ORDERS];
    }
  } else {
    ordersState = [...INITIAL_ORDERS];
    saveState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ordersState));
}

// Attach Event Listeners
function initEventListeners() {
  // Form Input change listeners for Live SAP Exposure check
  ['custName', 'outstandingDue', 'laptopQty', 'unitPrice', 'customLimit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateLiveMeter);
    }
  });

  // Preset Scenario Buttons
  document.getElementById('presetHighRisk').addEventListener('click', () => {
    document.getElementById('custName').value = 'KaarTech Sample Customer';
    document.getElementById('outstandingDue').value = 100000;
    document.getElementById('laptopQty').value = 50;
    document.getElementById('unitPrice').value = 2000;
    document.getElementById('customLimit').value = '';
    updateLiveMeter();
  });

  document.getElementById('presetCleanCredit').addEventListener('click', () => {
    document.getElementById('custName').value = 'Clean Credit Retailers';
    document.getElementById('outstandingDue').value = 20000;
    document.getElementById('laptopQty').value = 20;
    document.getElementById('unitPrice').value = 2000;
    document.getElementById('customLimit').value = '';
    updateLiveMeter();
  });

  // Submit Order Form
  document.getElementById('orderForm').addEventListener('submit', handleOrderSubmit);

  // Search & Filter
  document.getElementById('searchInput').addEventListener('input', renderOrdersTable);
  document.getElementById('filterStatus').addEventListener('change', renderOrdersTable);

  // Reset Data & Export CSV Buttons
  document.getElementById('btnResetData').addEventListener('click', () => {
    if (confirm('Reset to original SAP sample data?')) {
      ordersState = [...INITIAL_ORDERS];
      saveState();
      renderApp();
      showToast('Data reset to SAP sample state.', 'info');
    }
  });

  document.getElementById('btnExportCSV').addEventListener('click', exportToCSV);

  // Modal Handlers
  document.getElementById('btnCloseReleaseModal').addEventListener('click', closeReleaseModal);
  document.getElementById('btnCancelRelease').addEventListener('click', closeReleaseModal);
  document.getElementById('btnConfirmRelease').addEventListener('click', confirmReleaseBlock);
}

// Live Exposure Calculation & Meter Preview
function updateLiveMeter() {
  const due = parseFloat(document.getElementById('outstandingDue').value) || 0;
  const qty = parseFloat(document.getElementById('laptopQty').value) || 0;
  const price = parseFloat(document.getElementById('unitPrice').value) || 0;
  const limitInput = parseFloat(document.getElementById('customLimit').value);
  const creditLimit = (limitInput && limitInput > 0) ? limitInput : DEFAULT_CREDIT_LIMIT;

  const orderValue = qty * price;
  const totalExposure = due + orderValue;
  const isBlocked = totalExposure > creditLimit;
  const pct = Math.min(Math.round((totalExposure / creditLimit) * 100), 200);

  // Update DOM elements
  document.getElementById('meterOrderVal').textContent = formatINR(orderValue);
  document.getElementById('meterExposureVal').textContent = formatINR(totalExposure);
  document.getElementById('meterLimitText').textContent = `Credit Limit: ${formatINR(creditLimit)}`;

  const cardEl = document.getElementById('liveMeterCard');
  const badgeEl = document.getElementById('meterStatusBadge');
  const barEl = document.getElementById('meterProgressBar');
  const overLimitText = document.getElementById('meterOverLimitText');

  barEl.style.width = `${Math.min(pct, 100)}%`;

  if (isBlocked) {
    const excess = totalExposure - creditLimit;
    cardEl.className = 'live-meter-card status-blocked-card';
    badgeEl.className = 'meter-status-badge status-blocked';
    badgeEl.textContent = 'WILL BE BLOCKED (Exceeds Limit)';
    barEl.className = 'progress-bar-fill bar-blocked';
    overLimitText.textContent = `Exceeds limit by ${formatINR(excess)} (${pct}% of limit)`;
    overLimitText.classList.remove('hidden');
  } else {
    cardEl.className = 'live-meter-card status-approved-card';
    badgeEl.className = 'meter-status-badge status-approved';
    badgeEl.textContent = 'WILL BE APPROVED';
    barEl.className = 'progress-bar-fill';
    overLimitText.classList.add('hidden');
  }
}

// Handle Order Form Submission
function handleOrderSubmit(e) {
  e.preventDefault();

  const customer = document.getElementById('custName').value.trim();
  const due = parseFloat(document.getElementById('outstandingDue').value) || 0;
  const qty = parseInt(document.getElementById('laptopQty').value, 10) || 0;
  const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 0;
  const customLimit = parseFloat(document.getElementById('customLimit').value);
  const creditLimit = (customLimit && customLimit > 0) ? customLimit : DEFAULT_CREDIT_LIMIT;

  if (!customer || qty <= 0 || unitPrice <= 0) {
    showToast('Please complete all required fields.', 'blocked');
    return;
  }

  const orderValue = qty * unitPrice;
  const totalExposure = due + orderValue;
  const isBlocked = totalExposure > creditLimit;
  const status = isBlocked ? 'BLOCKED' : 'APPROVED';

  const newOrder = {
    id: `SO-${1000 + ordersState.length + 1}`,
    customer,
    outstandingDue: due,
    qty,
    unitPrice,
    orderValue,
    totalExposure,
    creditLimit,
    status,
    overrideReason: null,
    createdAt: new Date().toISOString()
  };

  ordersState.unshift(newOrder);
  saveState();

  // Reset form inputs except limit
  document.getElementById('orderForm').reset();
  updateLiveMeter();

  renderApp();

  if (isBlocked) {
    showToast(`⚠️ Order ${newOrder.id} BLOCKED: Exposure ${formatINR(totalExposure)} exceeds ${formatINR(creditLimit)} limit!`, 'blocked');
  } else {
    showToast(`✅ Sales Order ${newOrder.id} APPROVED and registered in SAP SD.`, 'success');
  }
}

// Render Master Application View
function renderApp() {
  renderKPIs();
  renderOrdersTable();
  renderAIRecommendations();
  renderVisualChart();
}

// Render KPI Cards
function renderKPIs() {
  let approvedRev = 0;
  let blockedRev = 0;
  let approvedCount = 0;
  let blockedCount = 0;
  let riskExposure = 0;

  ordersState.forEach(o => {
    if (o.status === 'APPROVED') {
      approvedRev += o.orderValue;
      approvedCount++;
    } else if (o.status === 'BLOCKED') {
      blockedRev += o.orderValue;
      blockedCount++;
      riskExposure += o.totalExposure;
    }
  });

  const totalOrders = ordersState.length;
  const blockRatioPct = totalOrders > 0 ? Math.round((blockedCount / totalOrders) * 100) : 0;

  document.getElementById('kpiApprovedRev').textContent = formatINR(approvedRev);
  document.getElementById('kpiApprovedCount').textContent = `${approvedCount} Orders Released`;

  document.getElementById('kpiBlockedRev').textContent = formatINR(blockedRev);
  document.getElementById('kpiBlockedCount').textContent = `${blockedCount} Orders Blocked`;

  document.getElementById('kpiBlockRatio').textContent = `${blockRatioPct}%`;
  document.getElementById('kpiBlockRatioText').textContent = `${blockedCount} of ${totalOrders} Total Orders`;

  document.getElementById('kpiRiskExposure').textContent = formatINR(riskExposure);
}

// Render Table of Orders
function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  const emptyState = document.getElementById('emptyTableState');
  const table = document.getElementById('ordersTable');
  
  const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
  const filterStatus = document.getElementById('filterStatus').value;

  const filtered = ordersState.filter(o => {
    const matchesSearch = o.customer.toLowerCase().includes(searchVal) || o.id.toLowerCase().includes(searchVal);
    const matchesStatus = (filterStatus === 'ALL') || (o.status === filterStatus);
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  tbody.innerHTML = filtered.map(o => {
    const isBlocked = o.status === 'BLOCKED';
    const statusBadgeClass = isBlocked ? 'status-badge blocked' : 'status-badge approved';
    const statusText = isBlocked ? 'CR_BLK (Blocked)' : (o.overrideReason ? 'RELEASED (Override)' : 'SO_OK (Approved)');

    return `
      <tr>
        <td class="order-id-cell">${o.id}</td>
        <td class="cust-cell">
          ${escapeHTML(o.customer)}
          ${o.overrideReason ? `<br><small class="text-dim">Reason: ${escapeHTML(o.overrideReason)}</small>` : ''}
        </td>
        <td class="amount-cell">${formatINR(o.outstandingDue)}</td>
        <td>${o.qty} laptops @ ${formatINR(o.unitPrice)}</td>
        <td class="amount-cell"><strong>${formatINR(o.orderValue)}</strong></td>
        <td class="amount-cell">
          <span class="${o.totalExposure > o.creditLimit ? 'text-danger' : ''}">${formatINR(o.totalExposure)}</span>
        </td>
        <td>
          <span class="${statusBadgeClass}">
            ${isBlocked ? '🛑' : '✅'} ${statusText}
          </span>
        </td>
        <td>
          <div class="action-btns">
            ${isBlocked ? `
              <button class="btn-icon override-btn" onclick="openReleaseModal('${o.id}')" title="SAP VKM3 - Release Credit Block">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
              </button>
            ` : ''}
            <button class="btn-icon delete-btn" onclick="deleteOrder('${o.id}')" title="Delete Order">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// AI Risk & Recommendation Engine Logic
function renderAIRecommendations() {
  const container = document.getElementById('aiRecommendationsList');
  const blockedOrders = ordersState.filter(o => o.status === 'BLOCKED');

  if (blockedOrders.length === 0) {
    container.innerHTML = `
      <div class="ai-rec-item success">
        <div class="ai-rec-title">✅ Perfect SAP Credit Health</div>
        <div class="ai-rec-desc">All current sales orders are within authorized credit limits. No blocked orders detected in system.</div>
      </div>
    `;
    return;
  }

  let html = '';
  blockedOrders.forEach(o => {
    const excess = o.totalExposure - o.creditLimit;
    const requiredDownpayment = excess;
    const maxApprovedQty = Math.floor((o.creditLimit - o.outstandingDue) / o.unitPrice);

    html += `
      <div class="ai-rec-item warning">
        <div class="ai-rec-title">⚠️ Risk Alert: ${escapeHTML(o.customer)} (${o.id})</div>
        <div class="ai-rec-desc">
          Total Exposure of <strong>${formatINR(o.totalExposure)}</strong> exceeds limit of <strong>${formatINR(o.creditLimit)}</strong> by <strong>${formatINR(excess)}</strong>.
          <br>
          💡 <strong>AI Recommendation:</strong> Require an upfront payment of <strong>${formatINR(requiredDownpayment)}</strong> from customer to reduce due to ${formatINR(o.outstandingDue - requiredDownpayment)}, or reduce laptop quantity from <strong>${o.qty}</strong> to <strong>${Math.max(0, maxApprovedQty)} laptops</strong> to auto-unblock.
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Visual Chart Breakdown
function renderVisualChart() {
  let approvedRev = 0;
  let blockedRev = 0;

  ordersState.forEach(o => {
    if (o.status === 'APPROVED') approvedRev += o.orderValue;
    if (o.status === 'BLOCKED') blockedRev += o.orderValue;
  });

  const totalRev = approvedRev + blockedRev;
  const approvedPct = totalRev > 0 ? (approvedRev / totalRev) * 100 : 0;
  const blockedPct = totalRev > 0 ? (blockedRev / totalRev) * 100 : 0;

  document.getElementById('chartApprovedLbl').textContent = formatINR(approvedRev);
  document.getElementById('chartBlockedLbl').textContent = formatINR(blockedRev);

  document.getElementById('chartApprovedBar').style.width = `${approvedPct}%`;
  document.getElementById('chartBlockedBar').style.width = `${blockedPct}%`;
}

// Modal Functions - Release Credit Block
window.openReleaseModal = function(orderId) {
  const order = ordersState.find(o => o.id === orderId);
  if (!order) return;

  activeSelectedOrderIdForRelease = orderId;
  const excess = order.totalExposure - order.creditLimit;

  document.getElementById('modalCustName').textContent = order.customer;
  document.getElementById('modalOrderId').textContent = order.id;
  document.getElementById('modalExposure').textContent = formatINR(order.totalExposure);
  document.getElementById('modalLimit').textContent = formatINR(order.creditLimit);
  document.getElementById('modalExcess').textContent = formatINR(excess);

  document.getElementById('releaseModal').classList.remove('hidden');
};

function closeReleaseModal() {
  document.getElementById('releaseModal').classList.add('hidden');
  activeSelectedOrderIdForRelease = null;
}

function confirmReleaseBlock() {
  if (!activeSelectedOrderIdForRelease) return;

  const order = ordersState.find(o => o.id === activeSelectedOrderIdForRelease);
  if (order) {
    const reason = document.getElementById('releaseReason').value;
    const notes = document.getElementById('releaseNotes').value;

    order.status = 'APPROVED';
    order.overrideReason = `${reason} ${notes ? '(' + notes + ')' : ''}`;
    saveState();

    closeReleaseModal();
    renderApp();
    showToast(`✅ SAP Credit Release authorized for ${order.id} under: ${reason}`, 'success');
  }
}

// Delete Order
window.deleteOrder = function(orderId) {
  if (confirm(`Delete Sales Order ${orderId}?`)) {
    ordersState = ordersState.filter(o => o.id !== orderId);
    saveState();
    renderApp();
    showToast(`Order ${orderId} removed.`, 'info');
  }
};

// Export Orders to CSV
function exportToCSV() {
  if (ordersState.length === 0) {
    showToast('No orders available to export.', 'blocked');
    return;
  }

  const headers = ['Order ID', 'Customer Name', 'Outstanding Due (INR)', 'Quantity', 'Unit Price (INR)', 'Order Value (INR)', 'Total Exposure (INR)', 'Credit Limit (INR)', 'Status', 'Override Reason'];
  const rows = ordersState.map(o => [
    o.id,
    `"${o.customer.replace(/"/g, '""')}"`,
    o.outstandingDue,
    o.qty,
    o.unitPrice,
    o.orderValue,
    o.totalExposure,
    o.creditLimit,
    o.status,
    `"${(o.overrideReason || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SAP_O2C_Credit_Block_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('CSV Report exported successfully!', 'success');
}

// Toast Notifications Helper
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${msg}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Utility: HTML Escaper
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
