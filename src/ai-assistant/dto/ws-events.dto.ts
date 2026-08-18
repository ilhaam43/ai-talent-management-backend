export interface ClientMessageEvent {
  action: 'send_message' | 'get_history' | 'list_sessions' | 'new_session';
  message?: string;
  sessionKey?: string;
}

export interface ServerEvent {
  type: 'chunk' | 'agent' | 'tool' | 'error' | 'quota_warning' | 'quota_exceeded' | 'connected' | 'sessions_list' | 'chat_history';
  payload?: any;
  chunk?: string;
  sessionKey?: string;
  error?: string;
}
