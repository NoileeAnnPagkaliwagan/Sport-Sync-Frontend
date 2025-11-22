import { sales, transactions, products, categories } from "../mockData";

// ------------------------------
// Dashboard - KPI
// ------------------------------
export const getRevenueByDate = (dateString) => {
  const dayData = sales.daily.find((d) => d.date === dateString);
  return dayData ? dayData.revenue : 0;
};

export const getTransactionsByDate = (dateString) => {
  return transactions.filter((t) =>
    t.date.toISOString().startsWith(dateString)
  ).length;
};

export const percentChange = (current, previous) => {
  if (previous === 0) return 100;
  return (((current - previous) / previous) * 100).toFixed(1);
};

export const countLowStock = () =>
  products.filter((p) => p.quantity <= 10 && p.quantity > 0).length;

export const countOutOfStock = () =>
  products.filter((p) => p.quantity === 0).length;

// ------------------------------
// Dashboard - Charts
// ------------------------------
export const weeklyLabels = sales.weekly.map((w) => w.week);
export const weeklyRevenue = sales.weekly.map((w) => w.revenue);
export const weeklyVolume = sales.weekly.map((w) => w.volume);

// Category-wise data for today
const categoryMap = {};
categories.forEach((cat) => {
  categoryMap[cat.id] = cat.category_name;
});

const todayDate = sales.daily[sales.daily.length - 1].date;
const todaysTransactions = transactions.filter((t) =>
  t.date.toISOString().startsWith(todayDate)
);

export const todayCategoryVolume = {};
export const todayCategoryRevenue = {};

todaysTransactions.forEach((t) => {
  const product = products.find((p) => p.id === t.product_id);
  if (!product) return;

  const catName = categoryMap[product.category_id];

  if (!todayCategoryVolume[catName]) {
    todayCategoryVolume[catName] = 0;
    todayCategoryRevenue[catName] = 0;
  }

  todayCategoryVolume[catName] += t.quantity;
  todayCategoryRevenue[catName] += t.total_amount;
});

export const todayCategoryNames = Object.keys(todayCategoryVolume);
export const todayCategoryVolumeValues = Object.values(todayCategoryVolume);
export const todayCategoryRevenueValues = Object.values(todayCategoryRevenue);