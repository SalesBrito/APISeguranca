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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';

// Icons
import { 
  Shield, UserPlus, ClipboardList, BarChart3, LogOut, User, Plus, Camera, Clock, 
  MapPin, Users, AlertTriangle, Settings, Eye, CheckCircle, XCircle, 
  Calendar, Phone, Building, Video, MapIcon, Key, Info
} from 'lucide-react';

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
            Sistema Empresarial de Gestão de Segurança
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
            <p className="text-sm text-gray-300 text-center mb-2">Credenciais de teste:</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>Admin:</strong> admin@sistema.com / sales761</p>
              <p><strong>Supervisor:</strong> supervisor@sistema.com / supervisor123</p>
              <p><strong>Vigilante:</strong> vigilante@sistema.com / vigilante123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Change Password Dialog
const ChangePasswordDialog = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/auth/change-password`, formData);
      toast({
        title: "Senha alterada com sucesso!",
        description: "Sua senha foi atualizada no sistema.",
      });
      setOpen(false);
      setFormData({ senha_atual: '', nova_senha: '', confirmar_senha: '' });
    } catch (error) {
      toast({
        title: "Erro ao alterar senha",
        description: error.response?.data?.detail || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Key className="w-4 h-4 mr-2" />
          Alterar Senha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Digite sua senha atual e escolha uma nova senha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha_atual">Senha Atual</Label>
            <Input
              id="senha_atual"
              type="password"
              value={formData.senha_atual}
              onChange={(e) => setFormData({...formData, senha_atual: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nova_senha">Nova Senha</Label>
            <Input
              id="nova_senha"
              type="password"
              value={formData.nova_senha}
              onChange={(e) => setFormData({...formData, nova_senha: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar_senha">Confirmar Nova Senha</Label>
            <Input
              id="confirmar_senha"
              type="password"
              value={formData.confirmar_senha}
              onChange={(e) => setFormData({...formData, confirmar_senha: e.target.value})}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.minhas_rondas_hoje || 0}</div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${stats.plantao_ativo ? 'from-orange-500 to-orange-600' : 'from-gray-500 to-gray-600'} text-white`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Plantão</CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.plantao_ativo ? 'Em Plantão' : 'Fora do Plantão'}</div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${stats.ronda_ativa ? 'from-purple-500 to-purple-600' : 'from-gray-500 to-gray-600'} text-white`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Ronda</CardTitle>
            <MapIcon className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats.ronda_ativa ? 'Em Ronda' : 'Sem Ronda Ativa'}</div>
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

      <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ocorrências Abertas</CardTitle>
          <XCircle className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.ocorrencias_abertas || 0}</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vigilantes em Plantão</CardTitle>
          <Users className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.vigilantes_em_plantao || 0}</div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ocorrências Críticas</CardTitle>
          <AlertTriangle className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.ocorrencias_criticas || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
};

// Active Shifts Component
const ActiveShifts = () => {
  const [shifts, setShifts] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user.role !== 'vigilante') {
      fetchActiveShifts();
    }
  }, [user.role]);

  const fetchActiveShifts = async () => {
    try {
      const response = await axios.get(`${API}/shifts/active`);
      setShifts(response.data);
    } catch (error) {
      console.error('Erro ao buscar plantões ativos:', error);
    }
  };

  if (user.role === 'vigilante') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Vigilantes em Plantão
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Nenhum vigilante em plantão no momento</p>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div>
                  <p className="font-medium text-green-800">{shift.vigilante_nome}</p>
                  <p className="text-sm text-green-600">{shift.local_responsavel}</p>
                  <p className="text-xs text-gray-500">
                    Iniciado: {new Date(shift.inicio).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">Em Plantão</Badge>
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Create User Form
const CreateUserForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: '',
    telefone: '',
    setor: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/register`, formData);
      toast({
        title: "Usuário criado com sucesso!",
        description: `${formData.nome} foi adicionado ao sistema.`,
      });
      
      setFormData({ nome: '', email: '', senha: '', role: '', telefone: '', setor: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao criar usuário",
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
          <UserPlus className="w-5 h-5" />
          Novo Usuário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@empresa.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({...formData, senha: e.target.value})}
                placeholder="Senha inicial"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select onValueChange={(value) => setFormData({...formData, role: value})} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigilante">Vigilante</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              <Input
                id="setor"
                value={formData.setor}
                onChange={(e) => setFormData({...formData, setor: e.target.value})}
                placeholder="Ex: Segurança, TI, Administração"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Start Shift
const StartShift = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    local_responsavel: '',
    observacoes: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/shifts`, formData);
      toast({
        title: "Plantão iniciado com sucesso!",
        description: `Você está agora responsável por: ${formData.local_responsavel}`,
      });

      setFormData({ local_responsavel: '', observacoes: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao iniciar plantão",
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
          <Clock className="w-5 h-5" />
          Iniciar Plantão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="local_responsavel">Local de Responsabilidade</Label>
            <Input
              id="local_responsavel"
              value={formData.local_responsavel}
              onChange={(e) => setFormData({...formData, local_responsavel: e.target.value})}
              placeholder="Ex: Portaria Principal, Setor A, Estacionamento..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Observações sobre o plantão..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Plantão'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Create Occurrence
const CreateOccurrence = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    local: '',
    tipo: '',
    prioridade: 'media',
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
    { value: 'acesso_nao_autorizado', label: 'Acesso Não Autorizado' },
    { value: 'outros', label: 'Outros' }
  ];

  const priorities = [
    { value: 'baixa', label: 'Baixa', color: 'bg-green-100 text-green-800' },
    { value: 'media', label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-800' }
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
      
      setFormData({ local: '', tipo: '', prioridade: 'media', descricao: '' });
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select onValueChange={(value) => setFormData({...formData, prioridade: value})} value={formData.prioridade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
  const { user } = useAuth();
  const { toast } = useToast();

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

  const resolveOccurrence = async (occurrenceId, observacoes) => {
    try {
      await axios.put(`${API}/occurrences/${occurrenceId}/resolve`, {
        observacoes_resolucao: observacoes
      });
      toast({
        title: "Ocorrência resolvida!",
        description: "A ocorrência foi marcada como resolvida.",
      });
      fetchOccurrences();
    } catch (error) {
      toast({
        title: "Erro ao resolver ocorrência",
        description: error.response?.data?.detail || "Erro interno do servidor",
        variant: "destructive",
      });
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
      'acesso_nao_autorizado': 'Acesso Não Autorizado',
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
      'acesso_nao_autorizado': 'bg-indigo-100 text-indigo-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'baixa': 'bg-green-100 text-green-800',
      'media': 'bg-yellow-100 text-yellow-800',
      'alta': 'bg-orange-100 text-orange-800',
      'critica': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'baixa': 'Baixa',
      'media': 'Média',
      'alta': 'Alta',
      'critica': 'Crítica'
    };
    return labels[priority] || priority;
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
              <div key={occurrence.id} className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${occurrence.resolvida ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(occurrence.tipo)}>
                      {getTypeLabel(occurrence.tipo)}
                    </Badge>
                    <Badge className={getPriorityColor(occurrence.prioridade)}>
                      {getPriorityLabel(occurrence.prioridade)}
                    </Badge>
                    {occurrence.resolvida && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolvida
                      </Badge>
                    )}
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
                  
                  {occurrence.resolvida && occurrence.observacoes_resolucao && (
                    <div className="mt-2 p-2 bg-green-100 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Resolução:</strong> {occurrence.observacoes_resolucao}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>Registrado por: {occurrence.usuario_nome}</span>
                      {occurrence.fotos && occurrence.fotos.length > 0 && (
                        <>
                          <Camera className="w-3 h-3 ml-2" />
                          <span>{occurrence.fotos.length} foto(s)</span>
                        </>
                      )}
                    </div>
                    
                    {!occurrence.resolvida && user.role !== 'vigilante' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const observacoes = prompt("Observações sobre a resolução:");
                          if (observacoes) {
                            resolveOccurrence(occurrence.id, observacoes);
                          }
                        }}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>
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
          <MapIcon className="w-5 h-5" />
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

// Locations Component
const LocationsManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/locations`);
      setLocations(response.data);
    } catch (error) {
      console.error('Erro ao buscar locais:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando locais...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Locais Monitorados & CFTV
        </CardTitle>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum local cadastrado</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((location) => (
              <div key={location.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{location.nome}</h3>
                    {location.descricao && (
                      <p className="text-sm text-gray-600">{location.descricao}</p>
                    )}
                  </div>
                  {location.camera_ip && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <Video className="w-3 h-3 mr-1" />
                      CFTV
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1 text-xs text-gray-500">
                  {location.camera_ip && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>IP: {location.camera_ip}</span>
                    </div>
                  )}
                  {location.coordenadas && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>GPS: {location.coordenadas}</span>
                    </div>
                  )}
                </div>
                
                {location.camera_url && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 w-full"
                    onClick={() => window.open(location.camera_url, '_blank')}
                  >
                    <Video className="w-3 h-3 mr-1" />
                    Acessar Câmera
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// System Info
const SystemInfo = () => {
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get(`${API}/system/info`);
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Erro ao buscar informações do sistema:', error);
    }
  };

  if (!systemInfo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Informações do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">{systemInfo.sistema}</h3>
            <p className="text-sm text-gray-600">Versão {systemInfo.versao}</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Recursos Disponíveis:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {systemInfo.recursos.map((recurso, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {recurso}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="pt-4 border-t text-xs text-gray-500">
            <p><strong>Desenvolvido por:</strong> {systemInfo.desenvolvedor}</p>
            <p><strong>Suporte:</strong> {systemInfo.contato}</p>
            <p><strong>Tecnologias:</strong> {systemInfo.tecnologias.join(', ')}</p>
          </div>
        </div>
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
              <ChangePasswordDialog />
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
          <TabsList className="grid w-full grid-cols-6 lg:w-[800px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="occurrences" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Ocorrências
            </TabsTrigger>
            <TabsTrigger value="rounds" className="flex items-center gap-2">
              <MapIcon className="w-4 h-4" />
              Rondas
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Plantões
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              CFTV
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
              <div className="space-y-6">
                <CreateOccurrence onSuccess={handleSuccess} />
                {user.role === 'vigilante' && <StartShift onSuccess={handleSuccess} />}
              </div>
              <div className="space-y-6">
                <StartRound onSuccess={handleSuccess} />
                <ActiveShifts />
                <SystemInfo />
              </div>
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
                      Visualização de rondas em desenvolvimento
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shifts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {user.role === 'vigilante' && (
                <div className="lg:col-span-1">
                  <StartShift onSuccess={handleSuccess} />
                </div>
              )}
              <div className={user.role === 'vigilante' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                <ActiveShifts />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <LocationsManagement />
          </TabsContent>

          {user.role === 'administrador' && (
            <TabsContent value="users" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CreateUserForm onSuccess={handleSuccess} />
                <Card>
                  <CardHeader>
                    <CardTitle>Usuários do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-gray-500 py-8">
                      Lista de usuários em desenvolvimento
                    </p>
                  </CardContent>
                </Card>
              </div>
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
          <p className="text-gray-600">Carregando sistema de segurança...</p>
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