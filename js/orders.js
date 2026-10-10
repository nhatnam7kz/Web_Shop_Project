/**
 * js/orders.js - Quản lý Đơn hàng & Thanh toán (Phụ trách: Nam)
 * Quy ước: CONVENTIONS.md
 *
 * Thay đổi so với bản cũ:
 *  - Gắn xử lý submit form NGAY khi vào trang (trước mọi thao tác bất đồng bộ). Bản cũ gắn sau khi
 *    tải xong sản phẩm, nếu bước đó lỗi thì form gửi theo mặc định (reload, giỏ hàng không đổi).
 *  - Mọi lỗi đều được ghi vào Console và hiện thông báo, không còn "im lặng"
 *  - Yêu cầu đăng nhập; chống bấm đặt hàng 2 lần
 *  - createOrder không âm thầm bỏ qua sản phẩm lỗi/hết hàng; lưu thêm email người nhận vào đơn
 */

// ==========================================
// 0. HÀM HỖ TRỢ NỘI BỘ
// ==========================================

function ordersKey() {
  return (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.orders) ? STORAGE_KEYS.orders : "shop_orders";
}

function moneyText(amount) {
  return typeof formatPrice === "function" ? formatPrice(amount) : `${Number(amount).toLocaleString("vi-VN")}₫`;
}

/** Đổi ký tự đặc biệt thành HTML an toàn trước khi chèn vào innerHTML */
function escapeOrderHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Hiện thông báo lỗi: ưu tiên toast, không có thì dùng alert */
function showOrderError(message) {
  if (typeof showToast === "function") showToast(message, "error");
  else alert(message);
}

// ==========================================
// 1. CÁC HÀM XỬ LÝ ĐƠN HÀNG DÙNG CHUNG (API)
// ==========================================

/**
 * Lấy danh sách toàn bộ đơn hàng từ localStorage
 * @returns {Array} Mảng các đơn hàng
 */
