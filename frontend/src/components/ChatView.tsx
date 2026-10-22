import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import type { ChatSession, ChatMessage } from '../../../shared/types';
import { MessageSquare, Send, Plus, Bot, User, Sparkles, Edit2, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '../App';
import { PageHeader } from './ui';

const SUGGESTED_PROMPTS = [
  { emoji: '🎓', text: 'Which schemes am I eligible for?' },
  { emoji: '📄', text: 'What documents do I need for state scholarships?' },
  { emoji: '💰', text: 'Explain the Post Matric Scholarship benefits.' },
  { emoji: '🗓️', text: 'Which scholarship has the closest deadline?' },
  { emoji: '📋', text: 'What is a Domicile Certificate and how do I get one?' },
];

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} style={{ fontWeight: 700, margin: '6px 0 3px', fontSize: '0.9rem' }}>{line.slice(4)}</h4>;
        if (line.startsWith('## '))  return <h3 key={i} style={{ fontWeight: 700, margin: '8px 0 4px' }}>{line.slice(3)}</h3>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ fontWeight: 700, marginBottom: 3 }}>{line.slice(2, -2)}</p>;
        if (line.startsWith('* ') || line.startsWith('- ')) return <p key={i} style={{ marginBottom: 2, paddingLeft: 10 }}>• {line.slice(2)}</p>;
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
        // Inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} style={{ marginBottom: 3, lineHeight: 1.55 }}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export const ChatView: React.FC = () => {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);

  // Rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete state
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { 
    if (activeId) {
      loadMessages(activeId); 
    } else {
      setMessages([]);
    }
  }, [activeId]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const loadSessions = async () => {
    try {
      const res = await api.getChatSessions();
      if (res.success && res.data) {
        setSessions(res.data);
        if (res.data.length > 0 && !activeId) {
          setActiveId(res.data[0].id);
        } else if (res.data.length === 0) {
          createSession();
        }
      } else {
        showToast(res.error?.message ?? 'Could not load your conversations', 'error');
      }
    } catch {
      showToast('Could not load your conversations', 'error');
    }
  };

  const loadMessages = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.getChatMessages(id);
      if (res.success && res.data) setMessages(res.data);
    } finally { setLoading(false); }
  };

  const createSession = async () => {
    try {
      const title = `Conversation ${sessions.length + 1}`;
      const res = await api.createChatSession(title);
      if (res.success && res.data) {
        const newSession = res.data as ChatSession;
        setSessions((prev) => [newSession, ...prev]);
        setActiveId(newSession.id);
        setMessages([]);
      }
    } catch {
      showToast('Failed to create new conversation', 'error');
    }
  };

  const startRename = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditTitle(s.title);
  };

  const cancelRename = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  const saveRename = async (sessionId: string) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      showToast('Conversation title cannot be empty', 'error');
      return;
    }
    setRenaming(true);
    try {
      const res = await api.renameChatSession(sessionId, trimmed);
      if (res.success && res.data) {
        const updated = res.data as ChatSession;
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s)));
        setEditingSessionId(null);
        setEditTitle('');
        showToast('Conversation renamed', 'success');
      } else {
        showToast(res.error?.message ?? 'Failed to rename conversation', 'error');
      }
    } catch (err: any) {
      showToast(err.message ?? 'Error renaming conversation', 'error');
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(s);
  };

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    const targetId = sessionToDelete.id;
    try {
      const res = await api.deleteChatSession(targetId);
      if (res.success) {
        const remaining = sessions.filter((s) => s.id !== targetId);
        setSessions(remaining);
        showToast('Conversation deleted', 'success');
        if (activeId === targetId) {
          if (remaining.length > 0) {
            setActiveId(remaining[0].id);
          } else {
            setActiveId(null);
            setMessages([]);
          }
        }
        setSessionToDelete(null);
      } else {
        showToast(res.error?.message ?? 'Failed to delete conversation', 'error');
      }
    } catch (err: any) {
      showToast(err.message ?? 'Error deleting conversation', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !activeId || sending) return;
    setInput('');
    setSending(true);

    const temp: ChatMessage = {
      id: `tmp-${Date.now()}`,
      sessionId: activeId,
      role: 'USER',
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);

    const res = await api.sendChatMessage(activeId, msg);
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data as ChatMessage]);
    } else {
      // Remove the optimistic message, restore the draft, and say what happened
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setInput(msg);
      showToast(res.error?.message ?? 'Your message could not be sent. Please try again.', 'error');
    }
    setSending(false);
  };

  return (
    <div>
      <PageHeader kicker="Assistant" title="AI advisor" subtitle="Ask about eligibility, documents, deadlines and how to apply." />

      <div className="chat-layout">
        {/* ── Session sidebar ── */}
        <div className="chat-sidebar">
          <button className="btn btn-primary btn-sm btn-full" onClick={createSession}>
            <Plus size={15} /> New Conversation
          </button>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 6 }}>
            Conversations ({sessions.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`chat-session-row ${activeId === s.id ? 'active' : ''}`}
              >
                {editingSessionId === s.id ? (
                  <div className="chat-rename-box">
                    <input
                      className="chat-rename-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(s.id);
                        if (e.key === 'Escape') cancelRename();
                      }}
                      autoFocus
                      disabled={renaming}
                      placeholder="Title…"
                    />
                    <button
                      className="chat-action-btn"
                      onClick={() => saveRename(s.id)}
                      disabled={renaming || !editTitle.trim()}
                      title="Save"
                    >
                      {renaming ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Check size={13} color="var(--blue)" />}
                    </button>
                    <button
                      className="chat-action-btn"
                      onClick={cancelRename}
                      disabled={renaming}
                      title="Cancel"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="chat-session-btn"
                      onClick={() => setActiveId(s.id)}
                      title={s.title}
                    >
                      <MessageSquare size={13} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                    </button>
                    <div className="chat-session-actions">
                      <button
                        className="chat-action-btn"
                        onClick={(e) => startRename(s, e)}
                        title="Rename conversation"
                        aria-label="Rename conversation"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="chat-action-btn delete"
                        onClick={(e) => confirmDelete(s, e)}
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Chat main ── */}
        <div className="chat-main">
          {/* Header */}
          <div className="chat-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <button
                className="btn btn-secondary btn-sm chat-mobile-toggle-btn"
                onClick={() => setMobileSidebarOpen(true)}
                title="View conversations"
                aria-label="View conversations"
              >
                <MessageSquare size={13} />
                <span>Chats ({sessions.length})</span>
              </button>

              <div className="chat-topbar-title">
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={15} color="var(--blue)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>GovAI Advisor</span>
                  {activeId && (
                    <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      • {sessions.find((s) => s.id === activeId)?.title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {activeId && sessions.find((s) => s.id === activeId) && (
                <>
                  <button
                    className="chat-action-btn"
                    onClick={(e) => {
                      const s = sessions.find((item) => item.id === activeId);
                      if (s) startRename(s, e);
                    }}
                    title="Rename conversation"
                    aria-label="Rename conversation"
                    style={{ padding: '6px 8px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)' }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="chat-action-btn delete"
                    onClick={(e) => {
                      const s = sessions.find((item) => item.id === activeId);
                      if (s) confirmDelete(s, e);
                    }}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                    style={{ padding: '6px 8px', borderRadius: 'var(--r-sm)', background: '#fce8e6' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner spinner-blue" />
              </div>
            ) : !activeId ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">
                  <MessageSquare size={24} color="var(--blue)" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-1)', marginBottom: 6 }}>
                  No Active Conversation
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.55, marginBottom: 16 }}>
                  Select an existing conversation from the left or start a new one to ask about scholarships and schemes.
                </p>
                <button className="btn btn-primary btn-sm" onClick={createSession}>
                  <Plus size={15} /> Start New Conversation
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">
                  <Sparkles size={24} color="var(--blue)" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-1)', marginBottom: 6 }}>
                  Ask GovAI Advisor
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.55 }}>
                  Get answers about scheme eligibility, required documents, deadlines, and application steps.
                </p>
                <div className="chat-suggestions">
                  {SUGGESTED_PROMPTS.map(({ emoji, text }) => (
                    <button key={text} className="chat-suggestion-btn" onClick={() => send(text)}>
                      {emoji} {text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`chat-msg chat-msg-${m.role === 'USER' ? 'user' : 'assistant'}`}>
                  <div className="chat-msg-role">
                    {m.role === 'USER' ? <User size={11} /> : <Bot size={11} />}
                    {m.role === 'USER' ? 'You' : 'GovAI Advisor'}
                  </div>
                  <div className="chat-bubble">
                    {m.role === 'ASSISTANT' || (m.role as string) === 'assistant'
                      ? <SimpleMarkdown text={m.content} />
                      : m.content
                    }
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="chat-msg chat-msg-assistant">
                <div className="chat-msg-role"><Bot size={11} />GovAI Advisor</div>
                <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner spinner-blue" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <textarea
              className="chat-input"
              rows={1}
              placeholder={activeId ? "Ask about eligibility, documents, or deadlines…" : "Select or create a conversation first"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={sending || !activeId}
              aria-label="Chat message"
            />
            <button
              className="btn btn-primary btn-icon"
              onClick={() => send()}
              disabled={sending || !input.trim() || !activeId}
              aria-label="Send message"
            >
              {sending ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Send size={17} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {sessionToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setSessionToDelete(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fce8e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                  <AlertTriangle size={18} />
                </div>
                <div className="modal-title">Delete Conversation</div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => !deleting && setSessionToDelete(null)}
                disabled={deleting}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-1)' }}>"{sessionToDelete.title}"</strong>?
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 8 }}>
                This will permanently delete the conversation and all its messages. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSessionToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {deleting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Trash2 size={14} />}
                Delete Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Conversations Drawer ── */}
      {mobileSidebarOpen && (
        <div className="modal-overlay" onClick={() => setMobileSidebarOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, maxHeight: '85vh' }}>
            <div className="modal-header">
              <div className="modal-title">Conversations ({sessions.length})</div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px' }}>
              <button
                className="btn btn-primary btn-sm btn-full"
                onClick={() => {
                  createSession();
                  setMobileSidebarOpen(false);
                }}
              >
                <Plus size={15} /> New Conversation
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '55vh', overflowY: 'auto' }}>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`chat-session-row ${activeId === s.id ? 'active' : ''}`}
                    style={{ padding: '2px 4px' }}
                  >
                    <button
                      className="chat-session-btn"
                      onClick={() => {
                        setActiveId(s.id);
                        setMobileSidebarOpen(false);
                      }}
                      title={s.title}
                    >
                      <MessageSquare size={13} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                    </button>
                    <div className="chat-session-actions" style={{ opacity: 1 }}>
                      <button
                        className="chat-action-btn"
                        onClick={(e) => {
                          startRename(s, e);
                          setMobileSidebarOpen(false);
                        }}
                        title="Rename conversation"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="chat-action-btn delete"
                        onClick={(e) => {
                          confirmDelete(s, e);
                          setMobileSidebarOpen(false);
                        }}
                        title="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
