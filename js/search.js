/* search.js – Lọc, sắp xếp, phân trang danh sách / tìm kiếm (Người phụ trách: Kiệt) */

const PAGE_SIZE = 12;

function catalogStateFromUrl() {
  const params = new URLSearchParams(location.search);
  return {
    q: (params.get("q") || "").trim(),
    category: params.get("category") || "",
    color: params.get("color") || "",
    price: params.get("price") || "",
    sort: params.get("sort") || "alpha-asc",
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function writeCatalogUrl(state) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category) params.set("category", state.category);
  if (state.color) params.set("color", state.color);
  if (state.price) params.set("price", state.price);
  if (state.sort && state.sort !== "alpha-asc") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  const next = `${location.pathname}${query ? `?${query}` : ""}`;
  history.replaceState(state, "", next);
}

function matchesQuery(product, q) {
  if (!q) return true;
  const haystack = removeVietnameseTones(
    `${product.name} ${product.categoryName} ${product.description || ""}`
  ).toLowerCase();
  return haystack.includes(removeVietnameseTones(q).toLowerCase());
}

function filterCatalog(list, state) {
  const range = PRICE_RANGES.find((item) => item.id === state.price);
  return list.filter((product) => {
    if (state.category && product.category !== state.category) return false;
    if (state.color && !(product.colors || []).includes(state.color)) return false;
    if (range) {
      const price = getFinalPrice(product);
      const inRange = range.max === Infinity
        ? price >= range.min
        : range.min === 0
          ? price < range.max
          : price >= range.min && price <= range.max;
      if (!inRange) return false;
    }
    return matchesQuery(product, state.q);
  });
}

function sortCatalog(list, sort) {
  const copy = [...list];
  copy.sort((a, b) => {
    if (sort === "alpha-desc") return b.name.localeCompare(a.name, "vi");
    if (sort === "price-asc") return getFinalPrice(a) - getFinalPrice(b);
    if (sort === "price-desc") return getFinalPrice(b) - getFinalPrice(a);
    if (sort === "created-desc") return String(b.createdAt).localeCompare(String(a.createdAt));
    return a.name.localeCompare(b.name, "vi");
  });
  return copy;
}

function availableColors(list) {
  const set = new Set();
  list.forEach((product) => (product.colors || []).forEach((color) => set.add(color)));
  return [...set];
}

function renderSidebar(state, allProducts) {
  const sidebar = document.getElementById("catalog-sidebar");
  if (!sidebar) return;
  const colors = availableColors(allProducts);
  const categoryLinks = `<li><a href="${ROOT}pages/san-pham.html" class="${state.category ? "" : "is-active"}">Tất cả sản phẩm</a></li>` +
    CATEGORIES.map((category) => `
      <li>
        <a href="${ROOT}pages/san-pham.html?category=${category.slug}" class="${state.category === category.slug ? "is-active" : ""}">${category.name}</a>
      </li>`).join("");

  const colorItems = colors.map((color) => `
    <li>
      <button type="button" class="filter-color${state.color === color ? " is-active" : ""}" data-filter="color" data-value="${color}">
        <span class="swatch swatch--${color}"></span>
        ${colorLabel(color)}
      </button>
    </li>`).join("");

  const priceItems = PRICE_RANGES.map((range) => `
    <li>
      <label class="filter-check">
        <input type="checkbox" data-filter="price" data-value="${range.id}" ${state.price === range.id ? "checked" : ""}>
        <span>${range.label}</span>
      </label>
    </li>`).join("");

  sidebar.innerHTML = `
    <details class="filter-group" open>
      <summary>Danh mục</summary>
      <ul class="filter-links">${categoryLinks}</ul>
    </details>
    <details class="filter-group" open>
      <summary>Màu sắc</summary>
      <ul class="filter-colors">${colorItems || "<li>Không có dữ liệu màu</li>"}</ul>
      ${state.color ? `<button type="button" class="filter-clear" data-filter="color" data-value="">Xóa lọc màu</button>` : ""}
    </details>
    <details class="filter-group" open>
      <summary>Mức giá</summary>
      <ul>${priceItems}</ul>
    </details>`;
}

function renderPagination(total, page) {
  const nav = document.getElementById("catalog-pagination");
  if (!nav) return;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) {
    nav.innerHTML = "";
    return;
  }
  let html = "";
  for (let i = 1; i <= pages; i += 1) {
    html += `<button type="button" class="page-btn${i === page ? " is-active" : ""}" data-page="${i}">${i}</button>`;
  }
  nav.innerHTML = html;
}

function catalogTitle(state) {
  if (state.q) return `Kết quả tìm kiếm: “${state.q}”`;
  const category = CATEGORIES.find((item) => item.slug === state.category);
  return category ? category.name : "Tất cả sản phẩm";
}

async function renderCatalog() {
  const grid = document.getElementById("product-catalog");
  if (!grid) return;
  ensureShopFallbacks();
  const state = catalogStateFromUrl();
  try {
    if (!products.length) await loadProducts();
  } catch (error) {
    grid.innerHTML = "<p>Không thể tải sản phẩm lúc này.</p>";
    return;
  }

  const filtered = sortCatalog(filterCatalog(products, state), state.sort);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (state.page > pages) state.page = pages;
  writeCatalogUrl(state);

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);
  const title = catalogTitle(state);
  const titleEl = document.getElementById("catalog-title");
  const crumb = document.getElementById("breadcrumb-current");
  const countEl = document.getElementById("catalog-count");
  if (titleEl) titleEl.textContent = title;
  if (crumb) crumb.textContent = title;
  document.title = `${title} | ${SHOP_NAME}`;
  if (countEl) countEl.textContent = `${filtered.length} sản phẩm`;

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) sortSelect.value = state.sort;

  renderSidebar(state, products);
  grid.innerHTML = pageItems.length
    ? pageItems.map(renderProductCard).join("")
    : `<p class="empty-state">Không tìm thấy sản phẩm phù hợp.</p>`;
  renderPagination(filtered.length, state.page);
}

function bindCatalogEvents() {
  const sortSelect = document.getElementById("sort-select");
  sortSelect?.addEventListener("change", () => {
    const params = new URLSearchParams(location.search);
    params.set("sort", sortSelect.value);
    params.delete("page");
    history.pushState({}, "", `${location.pathname}?${params.toString()}`);
    renderCatalog();
  });

  document.getElementById("catalog-sidebar")?.addEventListener("click", (event) => {
    const colorBtn = event.target.closest("[data-filter='color']");
    const priceInput = event.target.closest("[data-filter='price']");
    if (!colorBtn && !priceInput) return;
    const params = new URLSearchParams(location.search);
    if (colorBtn) {
      const value = colorBtn.dataset.value;
      if (value) params.set("color", value);
      else params.delete("color");
    }
    if (priceInput) {
      event.preventDefault();
      const value = priceInput.dataset.value;
      if (params.get("price") === value) params.delete("price");
      else params.set("price", value);
    }
    params.delete("page");
    history.pushState({}, "", `${location.pathname}?${params.toString()}`);
    renderCatalog();
  });

  document.getElementById("catalog-pagination")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-page]");
    if (!btn) return;
    const params = new URLSearchParams(location.search);
    params.set("page", btn.dataset.page);
    history.pushState({}, "", `${location.pathname}?${params.toString()}`);
    renderCatalog();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("popstate", () => renderCatalog());
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("product-catalog")) return;
  bindCatalogEvents();
  renderCatalog();
});
