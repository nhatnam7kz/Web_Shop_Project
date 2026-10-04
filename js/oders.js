/**
 * js/orders.js - Quản lý Đơn hàng & Thanh toán (Phụ trách: Nam)
 * Quy ước: CONVENTIONS.md
 */

// ==========================================
// 1. CÁC HÀM XỬ LÝ ĐƠN HÀNG DÙNG CHUNG (API)
// ==========================================

/**
 * Lấy danh sách toàn bộ đơn hàng từ localStorage
 * @returns {Array} Mảng các đơn hàng
 */
function getAllOrders() {
  try {
    const key = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.orders) ? STORAGE_KEYS.orders : "shop_orders";
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Tạo đơn hàng mới từ giỏ hàng hiện tại
 * @param {Object} shippingInfo { fullName, phone, email, address, note }
 * @param {string} paymentMethod 'cod' | 'bank' | 'momo'
 * @returns {Promise<string>} Mã đơn hàng vừa tạo (orderId)
 */
async function createOrder(shippingInfo, paymentMethod = "cod") {
  const cart = getCart();
  if (cart.length === 0) {
    throw new Error("Giỏ hàng đang trống, không thể tạo đơn!");
  }

  // Chụp lại thông tin sản phẩm tại thời điểm đặt hàng (Snapshot)
  const orderItems = [];
  let subtotal = 0;

  for (const item of cart) {
    let product = null;
    if (typeof getProductById === "function") {
      product = await getProductById(item.id);
    }

    if (product) {
      const price = typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
      const img = (product.images && product.images[0]) ? product.images[0] : "placeholder.jpg";

      orderItems.push({
        id: product.id,
        name: product.name,
        image: img,
        price: price,
        size: item.size,
        color: item.color,
        qty: item.qty
      });

      subtotal += price * item.qty;
    }
  }

  const shippingFee = typeof SHIPPING_FEE !== "undefined" ? SHIPPING_FEE : 30000;
  const currentKey = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.currentUser) ? STORAGE_KEYS.currentUser : "shop_currentUser";
  const currentUser = localStorage.getItem(currentKey);
  const userEmail = currentUser ? JSON.parse(currentUser) : (shippingInfo.email || "");

  const orderId = "DH" + Date.now();
  const newOrder = {
    orderId: orderId,
    userEmail: userEmail,
    createdAt: new Date().toISOString(),
    items: orderItems,
    shipping: {
      fullName: shippingInfo.fullName,
      phone: shippingInfo.phone,
      address: shippingInfo.address,
      note: shippingInfo.note || ""
    },
    paymentMethod: paymentMethod,
    subtotal: subtotal,
    shippingFee: shippingFee,
    total: subtotal + shippingFee,
    status: "pending"
  };

  const orders = getAllOrders();
  orders.unshift(newOrder); // Đưa đơn mới nhất lên đầu
  const ordersKey = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.orders) ? STORAGE_KEYS.orders : "shop_orders";
  localStorage.setItem(ordersKey, JSON.stringify(orders));

  // Đặt hàng thành công -> Xóa sạch giỏ hàng
  clearCart();

  return orderId;
}

/**
 * Lấy danh sách đơn hàng của một người dùng theo email
 * @param {string} email
 * @returns {Array}
 */
