import Layout from "../components/Layout";
import KpiCard from "../components/KpiCard";
import Chart from "../components/Chart";
import { DollarSign, ShoppingCart, Boxes, AlertTriangle, ArrowUp } from "lucide-react";
import { sales } from "../mockData.js";
import {
  getRevenueByDate,
  getTransactionsByDate,
  percentChange,
  countLowStock,
  countOutOfStock,
  weeklyLabels,
  weeklyRevenue,
} from "../utils/Utils.js";


export default function Dashboard() {
  const todayDate = sales.daily[sales.daily.length - 1].date;     
  const yesterdayDate = sales.daily[sales.daily.length - 2].date;  

  const todayRevenue = getRevenueByDate(todayDate);
  const yesterdayRevenue = getRevenueByDate(yesterdayDate);
  const saleChange = percentChange(todayRevenue, yesterdayRevenue);

  const todayTx = getTransactionsByDate(todayDate);
  const yesterdayTx = getTransactionsByDate(yesterdayDate);
  const txChange = percentChange(todayTx, yesterdayTx);

  const lowStock = countLowStock();
  const outOfStock = countOutOfStock();



  return (
    <Layout>
      <h1 className="text-2xl text-heading font-semibold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Today's Sale */}
            <KpiCard
              bgColor="#BCD3E4"
              title="Today's Sale"
              icon={<DollarSign />}
              value={`₱${todayRevenue.toLocaleString()}`}
              description={
                <>
                  <span className="flex bg-deepBlue/50 p-1 rounded-full font-bold">
                    <ArrowUp size={14} /> {saleChange}%
                  </span>
                  &nbsp;vs yesterday
                </>
              }
            />

            {/* Today's Transactions */}
            <KpiCard
              bgColor="#D4E0EB"
              title="Transactions"
              icon={<ShoppingCart />}
              value={todayTx}
              description={
                <>
                  <span className="flex bg-deepBlue/50 p-1 rounded-full font-bold">
                    <ArrowUp size={14} /> {txChange}%
                  </span>
                  &nbsp;vs yesterday
                </>
              }
            />

            {/* Low Stock */}
            <KpiCard
              bgColor="#E7F0F7"
              title="Low Stock Items"
              icon={<Boxes />}
              value={lowStock}
              description={<>Items below reorder point</>}
            />

            {/* Out of Stock */}
            <KpiCard
              bgColor="#F4F8FB"
              title="Out of Stock"
              icon={<AlertTriangle />}
              value={outOfStock}
              description={<>Items requiring immediate attention</>}
            />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        


          
        </div>
    </Layout>
  );
}
