// js/products.js (Bản dùng tạm để test giỏ hàng)
let cachedProducts = null;

async function loadProducts() {
  if (cachedProducts) return cachedProducts;
  try {
    const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");
    const response = await fetch(`${rootPath}data/products.json`);
    cachedProducts = await response.json();
    return cachedProducts;
  } catch (error) {
    console.error("Lỗi đọc products.json:", error);
    return [];
  }
}

async function getProductById(id) {
  const products = await loadProducts();
  return products.find(p => p.id === Number(id));
}

function getFinalPrice(product) {
  return product.salePrice ?? product.price;
}

function formatPrice(number) {
  return new Intl.NumberFormat("vi-VN").format(number) + "₫";
}

function getImageUrl(fileName) {
  const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");
  return `${rootPath}assets/images/products/${fileName}`;
}