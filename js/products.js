const COLOR_LABELS = {
  den: "Đen",
  trang: "Trắng",
  xam: "Xám",
  be: "Be",
  hong: "Hồng",
  "xanh-navy": "Xanh navy",
  do: "Đỏ",
  vang: "Vàng",
  "xanh-reu": "Xanh rêu",
  trong: "Trong suốt",
  "xanh-la": "Xanh lá",
};

const TAG_LABELS = {
  trending: "Trending",
  new: "Mới",
  sale: "Giảm giá",
};

const PRICE_RANGES = [
  { id: "under-150", label: "Giá dưới 150.000₫", min: 0, max: 150000 },
  { id: "150-200", label: "150.000₫ - 200.000₫", min: 150000, max: 200000 },
  { id: "200-250", label: "200.000₫ - 250.000₫", min: 200000, max: 250000 },
  { id: "250-350", label: "250.000₫ - 350.000₫", min: 250000, max: 350000 },
  { id: "over-350", label: "Giá trên 350.000₫", min: 350000, max: Infinity },
];

const LOAD_ERROR_HTML = "<p>Không thể tải sản phẩm lúc này.</p>";

let products = [];
let productsPromise = null;

async function loadProducts() {
  if (products.length) return products;

  productsPromise ||= fetch(PRODUCTS_URL)
    .then((response) => {
      if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm");
      return response.json();
    })
    .then((data) => (products = data))
    .catch((error) => {
      productsPromise = null;
      throw error;
    });

  return productsPromise;
}

async function getProductById(id) {
  const list = await loadProducts();
  return list.find((product) => product.id === Number(id));
}

const getFinalPrice = (product) => product.salePrice ?? product.price;
const formatPrice = (number) => `${Number(number).toLocaleString("vi-VN")}₫`;
const getImageUrl = (fileName) => `${IMAGE_DIR}${fileName}`;
const colorLabel = (slug) => COLOR_LABELS[slug] || slug;
const detailUrl = (id) => `${ROOT}pages/chi-tiet.html?id=${id}`;
const categoryUrl = (slug) => `${ROOT}pages/san-pham.html?category=${slug}`;
const clamp = (value) => Math.min(99, Math.max(1, value));

function notify(message, type) {
  if (typeof showToast === "function") showToast(message, type);
}

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    return [];
  }
}

function setBadge(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function ensureShopFallbacks() {
  window.getCart ||= () => readList(STORAGE_KEYS.cart);

  window.addToCart ||= (id, size, color, qty) => {
    const cart = getCart();
    const nextQty = Number(qty) || 1;
    const match = cart.find(
      (item) =>
        Number(item.id) === Number(id) &&
        (item.size || null) === (size || null) &&
        (item.color || null) === (color || null)
    );
    if (match) match.qty = Number(match.qty || 0) + nextQty;
    else cart.push({ id: Number(id), size: size || null, color: color || null, qty: nextQty });
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    if (typeof updateCartBadge === "function") updateCartBadge();
    notify("Đã thêm vào giỏ");
  };

  window.getCartCount ||= () => getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
  window.updateCartBadge ||= () => setBadge("cart-badge", getCartCount());

  window.getWishlist ||= () => readList(STORAGE_KEYS.wishlist);
  window.isInWishlist ||= (id) => getWishlist().some((item) => Number(item) === Number(id));

  window.toggleWishlist ||= (id) => {
    const list = getWishlist().map(Number);
    const index = list.indexOf(Number(id));
    if (index >= 0) list.splice(index, 1);
    else list.push(Number(id));
    localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(list));
    if (typeof updateWishlistBadge === "function") updateWishlistBadge();
    return isInWishlist(id);
  };

  window.updateWishlistBadge ||= () => setBadge("wishlist-badge", getWishlist().length);
}

function priceHtml(product) {
  const oldPrice = product.salePrice
    ? `<del class="price-old">${formatPrice(product.price)}</del>`
    : "";
  return `<span class="price-sale">${formatPrice(getFinalPrice(product))}</span>${oldPrice}`;
}

