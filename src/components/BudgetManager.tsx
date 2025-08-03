import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Wallet, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Budget {
  id: string;
  category: string;
  limit_amount: number;
  period: 'monthly' | 'weekly';
  start_date: string;
  end_date: string;
}

interface Transaction {
  category: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

interface BudgetManagerProps {
  user: User;
  transactions: Transaction[];
}

export const BudgetManager = ({ user, transactions }: BudgetManagerProps) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBudgets((data || []) as Budget[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить бюджеты",
      });
    }
  };

  const addBudget = async () => {
    if (!category || !limitAmount) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Заполните все поля",
      });
      return;
    }

    const now = new Date();
    const startDate = period === 'monthly' 
      ? startOfMonth(now)
      : startOfWeek(now, { weekStartsOn: 1 });
    const endDate = period === 'monthly'
      ? endOfMonth(now)
      : endOfWeek(now, { weekStartsOn: 1 });

    setLoading(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          category,
          limit_amount: parseFloat(limitAmount),
          period,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        });

      if (error) throw error;

      await fetchBudgets();
      setCategory('');
      setLimitAmount('');
      setShowAddForm(false);
      
      toast({
        title: "Успешно!",
        description: "Бюджет добавлен",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось добавить бюджет",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBudget = async (budgetId: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;

      await fetchBudgets();
      toast({
        title: "Успешно!",
        description: "Бюджет удален",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить бюджет",
      });
    }
  };

  const budgetAnalysis = useMemo(() => {
    return budgets.map(budget => {
      const spent = transactions
        .filter(t => 
          t.type === 'expense' &&
          t.category === budget.category &&
          t.date >= budget.start_date &&
          t.date <= budget.end_date
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = (spent / budget.limit_amount) * 100;
      const remaining = budget.limit_amount - spent;
      const isOverBudget = spent > budget.limit_amount;
      const isNearLimit = percentage > 80 && !isOverBudget;

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        isOverBudget,
        isNearLimit,
      };
    });
  }, [budgets, transactions]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      transactions
        .filter(t => t.type === 'expense')
        .map(t => t.category)
    );
    return Array.from(uniqueCategories);
  }, [transactions]);

  return (
    <Card className="shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Бюджеты
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить бюджет
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="p-4 border border-border rounded-lg space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Категория *
              </label>
              <Input
                placeholder="Название категории"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="categories"
              />
              <datalist id="categories">
                {categories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Лимит *
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="50000"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Период *
              </label>
              <Select value={period} onValueChange={(value: 'monthly' | 'weekly') => setPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Месячный</SelectItem>
                  <SelectItem value="weekly">Недельный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={addBudget} disabled={loading} className="flex-1">
                {loading ? 'Добавление...' : 'Добавить'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Отмена
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {budgetAnalysis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет бюджетов. Создайте первый бюджет для контроля расходов!
            </div>
          ) : (
            budgetAnalysis.map((budget) => (
              <div
                key={budget.id}
                className={cn(
                  "p-4 rounded-lg border",
                  budget.isOverBudget 
                    ? "bg-destructive/10 border-destructive" 
                    : budget.isNearLimit
                    ? "bg-yellow-500/10 border-yellow-500"
                    : "bg-accent border-border"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      {budget.category}
                      {(budget.isOverBudget || budget.isNearLimit) && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground capitalize">
                      {budget.period === 'monthly' ? 'Месячный' : 'Недельный'} бюджет
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить бюджет?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Бюджет для категории "{budget.category}" будет удален.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteBudget(budget.id)}>
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Потрачено</span>
                    <span className={cn(
                      "font-medium",
                      budget.isOverBudget ? "text-destructive" : "text-foreground"
                    )}>
                      {budget.spent.toLocaleString('ru-RU')} ₽ / {budget.limit_amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  
                  <Progress 
                    value={Math.min(budget.percentage, 100)} 
                    className={cn(
                      "h-2",
                      budget.isOverBudget && "bg-destructive/20"
                    )}
                  />
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className={cn(
                      "font-medium",
                      budget.isOverBudget 
                        ? "text-destructive" 
                        : budget.isNearLimit
                        ? "text-yellow-600"
                        : "text-foreground"
                    )}>
                      {budget.percentage.toFixed(1)}%
                      {budget.isOverBudget && " (превышен!)"}
                      {budget.isNearLimit && " (близко к лимиту)"}
                    </span>
                    
                    <span className={cn(
                      "text-xs",
                      budget.remaining < 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {budget.remaining >= 0 
                        ? `Осталось: ${budget.remaining.toLocaleString('ru-RU')} ₽`
                        : `Превышение: ${Math.abs(budget.remaining).toLocaleString('ru-RU')} ₽`
                      }
                    </span>
                  </div>

                  {budget.isOverBudget && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                      ⚠️ Бюджет превышен на {Math.abs(budget.remaining).toLocaleString('ru-RU')} ₽
                    </div>
                  )}

                  {budget.isNearLimit && !budget.isOverBudget && (
                    <div className="mt-2 p-2 bg-yellow-500/10 rounded text-sm text-yellow-700">
                      ⚡ Приближается к лимиту! Осталось: {budget.remaining.toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};