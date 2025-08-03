import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Target, Plus, CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  category?: string;
  is_completed: boolean;
}

interface FinancialGoalsProps {
  user: User;
}

export const FinancialGoals = ({ user }: FinancialGoalsProps) => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить цели",
      });
    }
  };

  const addGoal = async () => {
    if (!title || !targetAmount) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Заполните обязательные поля",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('financial_goals')
        .insert({
          user_id: user.id,
          title,
          target_amount: parseFloat(targetAmount),
          category: category || null,
          deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
        });

      if (error) throw error;

      await fetchGoals();
      setTitle('');
      setTargetAmount('');
      setCategory('');
      setDeadline(undefined);
      setShowAddForm(false);
      
      toast({
        title: "Успешно!",
        description: "Цель добавлена",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось добавить цель",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGoalProgress = async (goalId: string, amount: number) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const newAmount = Math.max(0, goal.current_amount + amount);
      const isCompleted = newAmount >= goal.target_amount;

      const { error } = await supabase
        .from('financial_goals')
        .update({ 
          current_amount: newAmount,
          is_completed: isCompleted
        })
        .eq('id', goalId);

      if (error) throw error;

      await fetchGoals();
      toast({
        title: "Успешно!",
        description: amount > 0 ? "Прогресс обновлен" : "Сумма уменьшена",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось обновить прогресс",
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      await fetchGoals();
      toast({
        title: "Успешно!",
        description: "Цель удалена",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить цель",
      });
    }
  };

  const getProgressPercentage = (goal: FinancialGoal) => {
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Финансовые цели
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить цель
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="p-4 border border-border rounded-lg space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Название цели *
              </label>
              <Input
                placeholder="Например: Отпуск в Турции"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Целевая сумма *
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="100000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Категория
              </label>
              <Input
                placeholder="Отпуск, Покупки, Инвестиции..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Дедлайн
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP", { locale: ru }) : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2">
              <Button onClick={addGoal} disabled={loading} className="flex-1">
                {loading ? 'Добавление...' : 'Добавить'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Отмена
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет финансовых целей. Добавьте первую цель!
            </div>
          ) : (
            goals.map((goal) => {
              const progress = getProgressPercentage(goal);
              const daysRemaining = goal.deadline ? getDaysRemaining(goal.deadline) : null;
              
              return (
                <div
                  key={goal.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    goal.is_completed ? "bg-success/10 border-success" : "bg-accent border-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">{goal.title}</h4>
                      {goal.category && (
                        <p className="text-sm text-muted-foreground">{goal.category}</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Цель "{goal.title}" будет удалена безвозвратно.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteGoal(goal.id)}>
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="font-medium">
                        {goal.current_amount.toLocaleString('ru-RU')} ₽ / {goal.target_amount.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    
                    <Progress value={progress} className="h-2" />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className={cn(
                        "font-medium",
                        goal.is_completed ? "text-success" : "text-foreground"
                      )}>
                        {progress.toFixed(1)}% {goal.is_completed && "✓ Выполнено!"}
                      </span>
                      
                      {daysRemaining !== null && !goal.is_completed && (
                        <span className={cn(
                          "text-xs",
                          daysRemaining < 30 ? "text-expense" : "text-muted-foreground"
                        )}>
                          {daysRemaining > 0 
                            ? `${daysRemaining} дн. осталось`
                            : daysRemaining === 0 
                            ? "Сегодня дедлайн!"
                            : `Просрочено на ${Math.abs(daysRemaining)} дн.`
                          }
                        </span>
                      )}
                    </div>

                    {!goal.is_completed && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalProgress(goal.id, 1000)}
                          className="flex-1"
                        >
                          +1000 ₽
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalProgress(goal.id, 5000)}
                          className="flex-1"
                        >
                          +5000 ₽
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalProgress(goal.id, -1000)}
                          className="flex-1"
                        >
                          -1000 ₽
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};