function firstImageUrl(product) {
  return product.images && product.images[0] ? getImageUrl(product.images[0]) : PLACEHOLDER_IMG;
}

function renderProductCard(product) {
  const tag = product.tag
    ? `<span class="product-card__tag">${TAG_LABELS[product.tag] || product.tag}</span>`
    : "";
  const soldOutClass = product.inStock ? "" : " product-card--sold-out";
  const optionLabel = product.inStock ? "Tùy chọn" : "Hết hàng";
  const wished = typeof isInWishlist === "function" && isInWishlist(product.id) ? " is-active" : "";
  const url = detailUrl(product.id);

  return `
    <article class="product-card${soldOutClass}">
      <div class="product-card__media">
        <a class="product-card__image" href="${url}">
          <img src="${firstImageUrl(product)}" alt="${product.name}" loading="lazy">
          ${tag}
        </a>
        <button class="btn-wishlist product-card__wish${wished}" data-id="${product.id}" aria-label="Thêm vào yêu thích">♡</button>
        <div class="product-card__actions">
          <a class="product-card__option" href="${url}">${optionLabel}</a>
          <button type="button" class="product-card__quick" data-quick="${product.id}">Xem nhanh</button>
        </div>
      </div>
      <div class="product-card__body">
        <span class="product-card__vendor">${product.categoryName}</span>
        <a class="product-card__title" href="${url}">${product.name}</a>
        <div class="product-card__price">${priceHtml(product)}</div>
      </div>
    </article>`;
}

function renderCategoryCard(category) {
  return `
    <a class="category-card" href="${categoryUrl(category.slug)}">
      <div class="category-card__image">
        <img src="${firstImageUrl(category.products[0])}" alt="${category.name}" loading="lazy">
      </div>
      <span class="category-card__name">${category.name}</span>
      <span class="category-card__count">${category.products.length} sản phẩm</span>
    </a>`;
}

async function renderKingShopProducts() {
  const grid = document.querySelector(".do-hieu-king-shop .category-grid");
  if (!grid) return;

  try {
    const categoryMap = new Map();
    (await loadProducts()).forEach((product) => {
      if (!categoryMap.has(product.categoryName)) {
        categoryMap.set(product.categoryName, {
          name: product.categoryName,
          slug: product.category,
          products: [],
        });
      }
      categoryMap.get(product.categoryName).products.push(product);
    });

    grid.innerHTML = [...categoryMap.values()].map(renderCategoryCard).join("");
  } catch (error) {
    grid.innerHTML = LOAD_ERROR_HTML;
    console.error(error);
  }
}

function renderProductsByCategory(selector, allProducts, category, limit) {
  const grid = document.querySelector(selector);
  if (!grid) return;

  let list = Array.isArray(allProducts)
    ? allProducts.filter((product) => !category || product.category === category)
    : [];
  if (limit) list = list.slice(0, limit);
  grid.innerHTML = list.map(renderProductCard).join("");
}

function renderHomeProductSections(allProducts) {
  renderProductsByCategory(".recommendation-grid", allProducts, "ao-xuan-he", 3);
  renderProductsByCategory(".collection-grid", allProducts, "lego", 5);
}

async function renderHotProductTabs() {
  const hasHomeGrids = document.querySelector(
    ".recommendation-grid, .collection-grid, .new-product-grid, .winter-product-grid"
  );
  if (!hasHomeGrids) return;

  try {
    const allProducts = await loadProducts();
    renderHomeProductSections(allProducts);
    renderProductsByCategory(".new-product-grid", allProducts, "ao-xuan-he");
    renderProductsByCategory(".winter-product-grid", allProducts, "do-thu-dong");
  } catch (error) {
    document.querySelectorAll(".hot-product-grid").forEach((grid) => {
      grid.innerHTML = LOAD_ERROR_HTML;
    });
    console.error(error);
  }
}

function setupHotProductTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-content");
  if (!buttons.length || !panels.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("tab-btn--active"));
      panels.forEach((panel) => {
        panel.hidden = panel.id !== button.dataset.tab;
      });
      button.classList.add("tab-btn--active");
    });
  });
}

