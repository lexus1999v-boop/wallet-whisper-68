import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Settings, Users, BarChart3, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

interface AnalyticsSetting {
  id: string;
  name: string;
  provider: string;
  tracking_id: string;
  script_url?: string;
  is_active: boolean;
}

interface UserSession {
  id: string;
  user_id: string;
  login_time: string;
  logout_time?: string;
  ip_address?: unknown;
  user_agent?: unknown;
  session_duration?: unknown;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string;
  created_at: string;
  email?: string;
}

interface AdminPanelProps {
  user: User;
  onBack: () => void;
}

export const AdminPanel = ({ user, onBack }: AdminPanelProps) => {
  const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSetting[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSetting, setNewSetting] = useState({
    name: '',
    provider: 'yandex',
    tracking_id: '',
    script_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch analytics settings
      const { data: settings } = await supabase
        .from('analytics_settings')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch user sessions
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(100);

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setAnalyticsSettings(settings || []);
      setUserSessions(sessions || []);
      setUserProfiles(profiles || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить данные администратора",
      });
    } finally {
      setLoading(false);
    }
  };

  const addAnalyticsSetting = async () => {
    if (!newSetting.name || !newSetting.tracking_id) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Заполните все обязательные поля",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('analytics_settings')
        .insert({
          name: newSetting.name,
          provider: newSetting.provider,
          tracking_id: newSetting.tracking_id,
          script_url: newSetting.script_url || null,
        });

      if (error) throw error;

      setNewSetting({ name: '', provider: 'yandex', tracking_id: '', script_url: '' });
      fetchData();
      toast({
        title: "Успешно!",
        description: "Счетчик добавлен",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось добавить счетчик",
      });
    }
  };

  const toggleSetting = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('analytics_settings')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось обновить настройку",
      });
    }
  };

  const deleteSetting = async (id: string) => {
    try {
      const { error } = await supabase
        .from('analytics_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      toast({
        title: "Успешно!",
        description: "Счетчик удален",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось удалить счетчик",
      });
    }
  };

  const getActiveUsersCount = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return userSessions.filter(session => 
      new Date(session.login_time) > yesterday
    ).length;
  };

  const getTotalUsersCount = () => {
    return userProfiles.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Загрузка админ панели...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Административная панель</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к трекеру
          </Button>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Аналитика</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="sessions">Сессии</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalUsersCount()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Активные (24ч)</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getActiveUsersCount()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Счетчики</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsSettings.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Add Analytics Setting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Добавить счетчик
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Название</label>
                    <Input
                      placeholder="Яндекс.Метрика"
                      value={newSetting.name}
                      onChange={(e) => setNewSetting({...newSetting, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Провайдер</label>
                    <Select value={newSetting.provider} onValueChange={(value) => setNewSetting({...newSetting, provider: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yandex">Яндекс.Метрика</SelectItem>
                        <SelectItem value="google">Google Analytics</SelectItem>
                        <SelectItem value="custom">Другой</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">ID счетчика</label>
                    <Input
                      placeholder="12345678"
                      value={newSetting.tracking_id}
                      onChange={(e) => setNewSetting({...newSetting, tracking_id: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">URL скрипта (опционально)</label>
                    <Input
                      placeholder="https://mc.yandex.ru/metrika/tag.js"
                      value={newSetting.script_url}
                      onChange={(e) => setNewSetting({...newSetting, script_url: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={addAnalyticsSetting} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Добавить счетчик
                </Button>
              </CardContent>
            </Card>

            {/* Analytics Settings List */}
            <Card>
              <CardHeader>
                <CardTitle>Настроенные счетчики</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsSettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{setting.name}</h3>
                          <Badge variant={setting.provider === 'yandex' ? 'default' : setting.provider === 'google' ? 'secondary' : 'outline'}>
                            {setting.provider}
                          </Badge>
                          <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                            {setting.is_active ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">ID: {setting.tracking_id}</p>
                        {setting.script_url && (
                          <p className="text-xs text-muted-foreground mt-1">{setting.script_url}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={setting.is_active}
                          onCheckedChange={(checked) => toggleSetting(setting.id, checked)}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSetting(setting.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {analyticsSettings.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Счетчики не настроены
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Зарегистрированные пользователи</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{profile.display_name || 'Без имени'}</p>
                        <p className="text-sm text-muted-foreground">
                          Регистрация: {format(new Date(profile.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {userProfiles.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Пользователи не найдены
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Последние сессии пользователей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          Вход: {format(new Date(session.login_time), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                        </p>
                        {session.logout_time && (
                          <p className="text-sm text-muted-foreground">
                            Выход: {format(new Date(session.logout_time), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                          </p>
                        )}
                        {session.ip_address && (
                          <p className="text-xs text-muted-foreground">IP: {String(session.ip_address)}</p>
                        )}
                      </div>
                      <Badge variant={session.logout_time ? 'secondary' : 'default'}>
                        {session.logout_time ? 'Завершена' : 'Активна'}
                      </Badge>
                    </div>
                  ))}
                  {userSessions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Сессии не найдены
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};