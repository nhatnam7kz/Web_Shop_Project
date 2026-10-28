/* orders.js - Đơn hàng */

function getAllOrders() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders)) || [];
}

function getOrdersByUser(email) {
  return getAllOrders().filter((order) => order.userEmail === email);
}

// Bấm "Tiến hành thanh toán": hiện hộp xác nhận, OK thì lưu đơn rồi xóa giỏ
async function checkout() {
  const catalog = await loadProducts();
  const items = [];
  let subtotal = 0;
  let text = "";

  for (const item of getCart()) {
    const product = catalog.find((p) => p.id === item.id);
    if (!product) continue;

    const price = getFinalPrice(product);
    subtotal += price * item.qty;
    text += `- ${product.name} x ${item.qty}: ${formatPrice(price * item.qty)}\n`;
    items.push({
      id: product.id,
      name: product.name,
      price: price,
      size: item.size,
      color: item.color,
      qty: item.qty,
    });
  }

  const total = subtotal + SHIPPING_FEE;
  text += `\nPhí vận chuyển: ${formatPrice(SHIPPING_FEE)}`;
  text += `\nTỔNG CỘNG: ${formatPrice(total)}`;

  if (!confirm("Xác nhận đặt hàng?\n\n" + text)) return;

  const orders = getAllOrders();
  orders.unshift({
    orderId: "DH" + Date.now(),
    userEmail: getCurrentUser().email,
    createdAt: new Date().toISOString(),
    items: items,
    total: total,
    status: "pending",
  });
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));

  clearCart();
  renderCartPage();
  alert("Đặt hàng thành công!");
}