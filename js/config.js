/* config.js – Hằng số dùng chung (Người phụ trách: Nguyên)
   Muốn đổi tên shop, hotline, phí ship... chỉ cần sửa ở file này. */

const SHOP_NAME = "King Shop"; // TODO: nhóm chốt tên shop rồi sửa ở đây
const HOTLINE = "0123 456 789";
const MESSENGER_URL = "https://www.facebook.com/people/King-Shop/61594758165722/"; // TODO: thay bằng link Messenger/fanpage thật

// Tự nhận biết đang ở index.html hay trong pages/
const ROOT = location.pathname.includes("/pages/") ? "../" : "./";

const PRODUCTS_URL = ROOT + "data/products.json";
const IMAGE_DIR = ROOT + "assets/images/products/";
const PLACEHOLDER_IMG = IMAGE_DIR + "placeholder.jpg";

const SHIPPING_FEE = 30000; // đồng giá vận chuyển toàn quốc

const STORAGE_KEYS = {
  cart: "shop_cart",
  wishlist: "shop_wishlist",
  users: "shop_users",
  currentUser: "shop_currentUser",
  orders: "shop_orders",
};

// Danh mục sản phẩm (khớp với trường "category" trong products.json)
const CATEGORIES = [
  { slug: "ao-xuan-he", name: "Đồ xuân hè" },
  { slug: "do-thu-dong", name: "Đồ thu đông" },
  { slug: "coc-binh", name: "Cốc bình" },
  { slug: "lego", name: "Lego" },
  { slug: "giay-dep", name: "Giày dép" },
  { slug: "do-luu-niem", name: "Đồ lưu niệm" },
  { slug: "combo", name: "Combo quà tặng" },
];