function optionButtons(items, name, selected, labelFn) {
  if (!items || !items.length) return "";
  return items.map((item, index) => {
    const checked = (selected ? item === selected : index === 0) ? " checked" : "";
    const text = labelFn ? labelFn(item) : item;
    const dot = name === "color" ? `<i class="swatch swatch--${item}"></i>` : "";
    return `
      <label class="option-chip">
        <input type="radio" name="${name}" value="${item}"${checked}>
        ${dot}<span>${text}</span>
      </label>`;
  }).join("");
}

function qtyControl(id) {
  return `
    <div class="qty-box" data-qty-for="${id}">
      <button type="button" class="qty-box__btn" data-qty="-1" aria-label="Giảm">−</button>
      <input class="qty-box__input" type="number" min="1" max="99" value="1">
      <button type="button" class="qty-box__btn" data-qty="1" aria-label="Tăng">+</button>
    </div>`;
}

function promoBox() {
  return `
    <div class="promo-box">
      <strong>🎁 KHUYẾN MÃI - ƯU ĐÃI</strong>
      <ul>
        <li>Đồng giá ship toàn quốc ${formatPrice(SHIPPING_FEE)}</li>
        <li>Hỗ trợ trả lời thắc mắc qua fanpage chính thức</li>
        <li>Khuyến mãi trực tiếp trên giá sản phẩm</li>
        <li>Đổi trả nếu sản phẩm lỗi bất kì</li>
      </ul>
    </div>`;
}

const selectedValue = (root, name) => root.querySelector(`input[name="${name}"]:checked`)?.value || "";
const selectedQty = (root) => clamp(Number(root.querySelector(".qty-box__input")?.value) || 1);

function handleAddToCart(product, root, goCheckout) {
  if (!product.inStock) {
    notify("Sản phẩm đã hết hàng", "error");
    return;
  }
  const size = selectedValue(root, "size");
  if (product.sizes?.length && !size) {
    notify("Vui lòng chọn kích thước", "error");
    return;
  }

  addToCart(product.id, size || null, selectedValue(root, "color") || null, selectedQty(root));
  if (goCheckout) location.href = `${ROOT}pages/gio-hang.html`;
}

function optionRow(label, content) {
  return content
    ? `<div class="option-row"><span>${label}:</span>${content}</div>`
    : "";
}

function productFormHtml(product, extraActions) {
  const list = (items, name, labelFn) =>
    items?.length ? `<div class="option-list">${optionButtons(items, name, "", labelFn)}</div>` : "";
  const addDisabled = product.inStock ? "" : " disabled";

  return `
    ${optionRow("Kích thước", list(product.sizes, "size"))}
    ${optionRow("Màu sắc", list(product.colors, "color", colorLabel))}
    ${optionRow("Số lượng", qtyControl(product.id))}
    <div class="product-cta">
      <button type="button" class="btn btn--outline js-add-cart"${addDisabled}>THÊM VÀO GIỎ</button>
      <button type="button" class="btn btn--primary js-buy-now"${addDisabled}>${product.inStock ? "MUA NGAY" : "HẾT HÀNG"}</button>
    </div>
    ${extraActions || ""}`;
}

function bindProductForm(root, product) {
  root.addEventListener("click", (event) => {
    const qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      const input = root.querySelector(".qty-box__input");
      input.value = clamp(Number(input.value || 1) + Number(qtyBtn.dataset.qty));
    }
    if (event.target.closest(".js-add-cart")) handleAddToCart(product, root, false);
    if (event.target.closest(".js-buy-now")) handleAddToCart(product, root, true);
  });
}

function createQuickViewHost() {
  const box = document.createElement("div");
  box.id = "quick-view";
  box.className = "quick-view";
  box.hidden = true;
  document.body.appendChild(box);
  return box;
}

