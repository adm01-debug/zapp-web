import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  pt: {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.inbox': 'Caixa de Entrada',
      'nav.contacts': 'Contatos',
      'nav.queues': 'Filas',
      'nav.agents': 'Agentes',
      'nav.settings': 'Configurações',
      'nav.reports': 'Relatórios',
      'nav.security': 'Segurança',
      
      // Common actions
      'actions.save': 'Salvar',
      'actions.cancel': 'Cancelar',
      'actions.delete': 'Excluir',
      'actions.edit': 'Editar',
      'actions.create': 'Criar',
      'actions.search': 'Buscar',
      'actions.filter': 'Filtrar',
      'actions.export': 'Exportar',
      'actions.import': 'Importar',
      'actions.refresh': 'Atualizar',
      'actions.close': 'Fechar',
      'actions.confirm': 'Confirmar',
      'actions.back': 'Voltar',
      'actions.next': 'Próximo',
      'actions.previous': 'Anterior',
      'actions.send': 'Enviar',
      'actions.reply': 'Responder',
      'actions.forward': 'Encaminhar',
      'actions.archive': 'Arquivar',
      'actions.transfer': 'Transferir',
      
      // Status
      'status.online': 'Online',
      'status.offline': 'Offline',
      'status.away': 'Ausente',
      'status.busy': 'Ocupado',
      'status.pending': 'Pendente',
      'status.resolved': 'Resolvido',
      'status.active': 'Ativo',
      'status.inactive': 'Inativo',
      
      // Dashboard
      'dashboard.title': 'Dashboard',
      'dashboard.totalMessages': 'Total de Mensagens',
      'dashboard.activeConversations': 'Conversas Ativas',
      'dashboard.resolvedToday': 'Resolvidas Hoje',
      'dashboard.avgResponseTime': 'Tempo Médio de Resposta',
      'dashboard.satisfaction': 'Satisfação',
      'dashboard.performance': 'Desempenho',
      
      // Inbox
      'inbox.title': 'Caixa de Entrada',
      'inbox.noMessages': 'Nenhuma mensagem',
      'inbox.newMessage': 'Nova mensagem',
      'inbox.typeMessage': 'Digite sua mensagem...',
      'inbox.unread': 'Não lidas',
      'inbox.all': 'Todas',
      'inbox.assigned': 'Atribuídas',
      'inbox.unassigned': 'Não Atribuídas',
      
      // Contacts
      'contacts.title': 'Contatos',
      'contacts.addContact': 'Adicionar Contato',
      'contacts.name': 'Nome',
      'contacts.phone': 'Telefone',
      'contacts.email': 'Email',
      'contacts.company': 'Empresa',
      'contacts.tags': 'Tags',
      'contacts.notes': 'Notas',
      
      // Settings
      'settings.title': 'Configurações',
      'settings.general': 'Geral',
      'settings.notifications': 'Notificações',
      'settings.appearance': 'Aparência',
      'settings.language': 'Idioma',
      'settings.theme': 'Tema',
      'settings.sounds': 'Sons',
      
      // Auth
      'auth.login': 'Entrar',
      'auth.logout': 'Sair',
      'auth.register': 'Cadastrar',
      'auth.email': 'Email',
      'auth.password': 'Senha',
      'auth.forgotPassword': 'Esqueceu a senha?',
      'auth.rememberMe': 'Lembrar-me',
      
      // Errors
      'errors.generic': 'Ocorreu um erro',
      'errors.notFound': 'Não encontrado',
      'errors.unauthorized': 'Não autorizado',
      'errors.serverError': 'Erro no servidor',
      'errors.networkError': 'Erro de conexão',
      
      // Success
      'success.saved': 'Salvo com sucesso',
      'success.deleted': 'Excluído com sucesso',
      'success.created': 'Criado com sucesso',
      'success.updated': 'Atualizado com sucesso',
      
      // Time
      'time.now': 'Agora',
      'time.today': 'Hoje',
      'time.yesterday': 'Ontem',
      'time.thisWeek': 'Esta semana',
      'time.thisMonth': 'Este mês',
      'time.minutes': 'minutos',
      'time.hours': 'horas',
      'time.days': 'dias',
      
      // Gamification
      'gamification.level': 'Nível',
      'gamification.xp': 'XP',
      'gamification.achievements': 'Conquistas',
      'gamification.streak': 'Sequência',
      'gamification.leaderboard': 'Ranking',

      // Campaigns
      'campaigns.title': 'Campanhas',
      'campaigns.create': 'Nova Campanha',
      'campaigns.name': 'Nome da Campanha',
      'campaigns.status': 'Status',
      'campaigns.draft': 'Rascunho',
      'campaigns.scheduled': 'Agendada',
      'campaigns.sending': 'Enviando',
      'campaigns.completed': 'Concluída',
      'campaigns.cancelled': 'Cancelada',
      'campaigns.paused': 'Pausada',
      'campaigns.contacts': 'Contatos',
      'campaigns.message': 'Mensagem',
      'campaigns.schedule': 'Agendar',
      'campaigns.progress': 'Progresso',
      'campaigns.sent': 'Enviadas',
      'campaigns.failed': 'Falharam',
      'campaigns.confirmDelete': 'Tem certeza que deseja excluir esta campanha?',
      'campaigns.noData': 'Nenhuma campanha encontrada',

      // Connections
      'connections.title': 'Conexões',
      'connections.add': 'Nova Conexão',
      'connections.connected': 'Conectado',
      'connections.disconnected': 'Desconectado',
      'connections.connecting': 'Conectando',
      'connections.qrCode': 'QR Code',
      'connections.scanQR': 'Escaneie o QR Code com seu WhatsApp',
      'connections.phone': 'Número do Telefone',
      'connections.name': 'Nome da Conexão',

      // Queues
      'queues.title': 'Filas',
      'queues.create': 'Nova Fila',
      'queues.name': 'Nome da Fila',
      'queues.agents': 'Agentes',
      'queues.conversations': 'Conversas',
      'queues.waiting': 'Aguardando',
      'queues.sla': 'SLA',

      // Reports
      'reports.title': 'Relatórios',
      'reports.export': 'Exportar Relatório',
      'reports.period': 'Período',
      'reports.today': 'Hoje',
      'reports.week': 'Esta Semana',
      'reports.month': 'Este Mês',
      'reports.custom': 'Personalizado',

      // Chatbot
      'chatbot.title': 'Chatbot',
      'chatbot.flows': 'Fluxos',
      'chatbot.createFlow': 'Novo Fluxo',
      'chatbot.active': 'Ativo',
      'chatbot.inactive': 'Inativo',
      'chatbot.triggers': 'Gatilhos',
      'chatbot.responses': 'Respostas',

      // Common UI
      'ui.loading': 'Carregando...',
      'ui.noResults': 'Nenhum resultado encontrado',
      'ui.required': 'Obrigatório',
      'ui.optional': 'Opcional',
      'ui.selectAll': 'Selecionar Todos',
      'ui.deselectAll': 'Desmarcar Todos',
      'ui.showing': 'Mostrando',
      'ui.of': 'de',
      'ui.items': 'itens',
      'ui.page': 'Página',
      'ui.rowsPerPage': 'Linhas por página',
      'ui.noData': 'Nenhum dado disponível',
      'ui.confirmAction': 'Tem certeza?',
      'ui.yes': 'Sim',
      'ui.no': 'Não',
      'ui.total': 'Total',
      'ui.average': 'Média',
      'ui.min': 'Mín',
      'ui.max': 'Máx',

      // Validation
      'validation.required': 'Este campo é obrigatório',
      'validation.email': 'Email inválido',
      'validation.phone': 'Telefone inválido',
      'validation.minLength': 'Mínimo de {{min}} caracteres',
      'validation.maxLength': 'Máximo de {{max}} caracteres',
      'validation.passwordMismatch': 'As senhas não coincidem',

      // Notifications
      'notifications.title': 'Notificações',
      'notifications.markAllRead': 'Marcar todas como lidas',
      'notifications.noNew': 'Nenhuma notificação nova',
      'notifications.newMessage': 'Nova mensagem de {{name}}',
      'notifications.newContact': 'Novo contato: {{name}}',

      // Security
      'security.mfa.title': 'Autenticação em Dois Fatores',
      'security.mfa.enable': 'Ativar 2FA',
      'security.mfa.disable': 'Desativar 2FA',
      'security.mfa.scanQR': 'Escaneie o QR Code com seu aplicativo autenticador',
      'security.mfa.enterCode': 'Digite o código de verificação',
      'security.sessions': 'Sessões Ativas',
      'security.changePassword': 'Alterar Senha',

      // SLA
      'sla.title': 'SLA',
      'sla.history': 'Histórico de SLA',
      'sla.target': 'Meta',
      'sla.actual': 'Real',
      'sla.compliance': 'Conformidade',
      'sla.breach': 'Violação',
    },
  },
  en: {
    translation: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.inbox': 'Inbox',
      'nav.contacts': 'Contacts',
      'nav.queues': 'Queues',
      'nav.agents': 'Agents',
      'nav.settings': 'Settings',
      'nav.reports': 'Reports',
      'nav.security': 'Security',
      
      // Common actions
      'actions.save': 'Save',
      'actions.cancel': 'Cancel',
      'actions.delete': 'Delete',
      'actions.edit': 'Edit',
      'actions.create': 'Create',
      'actions.search': 'Search',
      'actions.filter': 'Filter',
      'actions.export': 'Export',
      'actions.import': 'Import',
      'actions.refresh': 'Refresh',
      'actions.close': 'Close',
      'actions.confirm': 'Confirm',
      'actions.back': 'Back',
      'actions.next': 'Next',
      'actions.previous': 'Previous',
      'actions.send': 'Send',
      'actions.reply': 'Reply',
      'actions.forward': 'Forward',
      'actions.archive': 'Archive',
      'actions.transfer': 'Transfer',
      
      // Status
      'status.online': 'Online',
      'status.offline': 'Offline',
      'status.away': 'Away',
      'status.busy': 'Busy',
      'status.pending': 'Pending',
      'status.resolved': 'Resolved',
      'status.active': 'Active',
      'status.inactive': 'Inactive',
      
      // Dashboard
      'dashboard.title': 'Dashboard',
      'dashboard.totalMessages': 'Total Messages',
      'dashboard.activeConversations': 'Active Conversations',
      'dashboard.resolvedToday': 'Resolved Today',
      'dashboard.avgResponseTime': 'Avg Response Time',
      'dashboard.satisfaction': 'Satisfaction',
      'dashboard.performance': 'Performance',
      
      // Inbox
      'inbox.title': 'Inbox',
      'inbox.noMessages': 'No messages',
      'inbox.newMessage': 'New message',
      'inbox.typeMessage': 'Type your message...',
      'inbox.unread': 'Unread',
      'inbox.all': 'All',
      'inbox.assigned': 'Assigned',
      'inbox.unassigned': 'Unassigned',
      
      // Contacts
      'contacts.title': 'Contacts',
      'contacts.addContact': 'Add Contact',
      'contacts.name': 'Name',
      'contacts.phone': 'Phone',
      'contacts.email': 'Email',
      'contacts.company': 'Company',
      'contacts.tags': 'Tags',
      'contacts.notes': 'Notes',
      
      // Settings
      'settings.title': 'Settings',
      'settings.general': 'General',
      'settings.notifications': 'Notifications',
      'settings.appearance': 'Appearance',
      'settings.language': 'Language',
      'settings.theme': 'Theme',
      'settings.sounds': 'Sounds',
      
      // Auth
      'auth.login': 'Login',
      'auth.logout': 'Logout',
      'auth.register': 'Register',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.forgotPassword': 'Forgot password?',
      'auth.rememberMe': 'Remember me',
      
      // Errors
      'errors.generic': 'An error occurred',
      'errors.notFound': 'Not found',
      'errors.unauthorized': 'Unauthorized',
      'errors.serverError': 'Server error',
      'errors.networkError': 'Network error',
      
      // Success
      'success.saved': 'Saved successfully',
      'success.deleted': 'Deleted successfully',
      'success.created': 'Created successfully',
      'success.updated': 'Updated successfully',
      
      // Time
      'time.now': 'Now',
      'time.today': 'Today',
      'time.yesterday': 'Yesterday',
      'time.thisWeek': 'This week',
      'time.thisMonth': 'This month',
      'time.minutes': 'minutes',
      'time.hours': 'hours',
      'time.days': 'days',
      
      // Gamification
      'gamification.level': 'Level',
      'gamification.xp': 'XP',
      'gamification.achievements': 'Achievements',
      'gamification.streak': 'Streak',
      'gamification.leaderboard': 'Leaderboard',

      // Campaigns
      'campaigns.title': 'Campaigns',
      'campaigns.create': 'New Campaign',
      'campaigns.name': 'Campaign Name',
      'campaigns.status': 'Status',
      'campaigns.draft': 'Draft',
      'campaigns.scheduled': 'Scheduled',
      'campaigns.sending': 'Sending',
      'campaigns.completed': 'Completed',
      'campaigns.cancelled': 'Cancelled',
      'campaigns.paused': 'Paused',
      'campaigns.contacts': 'Contacts',
      'campaigns.message': 'Message',
      'campaigns.schedule': 'Schedule',
      'campaigns.progress': 'Progress',
      'campaigns.sent': 'Sent',
      'campaigns.failed': 'Failed',
      'campaigns.confirmDelete': 'Are you sure you want to delete this campaign?',
      'campaigns.noData': 'No campaigns found',

      // Connections
      'connections.title': 'Connections',
      'connections.add': 'New Connection',
      'connections.connected': 'Connected',
      'connections.disconnected': 'Disconnected',
      'connections.connecting': 'Connecting',
      'connections.qrCode': 'QR Code',
      'connections.scanQR': 'Scan QR Code with WhatsApp',
      'connections.phone': 'Phone Number',
      'connections.name': 'Connection Name',

      // Queues
      'queues.title': 'Queues',
      'queues.create': 'New Queue',
      'queues.name': 'Queue Name',
      'queues.agents': 'Agents',
      'queues.conversations': 'Conversations',
      'queues.waiting': 'Waiting',
      'queues.sla': 'SLA',

      // Reports
      'reports.title': 'Reports',
      'reports.export': 'Export Report',
      'reports.period': 'Period',
      'reports.today': 'Today',
      'reports.week': 'This Week',
      'reports.month': 'This Month',
      'reports.custom': 'Custom',

      // Chatbot
      'chatbot.title': 'Chatbot',
      'chatbot.flows': 'Flows',
      'chatbot.createFlow': 'New Flow',
      'chatbot.active': 'Active',
      'chatbot.inactive': 'Inactive',
      'chatbot.triggers': 'Triggers',
      'chatbot.responses': 'Responses',

      // Common UI
      'ui.loading': 'Loading...',
      'ui.noResults': 'No results found',
      'ui.required': 'Required',
      'ui.optional': 'Optional',
      'ui.selectAll': 'Select All',
      'ui.deselectAll': 'Deselect All',
      'ui.showing': 'Showing',
      'ui.of': 'of',
      'ui.items': 'items',
      'ui.page': 'Page',
      'ui.rowsPerPage': 'Rows per page',
      'ui.noData': 'No data available',
      'ui.confirmAction': 'Are you sure?',
      'ui.yes': 'Yes',
      'ui.no': 'No',
      'ui.total': 'Total',
      'ui.average': 'Average',
      'ui.min': 'Min',
      'ui.max': 'Max',

      // Validation
      'validation.required': 'This field is required',
      'validation.email': 'Invalid email',
      'validation.phone': 'Invalid phone number',
      'validation.minLength': 'Minimum {{min}} characters',
      'validation.maxLength': 'Maximum {{max}} characters',
      'validation.passwordMismatch': 'Passwords do not match',

      // Notifications
      'notifications.title': 'Notifications',
      'notifications.markAllRead': 'Mark all as read',
      'notifications.noNew': 'No new notifications',
      'notifications.newMessage': 'New message from {{name}}',
      'notifications.newContact': 'New contact: {{name}}',

      // Security
      'security.mfa.title': 'Two-Factor Authentication',
      'security.mfa.enable': 'Enable 2FA',
      'security.mfa.disable': 'Disable 2FA',
      'security.mfa.scanQR': 'Scan QR Code with your authenticator app',
      'security.mfa.enterCode': 'Enter verification code',
      'security.sessions': 'Active Sessions',
      'security.changePassword': 'Change Password',

      // SLA
      'sla.title': 'SLA',
      'sla.history': 'SLA History',
      'sla.target': 'Target',
      'sla.actual': 'Actual',
      'sla.compliance': 'Compliance',
      'sla.breach': 'Breach',
    },
  },
  es: {
    translation: {
      // Navigation
      'nav.dashboard': 'Panel',
      'nav.inbox': 'Bandeja de Entrada',
      'nav.contacts': 'Contactos',
      'nav.queues': 'Colas',
      'nav.agents': 'Agentes',
      'nav.settings': 'Configuración',
      'nav.reports': 'Informes',
      'nav.security': 'Seguridad',
      
      // Common actions
      'actions.save': 'Guardar',
      'actions.cancel': 'Cancelar',
      'actions.delete': 'Eliminar',
      'actions.edit': 'Editar',
      'actions.create': 'Crear',
      'actions.search': 'Buscar',
      'actions.filter': 'Filtrar',
      'actions.export': 'Exportar',
      'actions.import': 'Importar',
      'actions.refresh': 'Actualizar',
      'actions.close': 'Cerrar',
      'actions.confirm': 'Confirmar',
      'actions.back': 'Volver',
      'actions.next': 'Siguiente',
      'actions.previous': 'Anterior',
      'actions.send': 'Enviar',
      'actions.reply': 'Responder',
      'actions.forward': 'Reenviar',
      'actions.archive': 'Archivar',
      'actions.transfer': 'Transferir',
      
      // Status
      'status.online': 'En línea',
      'status.offline': 'Desconectado',
      'status.away': 'Ausente',
      'status.busy': 'Ocupado',
      'status.pending': 'Pendiente',
      'status.resolved': 'Resuelto',
      'status.active': 'Activo',
      'status.inactive': 'Inactivo',

      // Dashboard
      'dashboard.title': 'Panel',
      'dashboard.totalMessages': 'Total de Mensajes',
      'dashboard.activeConversations': 'Conversaciones Activas',
      'dashboard.resolvedToday': 'Resueltas Hoy',
      'dashboard.avgResponseTime': 'Tiempo Promedio de Respuesta',
      'dashboard.satisfaction': 'Satisfacción',
      'dashboard.performance': 'Rendimiento',

      // Inbox
      'inbox.title': 'Bandeja de Entrada',
      'inbox.noMessages': 'Sin mensajes',
      'inbox.newMessage': 'Nuevo mensaje',
      'inbox.typeMessage': 'Escribe tu mensaje...',
      'inbox.unread': 'No leídos',
      'inbox.all': 'Todos',
      'inbox.assigned': 'Asignados',
      'inbox.unassigned': 'Sin Asignar',

      // Contacts
      'contacts.title': 'Contactos',
      'contacts.addContact': 'Agregar Contacto',
      'contacts.name': 'Nombre',
      'contacts.phone': 'Teléfono',
      'contacts.email': 'Correo',
      'contacts.company': 'Empresa',
      'contacts.tags': 'Etiquetas',
      'contacts.notes': 'Notas',

      // Settings
      'settings.title': 'Configuración',
      'settings.general': 'General',
      'settings.notifications': 'Notificaciones',
      'settings.appearance': 'Apariencia',
      'settings.language': 'Idioma',
      'settings.theme': 'Tema',
      'settings.sounds': 'Sonidos',

      // Auth
      'auth.login': 'Iniciar sesión',
      'auth.logout': 'Cerrar sesión',
      'auth.register': 'Registrarse',
      'auth.email': 'Correo',
      'auth.password': 'Contraseña',
      'auth.forgotPassword': '¿Olvidaste tu contraseña?',
      'auth.rememberMe': 'Recordarme',

      // Errors
      'errors.generic': 'Ocurrió un error',
      'errors.notFound': 'No encontrado',
      'errors.unauthorized': 'No autorizado',
      'errors.serverError': 'Error del servidor',
      'errors.networkError': 'Error de conexión',

      // Success
      'success.saved': 'Guardado con éxito',
      'success.deleted': 'Eliminado con éxito',
      'success.created': 'Creado con éxito',
      'success.updated': 'Actualizado con éxito',

      // Time
      'time.now': 'Ahora',
      'time.today': 'Hoy',
      'time.yesterday': 'Ayer',
      'time.thisWeek': 'Esta semana',
      'time.thisMonth': 'Este mes',
      'time.minutes': 'minutos',
      'time.hours': 'horas',
      'time.days': 'días',

      // Gamification
      'gamification.level': 'Nivel',
      'gamification.xp': 'XP',
      'gamification.achievements': 'Logros',
      'gamification.streak': 'Racha',
      'gamification.leaderboard': 'Clasificación',

      // Campaigns
      'campaigns.title': 'Campañas',
      'campaigns.create': 'Nueva Campaña',
      'campaigns.name': 'Nombre de la Campaña',
      'campaigns.status': 'Estado',
      'campaigns.draft': 'Borrador',
      'campaigns.scheduled': 'Programada',
      'campaigns.sending': 'Enviando',
      'campaigns.completed': 'Completada',
      'campaigns.cancelled': 'Cancelada',
      'campaigns.paused': 'Pausada',
      'campaigns.contacts': 'Contactos',
      'campaigns.message': 'Mensaje',
      'campaigns.schedule': 'Programar',
      'campaigns.progress': 'Progreso',
      'campaigns.sent': 'Enviadas',
      'campaigns.failed': 'Fallidas',
      'campaigns.confirmDelete': '¿Estás seguro de que deseas eliminar esta campaña?',
      'campaigns.noData': 'No se encontraron campañas',

      // Connections
      'connections.title': 'Conexiones',
      'connections.add': 'Nueva Conexión',
      'connections.connected': 'Conectado',
      'connections.disconnected': 'Desconectado',
      'connections.connecting': 'Conectando',
      'connections.qrCode': 'Código QR',
      'connections.scanQR': 'Escanea el código QR con WhatsApp',
      'connections.phone': 'Número de Teléfono',
      'connections.name': 'Nombre de la Conexión',

      // Queues
      'queues.title': 'Colas',
      'queues.create': 'Nueva Cola',
      'queues.name': 'Nombre de la Cola',
      'queues.agents': 'Agentes',
      'queues.conversations': 'Conversaciones',
      'queues.waiting': 'En espera',
      'queues.sla': 'SLA',

      // Reports
      'reports.title': 'Informes',
      'reports.export': 'Exportar Informe',
      'reports.period': 'Período',
      'reports.today': 'Hoy',
      'reports.week': 'Esta Semana',
      'reports.month': 'Este Mes',
      'reports.custom': 'Personalizado',

      // Chatbot
      'chatbot.title': 'Chatbot',
      'chatbot.flows': 'Flujos',
      'chatbot.createFlow': 'Nuevo Flujo',
      'chatbot.active': 'Activo',
      'chatbot.inactive': 'Inactivo',
      'chatbot.triggers': 'Disparadores',
      'chatbot.responses': 'Respuestas',

      // Common UI
      'ui.loading': 'Cargando...',
      'ui.noResults': 'No se encontraron resultados',
      'ui.required': 'Obligatorio',
      'ui.optional': 'Opcional',
      'ui.selectAll': 'Seleccionar Todos',
      'ui.deselectAll': 'Desmarcar Todos',
      'ui.showing': 'Mostrando',
      'ui.of': 'de',
      'ui.items': 'elementos',
      'ui.page': 'Página',
      'ui.rowsPerPage': 'Filas por página',
      'ui.noData': 'Sin datos disponibles',
      'ui.confirmAction': '¿Estás seguro?',
      'ui.yes': 'Sí',
      'ui.no': 'No',
      'ui.total': 'Total',
      'ui.average': 'Promedio',
      'ui.min': 'Mín',
      'ui.max': 'Máx',

      // Validation
      'validation.required': 'Este campo es obligatorio',
      'validation.email': 'Correo inválido',
      'validation.phone': 'Teléfono inválido',
      'validation.minLength': 'Mínimo de {{min}} caracteres',
      'validation.maxLength': 'Máximo de {{max}} caracteres',
      'validation.passwordMismatch': 'Las contraseñas no coinciden',

      // Notifications
      'notifications.title': 'Notificaciones',
      'notifications.markAllRead': 'Marcar todas como leídas',
      'notifications.noNew': 'Sin notificaciones nuevas',
      'notifications.newMessage': 'Nuevo mensaje de {{name}}',
      'notifications.newContact': 'Nuevo contacto: {{name}}',

      // Security
      'security.mfa.title': 'Autenticación de Dos Factores',
      'security.mfa.enable': 'Activar 2FA',
      'security.mfa.disable': 'Desactivar 2FA',
      'security.mfa.scanQR': 'Escanea el código QR con tu app autenticadora',
      'security.mfa.enterCode': 'Ingresa el código de verificación',
      'security.sessions': 'Sesiones Activas',
      'security.changePassword': 'Cambiar Contraseña',

      // SLA
      'sla.title': 'SLA',
      'sla.history': 'Historial de SLA',
      'sla.target': 'Meta',
      'sla.actual': 'Real',
      'sla.compliance': 'Cumplimiento',
      'sla.breach': 'Incumplimiento',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'pt',
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// Helper hook for language switching
export const useLanguage = () => {
  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    languages: [
      { code: 'pt', name: 'Português', flag: '🇧🇷' },
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
    ],
  };
};
