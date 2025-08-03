import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';

interface Transaction {
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

interface ExpenseChartProps {
  transactions: Transaction[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--expense))',
  'hsl(var(--income))',
  'hsl(var(--balance))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
];

export const ExpenseChart = ({ transactions }: ExpenseChartProps) => {
  const chartData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = transactions.filter(
      t => t.type === 'expense' && t.date?.startsWith(currentMonth)
    );

    const categoryTotals = monthExpenses.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [transactions]);

  const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);

  const dataWithPercentages = chartData.map(item => ({
    ...item,
    percentage: totalAmount > 0 ? ((item.amount / totalAmount) * 100).toFixed(1) : '0',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-soft">
          <p className="font-medium text-foreground">{data.category}</p>
          <p className="text-expense">
            {data.amount.toLocaleString('ru-RU')} ₽ ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Расходы по категориям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Нет данных за текущий месяц
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Расходы по категориям
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentages}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="amount"
                stroke="hsl(var(--border))"
                strokeWidth={2}
              >
                {dataWithPercentages.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value, entry: any) => (
                  <span className="text-foreground text-sm">
                    {value} ({entry.payload?.percentage}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};