function getOrdersByUser(email) {
  const orders = getAllOrders();
  return orders
    .filter(order => order.userEmail === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ==========================================
// 2. XỬ LÝ TRANG THANH TOÁN (thanh-toan.html)
// ==========================================

async function initCheckoutPage() {
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutSummaryContainer = document.getElementById("checkout-order-summary");
  if (!checkoutForm) return;

  const cart = getCart();
  const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");
  const shippingFee = typeof SHIPPING_FEE !== "undefined" ? SHIPPING_FEE : 30000;

  // Nếu giỏ trống mà truy cập trang thanh toán -> chuyển về giỏ hàng
  if (cart.length === 0) {
    alert("Giỏ hàng của bạn đang trống! Vui lòng chọn sản phẩm trước.");
    window.location.href = `${rootPath}pages/gio-hang.html`;
    return;
  }

  // Hiển thị tóm tắt đơn hàng ở cột bên phải
  if (checkoutSummaryContainer) {
    let summaryHtml = "";
    let subtotal = 0;

    for (const item of cart) {
      let product = null;
      if (typeof getProductById === "function") {
        product = await getProductById(item.id);
      }
      if (!product) continue;

      const price = typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
      const lineTotal = price * item.qty;
      subtotal += lineTotal;

      const formattedLine = typeof formatPrice === "function" ? formatPrice(lineTotal) : `${lineTotal.toLocaleString("vi-VN")}₫`;

      summaryHtml += `
        <div class="checkout-summary-item">
          <div>
            <strong>${product.name}</strong> &times; ${item.qty}
            <div class="checkout-summary-variant">${[item.size, item.color].filter(Boolean).join(" - ")}</div>
          </div>
          <span>${formattedLine}</span>
        </div>
      `;
    }

    const total = subtotal + shippingFee;
    const formatSubtotal = typeof formatPrice === "function" ? formatPrice(subtotal) : `${subtotal.toLocaleString("vi-VN")}₫`;
    const formatShipping = typeof formatPrice === "function" ? formatPrice(shippingFee) : `${shippingFee.toLocaleString("vi-VN")}₫`;
    const formatTotal = typeof formatPrice === "function" ? formatPrice(total) : `${total.toLocaleString("vi-VN")}₫`;

    checkoutSummaryContainer.innerHTML = `
      <div class="checkout-summary-box">
        <h3>ĐƠN HÀNG CỦA BẠN</h3>
        ${summaryHtml}
        <hr>
        <div class="summary-line">
          <span>Tạm tính:</span>
          <span>${formatSubtotal}</span>
        </div>
        <div class="summary-line">
          <span>Phí vận chuyển:</span>
          <span>${formatShipping}</span>
        </div>
        <div class="summary-line summary-total">
          <span>TỔNG CỘNG:</span>
          <span>${formatTotal}</span>
        </div>
      </div>
    `;
  }

  // Tự động điền dữ liệu nếu tài khoản đã đăng nhập
  const currentKey = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.currentUser) ? STORAGE_KEYS.currentUser : "shop_currentUser";
  const currentUserEmail = localStorage.getItem(currentKey);
  if (currentUserEmail) {
    try {
      const email = JSON.parse(currentUserEmail);
      const usersKey = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.users) ? STORAGE_KEYS.users : "shop_users";
      const users = JSON.parse(localStorage.getItem(usersKey) || "[]");
      const user = users.find(u => u.email === email);
      if (user) {
        if (checkoutForm.fullName) checkoutForm.fullName.value = user.fullName || "";
        if (checkoutForm.email) checkoutForm.email.value = user.email || "";
        if (checkoutForm.phone) checkoutForm.phone.value = user.phone || "";
        if (checkoutForm.address) checkoutForm.address.value = user.address || "";
      }
    } catch (e) {}
  }

  // Xử lý gửi form đặt hàng
  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullNameEl = checkoutForm.querySelector("[name='fullName']");
    const phoneEl = checkoutForm.querySelector("[name='phone']");
    const emailEl = checkoutForm.querySelector("[name='email']");
    const addressEl = checkoutForm.querySelector("[name='address']");
    const noteEl = checkoutForm.querySelector("[name='note']");
    const paymentEl = checkoutForm.querySelector("input[name='paymentMethod']:checked");

    let isValid = true;

    // Kiểm tra tính hợp lệ dữ liệu (tích hợp validate.js)
    if (typeof isNotEmpty === "function" && typeof showFieldError === "function") {
      clearFieldError(fullNameEl);
      clearFieldError(phoneEl);
      clearFieldError(emailEl);
      clearFieldError(addressEl);

      if (!isNotEmpty(fullNameEl.value)) {
        showFieldError(fullNameEl, "Vui lòng nhập họ và tên");
        isValid = false;
      }
      if (!isValidPhone(phoneEl.value)) {
        showFieldError(phoneEl, "Số điện thoại phải gồm 10 chữ số (bắt đầu bằng số 0)");
        isValid = false;
      }
      if (!isValidEmail(emailEl.value)) {
        showFieldError(emailEl, "Email không đúng định dạng");
        isValid = false;
      }
      if (!isNotEmpty(addressEl.value)) {
        showFieldError(addressEl, "Vui lòng nhập địa chỉ nhận hàng");
        isValid = false;
      }
    } else {
      if (!fullNameEl.value.trim() || !phoneEl.value.trim() || !addressEl.value.trim()) {
        alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
        return;
      }
    }

    if (!isValid) return;

    const shippingInfo = {
      fullName: fullNameEl.value.trim(),
      phone: phoneEl.value.trim(),
      email: emailEl.value.trim(),
      address: addressEl.value.trim(),
      note: noteEl ? noteEl.value.trim() : ""
    };

    const paymentMethod = paymentEl ? paymentEl.value : "cod";

    try {
      const orderId = await createOrder(shippingInfo, paymentMethod);
      window.location.href = `${rootPath}pages/dat-hang-thanh-cong.html?orderId=${orderId}`;
    } catch (err) {
      alert("Lỗi tạo đơn hàng: " + err.message);
    }
  });
}

