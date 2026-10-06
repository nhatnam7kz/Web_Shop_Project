/* wishlist.js – Yêu thích (Người phụ trách: Vương)
   Cần viết (xem CONVENTIONS.md mục 7):
   getWishlist(), isInWishlist(id), toggleWishlist(id)
   Lắng nghe click trên .btn-wishlist[data-id] bằng event delegation.
   Nên viết thêm updateWishlistBadge() để cập nhật số trên #wishlist-badge (main.js sẽ tự gọi). */
/* wishlist.js – Vương
 * Danh sách yêu thích (mảng id sản phẩm trong shop_wishlist) + logic trang yeu-thich.
 * Tự lắng nghe click trên mọi .btn-wishlist[data-id] nên trang khác chỉ cần in đúng nút.
 */

// ---------- Hàm dùng chung (giao diện giữa các thành viên) ----------

/** Trả về mảng id yêu thích (rỗng nếu chưa có). */
function getWishlist() {
  const list = readJsonStorage(STORAGE_KEYS.wishlist, []);
  return Array.isArray(list) ? list.map(Number) : [];
}

/** true nếu sản phẩm đang được yêu thích. */
function isInWishlist(id) {
  return getWishlist().includes(Number(id));
}

/** Cập nhật trạng thái (màu, aria) của mọi nút tim đang có trên trang. */
function updateWishlistButtons() {
  const saved = getWishlist();
  document.querySelectorAll(".btn-wishlist[data-id]").forEach((button) => {
    const active = saved.includes(Number(button.dataset.id));
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích",
    );
  });
}

/** Cập nhật số trên biểu tượng yêu thích ở header (#wishlist-badge). */
function updateWishlistBadge() {
  const badge = document.getElementById("wishlist-badge");
  if (!badge) return;
  const count = String(getWishlist().length);
  // Chỉ ghi khi khác, tránh kích hoạt MutationObserver lặp vô hạn.
  if (badge.textContent !== count) badge.textContent = count;
  badge.hidden = count === "0";
}

/**
 * Thêm hoặc bỏ một sản phẩm khỏi yêu thích, rồi cập nhật giao diện nút tim.
 * @returns {boolean} true nếu sau khi bấm sản phẩm đang được yêu thích
 */
function toggleWishlist(id) {
  const numericId = Number(id);
  const saved = getWishlist();
  const wasSaved = saved.includes(numericId);
  const next = wasSaved
    ? saved.filter((item) => item !== numericId)
    : [...saved, numericId];

  writeJsonStorage(STORAGE_KEYS.wishlist, next);
  updateWishlistButtons();
  updateWishlistBadge();
  document.dispatchEvent(new CustomEvent("wishlist:changed"));
  return !wasSaved;
}

// ---------- Trang yeu-thich.html ----------

/** Vẽ các sản phẩm yêu thích vào #product-list (dùng renderProductCard của Kiệt). */
async function renderWishlistPage() {
  const listEl = document.getElementById("product-list");
  const emptyEl = document.getElementById("wishlist-empty");
  const countEl = document.getElementById("wishlist-count");
  if (!listEl) return;

  const saved = getWishlist();
  const products = await loadProducts();
  const items = products.filter((product) => saved.includes(product.id));

  if (countEl) countEl.textContent = `${items.length} sản phẩm`;
  if (emptyEl) emptyEl.hidden = items.length > 0;
  listEl.innerHTML = items
    .map((product) => renderProductCard(product))
    .join("");
  updateWishlistButtons();
}

// ---------- Khởi động ----------

// Click nút tim: event delegation, hoạt động cả với thẻ sản phẩm tạo bằng JS.
document.addEventListener("click", (event) => {
  const button = event.target.closest(".btn-wishlist[data-id]");
  if (!button) return;
  event.preventDefault(); // thẻ sản phẩm có thể nằm trong thẻ <a>
  const nowSaved = toggleWishlist(button.dataset.id);
  if (typeof showToast === "function") {
    showToast(
      nowSaved ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.",
      "success",
    );
  }
});

document.addEventListener("DOMContentLoaded", () => {
  updateWishlistButtons();
  updateWishlistBadge();

  // Header, footer và thẻ sản phẩm được JS đổ vào sau đó: theo dõi để đồng bộ lại nút tim và badge.
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateWishlistButtons();
      updateWishlistBadge();
    });
  }).observe(document.body, { childList: true, subtree: true });

  if (document.body.dataset.page === "wishlist") {
    renderWishlistPage();
    // Bỏ tim ngay trên trang yêu thích thì vẽ lại danh sách.
    document.addEventListener("wishlist:changed", renderWishlistPage);
  }
});