async function openQuickView(id) {
  ensureShopFallbacks();
  const product = await getProductById(id);
  const box = document.getElementById("quick-view") || createQuickViewHost();
  if (!product) return;

  box.hidden = false;
  box.innerHTML = `
    <div class="quick-view__backdrop" data-close-quick></div>
    <div class="quick-view__dialog" role="dialog" aria-modal="true" aria-label="Xem nhanh ${product.name}">
      <button class="quick-view__close" type="button" data-close-quick aria-label="Đóng">×</button>
      <div class="quick-view__grid">
        ${galleryHtml(product)}
        <div class="quick-view__info">
          <p class="product-card__vendor">${product.categoryName}</p>
          <h2>${product.name}</h2>
          <div class="product-card__price">${priceHtml(product)}</div>
          ${promoBox()}
          ${productFormHtml(product, `<a class="quick-view__detail" href="${detailUrl(product.id)}">Xem chi tiết</a>`)}
        </div>
      </div>
    </div>`;
  bindProductForm(box.querySelector(".quick-view__info"), product);
  bindGallery(box.querySelector(".product-gallery"));
  document.body.classList.add("no-scroll");
}

function closeQuickView() {
  const box = document.getElementById("quick-view");
  if (!box) return;
  box.hidden = true;
  box.innerHTML = "";
  document.body.classList.remove("no-scroll");
}

function galleryHtml(product) {
  const images = (product.images || []).map(getImageUrl);
  if (!images.length) images.push(PLACEHOLDER_IMG);

  const thumbs = images.map((src, index) => `
    <button type="button" class="gallery-thumb${index === 0 ? " is-active" : ""}" data-src="${src}" data-index="${index}">
      <img src="${src}" alt="${product.name} ${index + 1}">
    </button>`).join("");

  const arrows = images.length > 1
    ? `<button type="button" class="gallery-arrow gallery-prev" aria-label="Ảnh trước">‹</button>
       <button type="button" class="gallery-arrow gallery-next" aria-label="Ảnh sau">›</button>`
    : "";

  return `
    <div class="product-gallery" data-index="0">
      <div class="product-gallery__thumbs">${thumbs}</div>
      <div class="product-gallery__main">
        <div class="gallery-track">${images.map((src) => `<img class="gallery-main-img" src="${src}" alt="${product.name}" draggable="false">`).join("")}</div>
        ${arrows}
      </div>
    </div>`;
}

function showGalleryImage(root, index) {
  const thumbs = root.querySelectorAll(".gallery-thumb");
  const track = root.querySelector(".gallery-track");
  if (!thumbs.length) return;

  index = (index + thumbs.length) % thumbs.length;
  root.dataset.index = index;
  thumbs.forEach((thumb, i) => thumb.classList.toggle("is-active", i === index));
  track.style.transition = "";
  track.style.transform = `translateX(${-index * 100}%)`;
}

function bindGallerySwipe(root) {
  const main = root.querySelector(".product-gallery__main");
  const track = root.querySelector(".gallery-track");
  const count = root.querySelectorAll(".gallery-thumb").length;
  if (!main || !track || count < 2) return;

  let startX = 0;
  let dx = 0;
  let dragging = false;

  main.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".gallery-arrow")) return;
    dragging = true;
    startX = event.clientX;
    dx = 0;
    track.style.transition = "none";
    main.setPointerCapture(event.pointerId);
  });

  main.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    dx = event.clientX - startX;
    const index = Number(root.dataset.index || 0);
    const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    track.style.transform = `translateX(calc(${-index * 100}% + ${atEdge ? dx / 3 : dx}px))`;
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    const index = Number(root.dataset.index || 0);
    const threshold = main.offsetWidth * 0.2;
    let next = index;
    if (dx < -threshold) next = Math.min(index + 1, count - 1);
    else if (dx > threshold) next = Math.max(index - 1, 0);
    showGalleryImage(root, next);
  };

  main.addEventListener("pointerup", end);
  main.addEventListener("pointercancel", end);
}

