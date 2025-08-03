import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Plus, Download, LogOut, TrendingUp, TrendingDown, Wallet, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  date: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
}

interface FinanceTrackerProps {
  user: User;
}


export const FinanceTracker = ({ user }: FinanceTrackerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить транзакции",
      });
    }
  };

  const addTransaction = async () => {
    if (!amount || !category || !selectedDate) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Заполните все обязательные поля",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          category,
          amount: parseFloat(amount),
          type,
          description: description || null,
        });

      if (error) throw error;

      await fetchTransactions();
      setAmount('');
      setCategory('');
      setDescription('');
      
      toast({
        title: "Успешно!",
        description: "Транзакция добавлена",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось добавить транзакцию",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchTransactions();
      toast({
        title: "Успешно!",
        description: "Транзакция удалена",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить транзакцию",
      });
    }
  };

  const deleteAllTransactions = async () => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchTransactions();
      toast({
        title: "Успешно!",
        description: "Все транзакции удалены",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить транзакции",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const exportToCSV = () => {
    const csvHeader = 'Дата,Категория,Сумма,Тип,Описание\n';
    const csvContent = transactions
      .map(t => `${t.date},${t.category},${t.amount},${t.type === 'income' ? 'Доход' : 'Расход'},${t.description || ''}`)
      .join('\n');
    
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `finances-${format(new Date(), 'yyyy-MM')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateSummary = () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses, balance: income - expenses };
  };

  const getDaySummary = (date: Date) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.date === dayStr);
    
    const income = dayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = dayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses, count: dayTransactions.length };
  };

  const { income, expenses, balance } = calculateSummary();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Твои деньги под контролем</h1>
            <p className="text-muted-foreground">Добро пожаловать, {user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Доходы</CardTitle>
              <TrendingUp className="h-4 w-4 text-income" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-income">
                {income.toLocaleString('ru-RU')} ₽
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Расходы</CardTitle>
              <TrendingDown className="h-4 w-4 text-expense" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-expense">
                {expenses.toLocaleString('ru-RU')} ₽
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Баланс</CardTitle>
              <Wallet className="h-4 w-4 text-balance" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                balance >= 0 ? "text-income" : "text-expense"
              )}>
                {balance.toLocaleString('ru-RU')} ₽
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Add Transaction */}
          <div className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Добавить транзакцию
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Дата
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Тип
                  </label>
                  <Select value={type} onValueChange={(value: 'income' | 'expense') => setType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Доход</SelectItem>
                      <SelectItem value="expense">Расход</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                 <div>
                   <label className="text-sm font-medium text-foreground mb-2 block">
                     Категория
                   </label>
                   <Input
                     placeholder="Введите категорию..."
                     value={category}
                     onChange={(e) => setCategory(e.target.value)}
                   />
                 </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Сумма
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Описание (необязательно)
                  </label>
                  <Input
                    placeholder="Добавьте описание..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <Button
                  onClick={addTransaction}
                  disabled={loading}
                  className="w-full bg-gradient-primary"
                >
                  {loading ? 'Добавление...' : 'Добавить транзакцию'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Transactions List */}
          <div className="space-y-6">
            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Последние транзакции</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportToCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  {transactions.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Очистить все
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить все транзакции?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Это действие нельзя отменить. Все ваши транзакции будут безвозвратно удалены.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteAllTransactions}>Удалить все</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-accent group"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {transaction.category}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.date), 'dd.MM.yyyy', { locale: ru })}
                        </p>
                        {transaction.description && (
                          <p className="text-xs text-muted-foreground">
                            {transaction.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "font-bold",
                          transaction.type === 'income' ? "text-income" : "text-expense"
                        )}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {transaction.amount.toLocaleString('ru-RU')} ₽
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить транзакцию?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Удалить транзакцию "{transaction.category}" на сумму {transaction.amount.toLocaleString('ru-RU')} ₽?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTransaction(transaction.id)}>Удалить</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Пока нет транзакций. Добавьте первую!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};