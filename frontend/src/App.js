import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Label } from './components/ui/label';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';

// Icons
import { Shield, UserPlus, ClipboardList, BarChart3, LogOut, User, Plus, Camera, Clock, MapPin, Users, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, senha) => {
    const response = await axios.post(`${API}/auth/login`, { email, senha });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, senha);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao sistema de segurança.",
      });
    } catch (error) {
      toast({
        title: "Erro no login",
        description: error.response?.data?.detail || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Sistema de Segurança</CardTitle>
          <CardDescription className="text-gray-300">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-white/10 border-white/30 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-white">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
                className="bg-white/10 border-white/30 text-white placeholder:text-gray-400"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-blue-600/20 rounded-lg">
            <p className="text-sm text-gray-300 text-center mb-2">Credenciais padrão:</p>
            <p className="text-xs text-gray-400 text-center">Admin: admin@sistema.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Stats
const DashboardStats = () => {
  const [stats, setStats] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  if (user.role === 'vigilante') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minhas Ocorrências Hoje</CardTitle>
            <AlertTriangle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.minhas_ocorrencias_hoje || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minhas Rondas Hoje</CardTitle>
            <Route className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.minhas_rondas_hoje || 0}</div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${stats.ronda_ativa ? 'from-orange-500 to-orange-600' : 'from-gray-500 to-gray-600'} text-white`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Ronda</CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.ronda_ativa ? 'Em Andamento' : 'Inativa'}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ocorrências Hoje</CardTitle>
          <AlertTriangle className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_ocorrencias_hoje || 0}</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rondas Hoje</CardTitle>
          <Route className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_rondas_hoje || 0}</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
          <Users className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_usuarios || 0}</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rondas Ativas</CardTitle>
          <Clock className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.rondas_ativas || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
};

// Create Occurrence
const CreateOccurrence = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    local: '',
    tipo: '',
    descricao: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const occurrenceTypes = [
    { value: 'roubo', label: 'Roubo' },
    { value: 'vandalismo', label: 'Vandalismo' },
    { value: 'incendio', label: 'Incêndio' },
    { value: 'acidente', label: 'Acidente' },
    { value: 'suspeito', label: 'Atividade Suspeita' },
    { value: 'emergencia_medica', label: 'Emergência Médica' },
    { value: 'outros', label: 'Outros' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/occurrences`, formData);
      toast({
        title: "Ocorrência registrada com sucesso!",
        description: "A ocorrência foi salva no sistema.",
      });
      
      setFormData({ local: '', tipo: '', descricao: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao criar ocorrência",
        description: error.response?.data?.detail || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nova Ocorrência
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              value={formData.local}
              onChange={(e) => setFormData({...formData, local: e.target.value})}
              placeholder="Ex: Portaria Principal, Estacionamento..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo da Ocorrência</Label>
            <Select onValueChange={(value) => setFormData({...formData, tipo: value})} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {occurrenceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              placeholder="Descreva detalhadamente o que aconteceu..."
              rows={4}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Registrar Ocorrência'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Occurrences List
const OccurrencesList = ({ refreshTrigger }) => {
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccurrences();
  }, [refreshTrigger]);

  const fetchOccurrences = async () => {
    try {
      const response = await axios.get(`${API}/occurrences`);
      setOccurrences(response.data);
    } catch (error) {
      console.error('Erro ao buscar ocorrências:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'roubo': 'Roubo',
      'vandalismo': 'Vandalismo', 
      'incendio': 'Incêndio',
      'acidente': 'Acidente',
      'suspeito': 'Atividade Suspeita',
      'emergencia_medica': 'Emergência Médica',
      'outros': 'Outros'
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      'roubo': 'bg-red-100 text-red-800',
      'vandalismo': 'bg-orange-100 text-orange-800',
      'incendio': 'bg-red-100 text-red-800',
      'acidente': 'bg-yellow-100 text-yellow-800',
      'suspeito': 'bg-purple-100 text-purple-800',
      'emergencia_medica': 'bg-pink-100 text-pink-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">Carregando ocorrências...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Histórico de Ocorrências
        </CardTitle>
      </CardHeader>
      <CardContent>
        {occurrences.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhuma ocorrência registrada</p>
        ) : (
          <div className="space-y-4">
            {occurrences.map((occurrence) => (
              <div key={occurrence.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(occurrence.tipo)}>
                      {getTypeLabel(occurrence.tipo)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(occurrence.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{occurrence.local}</span>
                  </div>
                  
                  <p className="text-sm text-gray-700">{occurrence.descricao}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>Registrado por: {occurrence.usuario_nome}</span>
                  </div>

                  {occurrence.fotos && occurrence.fotos.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Camera className="w-3 h-3" />
                      <span>{occurrence.fotos.length} foto(s) anexada(s)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Start Round
const StartRound = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    locais_visitados: [''],
    observacoes: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addLocal = () => {
    setFormData({
      ...formData,
      locais_visitados: [...formData.locais_visitados, '']
    });
  };

  const removeLocal = (index) => {
    const newLocais = formData.locais_visitados.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      locais_visitados: newLocais.length > 0 ? newLocais : ['']
    });
  };

  const updateLocal = (index, value) => {
    const newLocais = [...formData.locais_visitados];
    newLocais[index] = value;
    setFormData({
      ...formData,
      locais_visitados: newLocais
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const locaisValidos = formData.locais_visitados.filter(local => local.trim() !== '');
      
      await axios.post(`${API}/rounds`, {
        locais_visitados: locaisValidos,
        observacoes: formData.observacoes
      });

      toast({
        title: "Ronda iniciada com sucesso!",
        description: "Sua ronda foi registrada no sistema.",
      });

      setFormData({ locais_visitados: [''], observacoes: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao iniciar ronda",
        description: error.response?.data?.detail || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="w-5 h-5" />
          Iniciar Nova Ronda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Locais a Visitar</Label>
            {formData.locais_visitados.map((local, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={local}
                  onChange={(e) => updateLocal(index, e.target.value)}
                  placeholder={`Local ${index + 1}`}
                  required={index === 0}
                />
                {formData.locais_visitados.length > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeLocal(index)}
                  >
                    Remover
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addLocal} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Local
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Observações sobre a ronda..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Ronda'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Main Dashboard
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getRoleLabel = (role) => {
    const roles = {
      'vigilante': 'Vigilante',
      'supervisor': 'Supervisor',
      'administrador': 'Administrador'
    };
    return roles[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'vigilante': 'bg-green-100 text-green-800',
      'supervisor': 'bg-blue-100 text-blue-800',
      'administrador': 'bg-purple-100 text-purple-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Sistema de Segurança</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.nome}</p>
                <Badge className={getRoleBadgeColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="occurrences" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Ocorrências
            </TabsTrigger>
            <TabsTrigger value="rounds" className="flex items-center gap-2">
              <Route className="w-4 h-4" />
              Rondas
            </TabsTrigger>
            {user.role === 'administrador' && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Usuários
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CreateOccurrence onSuccess={handleSuccess} />
              <StartRound onSuccess={handleSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="occurrences" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <CreateOccurrence onSuccess={handleSuccess} />
              </div>
              <div className="lg:col-span-2">
                <OccurrencesList refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rounds" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <StartRound onSuccess={handleSuccess} />
              </div>
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Rondas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-gray-500 py-8">
                      Funcionalidade em desenvolvimento
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {user.role === 'administrador' && (
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciamento de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 py-8">
                    Funcionalidade em desenvolvimento
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

// Main App
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-600">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={user ? <Dashboard /> : <LoginPage />} 
          />
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;