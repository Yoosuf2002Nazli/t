import React from 'react';
import { View, Text, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import tw from 'twrnc';
import { Receipt, Category } from '../types';

interface DashboardProps {
  receipts: Receipt[];
  monthlyBudget: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  [Category.Food]: '#10b981', // Emerald
  [Category.Furniture]: '#f59e0b', // Amber
  [Category.Stationery]: '#3b82f6', // Blue
  [Category.Medicine]: '#f43f5e', // Rose
  [Category.BabyAccessories]: '#ec4899', // Pink
  [Category.MobileAccessories]: '#14b8a6', // Teal
  [Category.PetItems]: '#f97316', // Orange
  [Category.BankPayment]: '#8b5cf6', // Violet
  [Category.Transport]: '#eab308', // Yellow
  [Category.Other]: '#64748b' // Slate
};

const Dashboard: React.FC<DashboardProps> = ({ receipts, monthlyBudget }) => {
  const totalSpent = receipts.reduce((sum, r) => sum + r.total, 0);
  const budgetProgress = Math.min((totalSpent / monthlyBudget) * 100, 100);

  // Category distribution
  const rawCategoryData = Object.values(Category).map((cat) => {
    const spentInCategory = receipts.reduce((sum, r) => {
      const itemTotal = r.items
        .filter(i => i.category === cat)
        .reduce((s, i) => s + i.price, 0);
      if (r.items.length === 0 && r.category === cat) return sum + r.total;
      return sum + itemTotal;
    }, 0);
    return {
      name: cat,
      population: spentInCategory,
      color: CATEGORY_COLORS[cat],
      legendFontColor: '#cbd5e1',
      legendFontSize: 10
    };
  });

  const categoryData = rawCategoryData.filter(d => d.population > 0);
  const displayCategoryData = categoryData.length > 0 
    ? categoryData 
    : [{ name: 'No Expenses', population: 1, color: '#1e293b', legendFontColor: '#64748b', legendFontSize: 10 }];

  // Last 7 days spending
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayTotal = receipts
      .filter(r => new Date(r.timestamp).toDateString() === d.toDateString())
      .reduce((sum, r) => sum + r.total, 0);
    return { name: dateStr, amount: dayTotal };
  }).reverse();

  const barData = {
    labels: last7Days.map(d => d.name),
    datasets: [
      {
        data: last7Days.map(d => d.amount)
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: '#0f172a',
    backgroundGradientTo: '#0f172a',
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  };

  const screenWidth = Dimensions.get('window').width - 32;

  return (
    <ScrollView style={tw`flex-1 px-4 py-6`} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Budget Card */}
      <View style={tw`bg-slate-900/60 border border-slate-800 p-6 rounded-3xl shadow-lg mb-6 relative overflow-hidden`}>
        <View style={tw`absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full -mr-16 -mt-16`} />
        
        <View style={tw`flex-row justify-between items-end mb-6 z-10`}>
          <View>
            <Text style={tw`text-slate-500 text-sm font-bold uppercase tracking-widest mb-2`}>Spent this month</Text>
            <Text style={tw`text-4xl font-black text-white`}>Rs. {totalSpent.toFixed(2)}</Text>
          </View>
          <View style={tw`items-end`}>
            <Text style={tw`text-slate-500 text-sm font-bold uppercase tracking-widest mb-1`}>Budget</Text>
            <Text style={tw`text-xl font-black text-indigo-400`}>Rs. {monthlyBudget}</Text>
          </View>
        </View>

        <View style={tw`w-full h-4 bg-slate-800 rounded-full overflow-hidden shadow-inner`}>
          <View style={[tw`h-full rounded-full`, { width: `${budgetProgress}%`, backgroundColor: totalSpent > monthlyBudget ? '#ef4444' : '#8b5cf6' }]} />
        </View>

        <View style={tw`mt-4 flex-row justify-between`}>
          <Text style={tw`text-xs font-black uppercase text-slate-500`}>Progress</Text>
          <Text style={[tw`text-xs font-black uppercase`, totalSpent > monthlyBudget ? tw`text-red-400` : tw`text-purple-400`]}>
            {budgetProgress.toFixed(1)}% Utilized
          </Text>
        </View>
      </View>

      <View style={tw`mb-6`}>
        <View style={tw`bg-slate-900/60 p-4 rounded-3xl border border-slate-800 shadow-lg`}>
          <View style={tw`flex-row items-center mb-4`}>
             <View style={tw`w-1.5 h-6 bg-indigo-500 rounded-full mr-2`} />
             <Text style={tw`text-slate-200 font-bold text-lg`}>Daily Trend (Rs.)</Text>
          </View>
          <BarChart
            style={{ borderRadius: 16 }}
            data={barData}
            width={screenWidth - 32}
            height={220}
            yAxisLabel="Rs."
            yAxisSuffix=""
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            showValuesOnTopOfBars={true}
            fromZero
          />
        </View>
      </View>

      <View style={tw`mb-6 bg-slate-900/60 p-4 rounded-3xl border border-slate-800 shadow-lg`}>
        <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-1.5 h-6 bg-purple-500 rounded-full mr-2`} />
            <Text style={tw`text-slate-200 font-bold text-lg`}>Category Mix</Text>
        </View>
        
        <View style={tw`items-center justify-center`}>
          <PieChart
            data={displayCategoryData}
            width={screenWidth - 32}
            height={200}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"0"}
            center={[screenWidth / 4 - 20, 0]}
            absolute
            hasLegend={false}
          />
        </View>

        {/* Dynamic Category Legend */}
        <View style={tw`mt-4 pt-4 border-t border-slate-800/80`}>
          <View style={tw`flex-row flex-wrap gap-y-3`}>
            {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
              const isActive = categoryData.some(d => d.name === cat);
              return (
                <View key={cat} style={tw`flex-row items-center w-[50%] opacity-${isActive ? '100' : '40'}`}>
                  <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: isActive ? color : '#334155' }]} />
                  <Text style={tw`text-xs font-bold ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{cat}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default Dashboard;