// ==========================================
// 3. XỬ LÝ TRANG ĐẶT HÀNG THÀNH CÔNG
// ==========================================

function initSuccessPage() {
  const container = document.getElementById("order-success-content");
  if (!container) return;

  const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");

  let orderId = "";
  if (typeof getQueryParam === "function") {
    orderId = getQueryParam("orderId");
  } else {
    orderId = new URLSearchParams(window.location.search).get("orderId");
  }

  if (!orderId) {
    container.innerHTML = `
      <div class="order-success-box">
        <h2>Không tìm thấy thông tin đơn hàng</h2>
        <a href="${rootPath}index.html" class="btn btn--primary">Về trang chủ</a>
      </div>
    `;
    return;
  }

  const orders = getAllOrders();
  const currentOrder = orders.find(o => o.orderId === orderId);

  const paymentTextMap = {
    cod: "Thanh toán khi nhận hàng (COD)",
    bank: "Chuyển khoản ngân hàng",
    momo: "Ví điện tử MoMo"
  };

  const formattedTotal = currentOrder ? (typeof formatPrice === "function" ? formatPrice(currentOrder.total) : `${currentOrder.total.toLocaleString("vi-VN")}₫`) : "";

  container.innerHTML = `
    <div class="order-success-card">
      <div class="order-success-icon">✓</div>
      <h2>ĐẶT HÀNG THÀNH CÔNG!</h2>
      <p class="order-success-desc">Cảm ơn bạn đã mua sắm tại cửa hàng. Đơn hàng của bạn đang được xử lý.</p>
      
      <div class="order-info-panel">
        <p><strong>Mã đơn hàng:</strong> <span class="text-highlight">${orderId}</span></p>
        <p><strong>Người nhận:</strong> ${currentOrder ? currentOrder.shipping.fullName : ''} (${currentOrder ? currentOrder.shipping.phone : ''})</p>
        <p><strong>Địa chỉ giao:</strong> ${currentOrder ? currentOrder.shipping.address : ''}</p>
        <p><strong>Phương thức:</strong> ${currentOrder ? (paymentTextMap[currentOrder.paymentMethod] || currentOrder.paymentMethod) : 'COD'}</p>
        <p><strong>Tổng thanh toán:</strong> <span class="text-highlight font-bold">${formattedTotal}</span></p>
      </div>

      <div class="order-success-actions">
        <a href="${rootPath}index.html" class="btn btn--primary">Tiếp tục mua hàng</a>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  initCheckoutPage();
  initSuccessPage();
});