function injectGalleryStyles() {
  if (document.getElementById("gallery-swipe-style")) return;
  const style = document.createElement("style");
  style.id = "gallery-swipe-style";
  style.textContent = `
    .product-gallery__main{overflow:hidden;touch-action:pan-y;user-select:none;cursor:grab}
    .product-gallery__main:active{cursor:grabbing}
    .gallery-track{display:flex;transition:transform .35s cubic-bezier(.22,.61,.36,1);will-change:transform}
    .gallery-track .gallery-main-img{flex:0 0 100%;width:100%;min-width:0;pointer-events:none;opacity:1}`;
  document.head.appendChild(style);
}

function bindGallery(root) {
  if (!root) return;
  bindGallerySwipe(root);
  root.addEventListener("click", (event) => {
    const current = Number(root.dataset.index || 0);
    const thumb = event.target.closest(".gallery-thumb");
    if (thumb) showGalleryImage(root, Number(thumb.dataset.index));
    if (event.target.closest(".gallery-prev")) showGalleryImage(root, current - 1);
    if (event.target.closest(".gallery-next")) showGalleryImage(root, current + 1);
  });
}

async function initProductDetail() {
  const mount = document.getElementById("product-detail");
  if (!mount) return;
  ensureShopFallbacks();

  let product;
  try {
    product = await getProductById(getQueryParam("id"));
  } catch (error) {
    mount.innerHTML = LOAD_ERROR_HTML;
    console.error(error);
    return;
  }

  if (!product) {
    mount.innerHTML = `<p class="empty-state">Không tìm thấy sản phẩm. <a href="${ROOT}pages/san-pham.html">Quay lại cửa hàng</a></p>`;
    return;
  }

  document.title = `${product.name} | ${SHOP_NAME}`;
  const crumb = document.getElementById("product-breadcrumb");
  if (crumb) {
    crumb.innerHTML = `
      <a href="${ROOT}index.html">Trang chủ</a>
      <span>/</span>
      <a href="${ROOT}pages/san-pham.html">Sản phẩm</a>
      <span>/</span>
      <a href="${categoryUrl(product.category)}">${product.categoryName}</a>
      <span>/</span>
      <span>${product.name}</span>`;
  }

  mount.innerHTML = `
    <div class="product-detail">
      ${galleryHtml(product)}
      <div class="product-info">
        <h1>${product.name}</h1>
        <p class="product-meta">
          Thương hiệu: <strong>${SHOP_NAME}</strong>
          · Mã sản phẩm: <strong>KS${String(product.id).padStart(3, "0")}</strong>
          · Danh mục: <a href="${categoryUrl(product.category)}">${product.categoryName}</a>
        </p>
        <div class="product-info__price">${priceHtml(product)}</div>
        ${promoBox()}
        ${productFormHtml(product)}
        <div class="product-assures">
          <span>Giao hàng toàn quốc</span>
          <span>Ưu đãi hấp dẫn</span>
          <span>Sản phẩm chính hãng</span>
        </div>
        <div class="product-desc">
          <h2>Mô tả sản phẩm</h2>
          <p>${product.description}</p>
        </div>
      </div>
    </div>`;

  bindProductForm(mount.querySelector(".product-info"), product);
  bindGallery(mount.querySelector(".product-gallery"));

  const relatedGrid = document.getElementById("related-products");
  if (relatedGrid) {
    relatedGrid.innerHTML = products
      .filter((item) => item.category === product.category && item.id !== product.id)
      .slice(0, 5)
      .map(renderProductCard)
      .join("");
  }
}

function bindProductEvents() {
  document.addEventListener("click", (event) => {
    const quick = event.target.closest("[data-quick]");
    if (quick) {
      event.preventDefault();
      openQuickView(quick.dataset.quick);
      return;
    }
    if (event.target.closest("[data-close-quick]")) closeQuickView();

    if (window.WISHLIST_HANDLES_CLICKS) return;
    const wish = event.target.closest(".btn-wishlist[data-id]");
    if (wish && typeof toggleWishlist === "function") {
      wish.classList.toggle("is-active", toggleWishlist(wish.dataset.id));
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeQuickView();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureShopFallbacks();
  injectGalleryStyles();
  bindProductEvents();
  renderKingShopProducts();
  renderHotProductTabs();
  setupHotProductTabs();
  initProductDetail();
});