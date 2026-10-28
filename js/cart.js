function getCart() {
  const key = userStorageKey(STORAGE_KEYS.cart);
  if (!key) {
    return [];
  }
  let raw_data = localStorage.getItem(key);

  let data = JSON.parse(raw_data);

  if (data == null) {
    return [];
  } else {
    return data;
  }
}

function saveCart(cart) {
  const key = userStorageKey(STORAGE_KEYS.cart);
  if (!key) {
    return;
  }
  let new_cart = JSON.stringify(cart);
  localStorage.setItem(key, new_cart);
  updateCartBadge();
}

function findLine(cart, id, size, color) {
  return cart.findIndex((item) => {
    return (
      Number(id) === Number(item.id) &&
      (size || "") === (item.size || "") &&
      (color || "") === (item.color || "")
    );
  });
}

function addToCart(id, size = null, color = null, qty = 1) {
  if (!requireLogin("Vui lòng đăng nhập để thêm vào giỏ hàng")) return false;
  let cart = getCart();

  let index = findLine(cart, id, size, color);

  if (index === -1) {
    cart.push({ id: Number(id), size: size, color: color, qty: qty });
  } else {
    cart[index].qty += qty;
  }

  saveCart(cart);
  showToast("Đã thêm sản phẩm vào giỏ hàng!");

  return true;
}

function removeFromCart(id, size, color) {
  let cart = getCart();

  let index = findLine(cart, id, size, color);

  if (index !== -1) {
    cart.splice(index, 1);
    saveCart(cart);
  }
}

function updateCartQty(id, size, color, qty) {
  if (qty < 1) {
    removeFromCart(id, size, color);
    return;
  }

  let cart = getCart();
  let index = findLine(cart, id, size, color);

  if (index !== -1) {
    cart[index].qty = qty;
    saveCart(cart);
  }
}

function clearCart() {
  saveCart([]);
}

function getCartCount() {
  let cart = getCart();
  let sum = 0;
  for (let i = 0; i < cart.length; i++) {
    sum += cart[i].qty;
  }

  return sum;
}

function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

async function renderCartPage() {
  let container = document.getElementById("cart-page-content");
  const cart = getCart();

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
    <div class="cart-empty">
    <p>Giỏ hàng của bạn đang trống</p>
    <a href="${ROOT}pages/san-pham.html" class="btn btn--primary">TIẾP TỤC MUA SẮM</a>
    </div>
    `;
    return;
  }

  const catalog = await loadProducts();
  let rows = ""; // cac hang san pham
  let subtotal = 0; // tong tien

  for (const item of cart) {
    const product = catalog.find((p) => p.id === item.id);
    if (!product) continue;

    const price = getFinalPrice(product);
    subtotal += price * item.qty;

    const variant = [
      item.size ? "Size: " + item.size : "",
      item.color ? "Màu: " + colorLabel(item.color) : "",
    ].filter(Boolean).join(" | ");

    rows += `
    <tr class="cart-item-row" data-id="${item.id}" data-size="${item.size || ""}" data-color="${item.color || ""}">
        <td class="cart-item__info">
          <div class="cart-item__box">
            <img src="${getImageUrl(product.images[0])}" alt="${product.name}">
            <div>
              <a href="${ROOT}pages/chi-tiet.html?id=${product.id}">${product.name}</a>
              <div class="cart-item__variant">${variant}</div>
            </div>
          </div>
        </td>
        <td class="cart-item__price">${formatPrice(price)}</td>
        <td class="cart-item__qty">
          <div class="cart-qty-control">
            <button type="button" class="btn-qty-decrease">-</button>
            <input type="text" class="cart-qty-input" value="${item.qty}" readonly>
            <button type="button" class="btn-qty-increase">+</button>
          </div>
        </td>
        <td class="cart-item__total">${formatPrice(price * item.qty)}</td>
        <td class="cart-item__action">
          <button type="button" class="btn-cart-delete">&times;</button>
        </td>
      </tr>
    `;
  }

  container.innerHTML = `
    <div class="cart-layout">

      <div class="cart-table-wrapper">

        <table>

          <thead>
            <tr><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th><th>Xóa</th></tr>
          </thead>
          <tbody>${rows}</tbody>

        </table>

        <div class="cart-table-footer">
          <a href="${ROOT}pages/san-pham.html">&larr; Tiếp tục mua hàng</a>
        </div>

      </div>

      <div class="cart-summary-box">
        <h3>TÓM TẮT ĐƠN HÀNG</h3>
        <div class="summary-line"><span>Tạm tính:</span><span>${formatPrice(subtotal)}</span></div>
        <div class="summary-line"><span>Phí vận chuyển:</span><span>${formatPrice(SHIPPING_FEE)}</span></div>
        <div class="summary-line summary-total"><span>TỔNG CỘNG:</span><span>${formatPrice(subtotal + SHIPPING_FEE)}</span></div>
        <button type="button" id="btn-checkout" class="btn-checkout">XÁC NHẬN ĐẶT HÀNG</button>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();

  const page = document.getElementById("cart-page-content");
  if (!page) return; // không phải trang giỏ hàng
  if (!requireLogin("Vui lòng đăng nhập để xem giỏ hàng")) return;

  renderCartPage();

  // Gắn 1 sự kiện vào thẻ cha, vì các nút bên trong bị vẽ lại sau mỗi lần bấm
  page.addEventListener("click", (e) => {
    // Nút thanh toán không nằm trong dòng sản phẩm nên phải xử lý trước
    if (e.target.id === "btn-checkout") {
      checkout(); // hàm này nằm trong orders.js
      return;
    }

    const row = e.target.closest(".cart-item-row"); // tìm dòng sản phẩm được thao tác
    if (!row) return;

    const id = row.dataset.id;
    const size = row.dataset.size;
    const color = row.dataset.color;
    const qty = Number(row.querySelector(".cart-qty-input").value);

    if (e.target.classList.contains("btn-cart-delete")) {
      removeFromCart(id, size, color);
    } else if (e.target.classList.contains("btn-qty-decrease")) {
      updateCartQty(id, size, color, qty - 1);
    } else if (e.target.classList.contains("btn-qty-increase")) {
      updateCartQty(id, size, color, qty + 1);
    } else {
      return;
    }
    renderCartPage();
  });
});