function getAllOrders() {
  try {
    const raw = localStorage.getItem(ordersKey());
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

/**
 * Tạo đơn hàng mới từ giỏ hàng hiện tại, lưu vào shop_orders rồi xóa giỏ hàng.
 * @param {Object} shippingInfo { fullName, phone, email, address, note }
 * @param {string} paymentMethod 'cod' | 'bank' | 'momo'
 * @returns {Promise<string>} Mã đơn hàng vừa tạo (orderId)
 * @throws {Error} Giỏ trống, sản phẩm không tồn tại/hết hàng, hoặc không lưu được
 */
async function createOrder(shippingInfo, paymentMethod = "cod") {
  const cart = getCart();
  if (cart.length === 0) {
    throw new Error("Giỏ hàng đang trống, không thể tạo đơn!");
  }

  const catalog = await loadProducts();

  // Chụp lại thông tin sản phẩm tại thời điểm đặt hàng (Snapshot)
  const orderItems = [];
  let subtotal = 0;

  for (const item of cart) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (!product) {
      throw new Error(`Không tìm thấy sản phẩm mã ${item.id}, vui lòng xóa khỏi giỏ hàng rồi thử lại.`);
    }
    if (!product.inStock) {
      throw new Error(`Sản phẩm "${product.name}" đã hết hàng, vui lòng xóa khỏi giỏ hàng.`);
    }

    const price = typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
    orderItems.push({
      id: product.id,
      name: product.name,
      image: (product.images && product.images[0]) ? product.images[0] : "placeholder.jpg",
      price: price,
      size: item.size,
      color: item.color,
      qty: item.qty,
    });
    subtotal += price * item.qty;
  }

  const shippingFee = typeof SHIPPING_FEE !== "undefined" ? SHIPPING_FEE : 30000;
  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const userEmail = currentUser ? currentUser.email : (shippingInfo.email || "");

  const orderId = "DH" + Date.now();
  const newOrder = {
    orderId: orderId,
    userEmail: userEmail,
    createdAt: new Date().toISOString(),
    items: orderItems,
    shipping: {
      fullName: shippingInfo.fullName,
      phone: shippingInfo.phone,
      email: shippingInfo.email || userEmail,
      address: shippingInfo.address,
      note: shippingInfo.note || "",
    },
    paymentMethod: paymentMethod,
    subtotal: subtotal,
    shippingFee: shippingFee,
    total: subtotal + shippingFee,
    status: "pending",
  };

  const orders = getAllOrders();
  orders.unshift(newOrder); // Đưa đơn mới nhất lên đầu
  try {
    localStorage.setItem(ordersKey(), JSON.stringify(orders));
  } catch (error) {
    throw new Error("Không lưu được đơn hàng, vui lòng thử lại.");
  }

  // Chỉ xóa giỏ hàng SAU KHI đã lưu đơn thành công
  clearCart();

  return orderId;
}

/**
 * Lấy danh sách đơn hàng của một người dùng theo email
 * @param {string} email
 * @returns {Array}
 */
function getOrdersByUser(email) {
  return getAllOrders()
    .filter((order) => order.userEmail === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ==========================================
// 2. XỬ LÝ TRANG THANH TOÁN (thanh-toan.html)
// ==========================================

/** Kiểm tra form thanh toán, hiện lỗi dưới từng ô. Trả về true nếu hợp lệ. */
function validateCheckoutForm(fields) {
  const canShow = typeof showFieldError === "function" && typeof clearFieldError === "function";
  const notEmpty = typeof isNotEmpty === "function" ? isNotEmpty : (v) => String(v).trim() !== "";
  const phoneOk = typeof isValidPhone === "function" ? isValidPhone : (v) => /^0\d{9}$/.test(String(v).trim());
  const emailOk = typeof isValidEmail === "function" ? isValidEmail : (v) => /^\S+@\S+\.\S+$/.test(String(v).trim());

  const errors = [];
  const check = (el, ok, message) => {
    if (canShow) clearFieldError(el);
    if (!ok) {
      errors.push(message);
      if (canShow) showFieldError(el, message);
    }
  };

  check(fields.fullName, notEmpty(fields.fullName.value), "Vui lòng nhập họ và tên");
  check(fields.phone, phoneOk(fields.phone.value), "Số điện thoại phải gồm 10 chữ số (bắt đầu bằng số 0)");
  check(fields.email, emailOk(fields.email.value), "Email không đúng định dạng");
  check(fields.address, notEmpty(fields.address.value), "Vui lòng nhập địa chỉ nhận hàng");

  // Không có hàm hiện lỗi dưới ô nhập thì báo lỗi đầu tiên bằng thông báo chung
  if (errors.length && !canShow) showOrderError(errors[0]);
  return errors.length === 0;
}

/** Vẽ tóm tắt đơn hàng ở cột phải */
async function renderCheckoutSummary(container, cart, shippingFee) {
  const catalog = await loadProducts();
  let summaryHtml = "";
  let subtotal = 0;

  for (const item of cart) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (!product) {
      console.warn("Thanh toán: không tìm thấy sản phẩm", item);
      continue;
    }
    const price = typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
    const lineTotal = price * item.qty;
    subtotal += lineTotal;

    const colorName = item.color ? (typeof colorLabel === "function" ? colorLabel(item.color) : item.color) : "";
    summaryHtml += `
      <div class="checkout-summary-item">
        <div>
          <strong>${escapeOrderHtml(product.name)}</strong> &times; ${item.qty}
          <div class="checkout-summary-variant">${[item.size, colorName].filter(Boolean).join(" - ")}</div>
        </div>
        <span>${moneyText(lineTotal)}</span>
      </div>`;
  }

  container.innerHTML = `
    <div class="checkout-summary-box">
      <h3>ĐƠN HÀNG CỦA BẠN</h3>
      ${summaryHtml}
      <hr>
      <div class="summary-line"><span>Tạm tính:</span><span>${moneyText(subtotal)}</span></div>
      <div class="summary-line"><span>Phí vận chuyển:</span><span>${moneyText(shippingFee)}</span></div>
      <div class="summary-line summary-total"><span>TỔNG CỘNG:</span><span>${moneyText(subtotal + shippingFee)}</span></div>
    </div>`;
}

async function initCheckoutPage() {
  const checkoutForm = document.getElementById("checkout-form");
  if (!checkoutForm) return;

  const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");
  const shippingFee = typeof SHIPPING_FEE !== "undefined" ? SHIPPING_FEE : 30000;
  const submitBtn = checkoutForm.querySelector(".btn-place-order");
  let placing = false; // chống bấm đặt hàng 2 lần

  // 1) GẮN SỰ KIỆN SUBMIT TRƯỚC TIÊN, trước mọi thao tác bất đồng bộ phía dưới.
  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (placing) return;

    try {
      if (typeof requireLogin === "function" && !requireLogin("Vui lòng đăng nhập để đặt hàng")) return;

      const fields = {
        fullName: checkoutForm.querySelector("[name='fullName']"),
        phone: checkoutForm.querySelector("[name='phone']"),
        email: checkoutForm.querySelector("[name='email']"),
        address: checkoutForm.querySelector("[name='address']"),
      };
      const noteEl = checkoutForm.querySelector("[name='note']");
      const paymentEl = checkoutForm.querySelector("input[name='paymentMethod']:checked");

      if (!validateCheckoutForm(fields)) return;

      const shippingInfo = {
        fullName: fields.fullName.value.trim(),
        phone: fields.phone.value.trim(),
        email: fields.email.value.trim(),
        address: fields.address.value.trim(),
        note: noteEl ? noteEl.value.trim() : "",
      };

      placing = true;
      if (submitBtn) submitBtn.disabled = true;

      const orderId = await createOrder(shippingInfo, paymentEl ? paymentEl.value : "cod");
      window.location.href = `${rootPath}pages/dat-hang-thanh-cong.html?orderId=${encodeURIComponent(orderId)}`;
    } catch (err) {
      console.error("Lỗi đặt hàng:", err);
      showOrderError("Lỗi đặt hàng: " + err.message);
      placing = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // 2) Trang thanh toán yêu cầu đăng nhập
  if (typeof requireLogin === "function" && !requireLogin("Vui lòng đăng nhập để thanh toán")) return;

  // 3) Giỏ trống thì quay về giỏ hàng
  const cart = getCart();
  if (cart.length === 0) {
    showOrderError("Giỏ hàng của bạn đang trống! Vui lòng chọn sản phẩm trước.");
    setTimeout(() => { window.location.href = `${rootPath}pages/gio-hang.html`; }, 1200);
    return;
  }

  // 4) Tóm tắt đơn hàng. Lỗi ở đây không được ảnh hưởng tới nút đặt hàng.
  try {
    const container = document.getElementById("checkout-order-summary");
    if (container) await renderCheckoutSummary(container, cart, shippingFee);
  } catch (error) {
    console.error("Không vẽ được tóm tắt đơn hàng:", error);
  }

  // 5) Tự điền thông tin nếu đã đăng nhập
  try {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    if (user) {
      const fill = (name, value) => {
        const el = checkoutForm.querySelector(`[name='${name}']`);
        if (el && !el.value) el.value = value || "";
      };
      fill("fullName", user.fullName);
      fill("email", user.email);
      fill("phone", user.phone);
      fill("address", user.address);
    }
  } catch (error) {
    console.error("Không tự điền được thông tin:", error);
  }
}

// ==========================================
// 3. XỬ LÝ TRANG ĐẶT HÀNG THÀNH CÔNG
// ==========================================

function initSuccessPage() {
  const container = document.getElementById("order-success-content");
  if (!container) return;

  const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");
  const orderId = typeof getQueryParam === "function"
    ? getQueryParam("orderId")
    : new URLSearchParams(window.location.search).get("orderId");

  const currentOrder = orderId ? getAllOrders().find((o) => o.orderId === orderId) : null;

  if (!currentOrder) {
    container.innerHTML = `
      <div class="order-success-box">
        <h2>Không tìm thấy thông tin đơn hàng</h2>
        <a href="${rootPath}index.html" class="btn btn--primary">Về trang chủ</a>
      </div>`;
    return;
  }

  const paymentTextMap = {
    cod: "Thanh toán khi nhận hàng (COD)",
    bank: "Chuyển khoản ngân hàng",
    momo: "Ví điện tử MoMo",
  };

  container.innerHTML = `
    <div class="order-success-card">
      <div class="order-success-icon">✓</div>
      <h2>ĐẶT HÀNG THÀNH CÔNG!</h2>
      <p class="order-success-desc">Cảm ơn bạn đã mua sắm tại cửa hàng. Đơn hàng của bạn đang được xử lý.</p>

      <div class="order-info-panel">
        <p><strong>Mã đơn hàng:</strong> <span class="text-highlight">${escapeOrderHtml(currentOrder.orderId)}</span></p>
        <p><strong>Người nhận:</strong> ${escapeOrderHtml(currentOrder.shipping.fullName)} (${escapeOrderHtml(currentOrder.shipping.phone)})</p>
        <p><strong>Địa chỉ giao:</strong> ${escapeOrderHtml(currentOrder.shipping.address)}</p>
        <p><strong>Phương thức:</strong> ${escapeOrderHtml(paymentTextMap[currentOrder.paymentMethod] || currentOrder.paymentMethod)}</p>
        <p><strong>Tổng thanh toán:</strong> <span class="text-highlight font-bold">${moneyText(currentOrder.total)}</span></p>
      </div>

      <div class="order-success-actions">
        <a href="${rootPath}index.html" class="btn btn--primary">Tiếp tục mua hàng</a>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  initCheckoutPage().catch((error) => console.error("Lỗi khởi tạo trang thanh toán:", error));
  initSuccessPage();
});