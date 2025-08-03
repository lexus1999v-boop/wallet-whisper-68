import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Transaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

interface TrendChartProps {
  transactions: Transaction[];
}

export const TrendChart = ({ transactions }: TrendChartProps) => {
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 29 - i));
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        date: dateStr,
        displayDate: format(date, 'dd.MM', { locale: ru }),
        income,
        expenses,
        balance: income - expenses,
      };
    });

    return last30Days;
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(chartData.find(d => d.displayDate === label)?.date || '');
      
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-soft">
          <p className="font-medium text-foreground mb-2">
            {format(date, 'dd MMMM yyyy', { locale: ru })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString('ru-RU')} ₽
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = chartData.some(d => d.income > 0 || d.expenses > 0);

  if (!hasData) {
    return (
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Тренды за 30 дней
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Недостаточно данных для отображения трендов
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Тренды за 30 дней
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="displayDate" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `${value.toLocaleString('ru-RU')}₽`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="hsl(var(--income))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--income))', strokeWidth: 2, r: 3 }}
                name="Доходы"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--expense))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--expense))', strokeWidth: 2, r: 3 }}
                name="Расходы"
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--balance))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--balance))', strokeWidth: 2, r: 3 }}
                name="Баланс"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};