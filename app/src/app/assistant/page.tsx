"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send,
    Plus,
    MessageSquare,
    Trash2,
    Loader2,
    AlertTriangle,
    Menu,
    X,
    ChevronLeft,
    RefreshCw,
    Database,
} from "lucide-react";
import Image from "next/image";

interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

export default function AssistantPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [botName, setBotName] = useState("Chispita");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dataFreshness, setDataFreshness] = useState<string | null>(null);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch bot name from config
    useEffect(() => {
        fetch("/api/ai/config")
            .then((r) => r.json())
            .then((data) => {
                if (data.config?.ai_bot_name) {
                    setBotName(data.config.ai_bot_name);
                }
            })
            .catch(() => { });
    }, []);

    // Load conversations on mount + check data freshness
    useEffect(() => {
        loadConversations();
        checkDataFreshness();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const loadConversations = async () => {
        try {
            const res = await fetch("/api/ai/conversations");
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch {
            console.error("Error loading conversations");
        }
    };

    const checkDataFreshness = async () => {
        try {
            const res = await fetch("/api/revalidate-inventory", { method: "GET" }).catch(() => null);
            // The inventory cache refreshes automatically. Show a timestamp.
            setDataFreshness(new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }));
        } catch {
            setDataFreshness(null);
        }
    };

    const refreshInventoryData = async () => {
        setIsRefreshingData(true);
        try {
            await fetch("/api/revalidate-inventory", { method: "POST" });
            setDataFreshness(new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }));
        } catch {
            console.error("Error refreshing data");
        } finally {
            setIsRefreshingData(false);
        }
    };

    const loadMessages = useCallback(async (conversationId: string) => {
        try {
            const res = await fetch(`/api/ai/conversations/${conversationId}/messages`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch {
            console.error("Error loading messages");
        }
    }, []);

    const selectConversation = useCallback(
        async (id: string) => {
            setActiveConversation(id);
            setError(null);
            setStreamingContent("");
            await loadMessages(id);
            setSidebarOpen(false);
        },
        [loadMessages]
    );

    const createNewConversation = async () => {
        try {
            const res = await fetch("/api/ai/conversations", { method: "POST" });
            const data = await res.json();
            if (data.conversation) {
                setConversations((prev) => [data.conversation, ...prev]);
                setActiveConversation(data.conversation.id);
                setMessages([]);
                setError(null);
                setStreamingContent("");
                setSidebarOpen(false);
            }
        } catch {
            setError("Error al crear conversación");
        }
    };

    const deleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`/api/ai/conversations?id=${id}`, { method: "DELETE" });
            setConversations((prev) => prev.filter((c) => c.id !== id));
            if (activeConversation === id) {
                setActiveConversation(null);
                setMessages([]);
            }
        } catch {
            console.error("Error deleting conversation");
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isStreaming) return;

        let conversationId = activeConversation;

        // Auto-create conversation if none active
        if (!conversationId) {
            try {
                const res = await fetch("/api/ai/conversations", { method: "POST" });
                const data = await res.json();
                if (data.conversation) {
                    conversationId = data.conversation.id;
                    setConversations((prev) => [data.conversation, ...prev]);
                    setActiveConversation(conversationId);
                }
            } catch {
                setError("Error al crear conversación");
                return;
            }
        }

        const userMessage: Message = {
            id: `temp-${Date.now()}`,
            role: "user",
            content: input.trim(),
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setError(null);
        setIsLoading(true);
        setIsStreaming(true);
        setStreamingContent("");

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        try {
            abortControllerRef.current = new AbortController();

            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId,
                    message: userMessage.content,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Error en la respuesta");
            }

            const fullContent = await res.text();

            setIsLoading(false);

            // Add the complete assistant message
            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: fullContent,
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Refresh conversation list to get updated title
            loadConversations();
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            const errorMessage = err instanceof Error ? err.message : "Error desconocido";
            setError(errorMessage);
            setIsLoading(false);
        } finally {
            setIsStreaming(false);
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
        if (diffDays === 1) return "Ayer";
        if (diffDays < 7) return date.toLocaleDateString("es-CL", { weekday: "short" });
        return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
    };

    return (
        <main className="flex h-[calc(100vh-1rem)] md:h-screen overflow-hidden bg-transparent">
            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar - Conversation List */}
            <aside
                className={`
                    fixed md:relative z-50 md:z-auto
                    w-72 h-full flex flex-col
                    bg-[var(--glass-strong)] border-r border-[var(--border)]
                    transition-transform duration-300 ease-out
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
            >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Image src="/el-maestro.png" alt="El Maestro" width={32} height={32} className="w-full h-full object-cover" />
                            </div>
                            <h2 className="font-bold text-[var(--foreground)] text-sm">{botName}</h2>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden p-1 rounded-lg hover:bg-[var(--surface-hover)]"
                        >
                            <X className="w-5 h-5 text-[var(--muted)]" />
                        </button>
                    </div>
                    <button
                        onClick={createNewConversation}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                            bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                            text-white font-semibold text-sm transition-all duration-200
                            shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva conversación
                    </button>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <MessageSquare className="w-8 h-8 text-[var(--muted)] mx-auto mb-2 opacity-40" />
                            <p className="text-xs text-[var(--muted)] opacity-60">
                                Aún no hay conversaciones
                            </p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => selectConversation(conv.id)}
                                onKeyDown={(e) => e.key === "Enter" && selectConversation(conv.id)}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left
                                    transition-all duration-150 group cursor-pointer
                                    ${activeConversation === conv.id
                                        ? "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] border border-[color-mix(in_oklab,var(--brand)_25%,transparent)]"
                                        : "hover:bg-[var(--surface-hover)] border border-transparent"
                                    }
                                `}
                            >
                                <MessageSquare className={`w-4 h-4 shrink-0 ${activeConversation === conv.id ? "text-[var(--brand)]" : "text-[var(--muted)]"
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${activeConversation === conv.id
                                        ? "text-[var(--brand)] font-semibold"
                                        : "text-[var(--foreground)]"
                                        }`}>
                                        {conv.title}
                                    </p>
                                    <p className="text-[10px] text-[var(--muted)] opacity-60">
                                        {formatTime(conv.updated_at)}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => deleteConversation(conv.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg
                                        hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400
                                        transition-all duration-150"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Chat Header */}
                <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--glass)]">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-2 rounded-xl hover:bg-[var(--surface-hover)]"
                    >
                        <Menu className="w-5 h-5 text-[var(--foreground)]" />
                    </button>
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Image src="/el-maestro.png" alt="El Maestro" width={36} height={36} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-[var(--foreground)] text-base">{botName} ⚡</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-[var(--muted)]">Asistente IA del Pañol</p>
                            {dataFreshness && (
                                <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                    <Database className="w-2.5 h-2.5" />
                                    Datos: {dataFreshness}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={refreshInventoryData}
                        disabled={isRefreshingData}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            text-xs text-[var(--muted)] hover:text-[var(--foreground)]
                            hover:bg-[var(--surface-hover)] transition-all
                            disabled:opacity-50"
                        title="Actualizar datos del inventario"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingData ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Actualizar datos</span>
                    </button>
                    {activeConversation && (
                        <button
                            onClick={() => {
                                setActiveConversation(null);
                                setMessages([]);
                                setError(null);
                            }}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                text-xs text-[var(--muted)] hover:text-[var(--foreground)]
                                hover:bg-[var(--surface-hover)] transition-all"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Volver
                        </button>
                    )}
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                    {messages.length === 0 && !isStreaming && !activeConversation ? (
                        /* Welcome Screen */
                        <div className="flex items-center justify-center h-full">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-center max-w-md"
                            >
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500
                                    flex items-center justify-center shadow-2xl shadow-orange-500/30">
                                    <Image src="/el-maestro.png" alt="El Maestro" width={80} height={80} className="w-full h-full object-cover" />
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                                    ¡Hola! Soy {botName} ⚡
                                </h2>
                                <p className="text-[var(--muted)] mb-6 text-sm leading-relaxed">
                                    Tu asistente inteligente del Pañol. Pregúntame sobre materiales,
                                    stock, EPP o cualquier cosa que necesites para tu trabajo.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {[
                                        "¿Qué guantes tienen disponible?",
                                        "Necesito material para soldadura",
                                        "¿Cuántos rodamientos hay en stock?",
                                        "¿Qué EPP necesito para trabajo eléctrico?",
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setInput(suggestion);
                                                textareaRef.current?.focus();
                                            }}
                                            className="p-3 rounded-xl text-left text-xs
                                                bg-[var(--surface)] hover:bg-[var(--surface-hover)]
                                                border border-[var(--border)] hover:border-[var(--brand)]
                                                text-[var(--foreground)] transition-all duration-200
                                                hover:shadow-md"
                                        >
                                            💬 {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    ) : messages.length === 0 && !isStreaming && activeConversation ? (
                        /* Empty active conversation */
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500
                                    flex items-center justify-center shadow-lg shadow-orange-500/20 opacity-60">
                                    <Image src="/el-maestro.png" alt="El Maestro" width={56} height={56} className="w-full h-full object-cover" />
                                </div>
                                <p className="text-[var(--muted)] text-sm">
                                    Escribe tu pregunta sobre el pañol...
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Messages */
                        <>
                            {messages.map((msg, i) => (
                                <ChatBubble key={msg.id} message={msg} botName={botName} index={i} />
                            ))}

                            {/* Streaming message */}
                            {isStreaming && streamingContent && (
                                <ChatBubble
                                    message={{
                                        id: "streaming",
                                        role: "assistant",
                                        content: streamingContent,
                                        created_at: new Date().toISOString(),
                                    }}
                                    botName={botName}
                                    isStreaming
                                    index={messages.length}
                                />
                            )}

                            {/* Loading indicator */}
                            {isLoading && !streamingContent && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-3 max-w-3xl"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                                        <Image src="/el-maestro.png" alt="El Maestro" width={32} height={32} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="px-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* Error message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-3 max-w-3xl mx-auto"
                        >
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                                {error}
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--glass)]">
                    <div className="max-w-3xl mx-auto relative">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Pregúntale a ${botName}...`}
                            rows={1}
                            disabled={isStreaming}
                            className="w-full resize-none rounded-xl px-4 py-2.5 pr-12
                                bg-[var(--surface)] border border-[var(--border)]
                                text-[var(--foreground)] placeholder-[var(--muted)]
                                focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
                                text-sm leading-relaxed transition-all duration-200
                                disabled:opacity-50"
                            style={{ maxHeight: "120px" }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isStreaming}
                            className="absolute right-2 bottom-1.5 w-8 h-8 rounded-lg flex items-center justify-center
                                bg-gradient-to-r from-amber-500 to-orange-500
                                hover:from-amber-400 hover:to-orange-400
                                disabled:opacity-30 disabled:cursor-not-allowed
                                text-white transition-all duration-200"
                        >
                            {isStreaming ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-[var(--muted)] mt-1.5 opacity-50">
                        {botName} puede cometer errores. Verifica la información importante.
                    </p>
                </div>
            </div>
        </main>
    );
}

/* ──────────── Chat Bubble Component ──────────── */

function ChatBubble({
    message,
    botName,
    isStreaming,
    index,
}: {
    message: Message;
    botName: string;
    isStreaming?: boolean;
    index: number;
}) {
    const isUser = message.role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
            className={`flex items-start gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : ""}`}
        >
            {/* Avatar */}
            {isUser ? (
                <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">Tú</span>
                </div>
            ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                    <Image src="/el-maestro.png" alt="El Maestro" width={32} height={32} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Message Content */}
            <div
                className={`
                    px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%]
                    ${isUser
                        ? "bg-[var(--brand)] text-white rounded-tr-md"
                        : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-md"
                    }
                `}
            >
                {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <div className="prose-chat">
                        <MarkdownContent content={message.content} />
                        {isStreaming && (
                            <span className="inline-block w-1.5 h-4 bg-amber-400 animate-pulse ml-0.5 align-middle rounded-full" />
                        )}
                    </div>
                )}
                {!isStreaming && !isUser && (
                    <p className="text-[10px] text-[var(--muted)] mt-2 opacity-50">
                        {botName} · {new Date(message.created_at).toLocaleTimeString("es-CL", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

/* ──────────── Simple Markdown Renderer ──────────── */

function MarkdownContent({ content }: { content: string }) {
    const renderMarkdown = (text: string) => {
        // Split into lines and process
        const lines = text.split("\n");
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];
        let listType: "ul" | "ol" | null = null;
        let key = 0;

        const flushList = () => {
            if (listItems.length > 0 && listType) {
                const Tag = listType;
                elements.push(
                    <Tag key={key++} className={`${listType === "ul" ? "list-disc" : "list-decimal"} pl-5 my-1.5 space-y-0.5`}>
                        {listItems.map((item, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
                        ))}
                    </Tag>
                );
                listItems = [];
                listType = null;
            }
        };

        for (const line of lines) {
            // Headers
            if (line.startsWith("### ")) {
                flushList();
                elements.push(
                    <h4 key={key++} className="font-bold text-sm mt-3 mb-1" dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(4)) }} />
                );
            } else if (line.startsWith("## ")) {
                flushList();
                elements.push(
                    <h3 key={key++} className="font-bold text-base mt-3 mb-1" dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(3)) }} />
                );
            } else if (line.startsWith("# ")) {
                flushList();
                elements.push(
                    <h2 key={key++} className="font-bold text-lg mt-3 mb-1" dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
                );
            }
            // Unordered list
            else if (/^[\-\*]\s/.test(line)) {
                if (listType !== "ul") {
                    flushList();
                    listType = "ul";
                }
                listItems.push(line.replace(/^[\-\*]\s/, ""));
            }
            // Ordered list
            else if (/^\d+\.\s/.test(line)) {
                if (listType !== "ol") {
                    flushList();
                    listType = "ol";
                }
                listItems.push(line.replace(/^\d+\.\s/, ""));
            }
            // Horizontal rule
            else if (/^---+$/.test(line.trim())) {
                flushList();
                elements.push(<hr key={key++} className="my-2 border-[var(--border)]" />);
            }
            // Empty line
            else if (line.trim() === "") {
                flushList();
            }
            // Paragraph
            else {
                flushList();
                elements.push(
                    <p key={key++} className="my-1" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
                );
            }
        }

        flushList();
        return elements;
    };

    const inlineFormat = (text: string): string => {
        return text
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            // Inline code
            .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded text-xs bg-[var(--surface-hover)] font-mono">$1</code>')
            // Links
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" class="text-[var(--brand)] underline">$1</a>');
    };

    return <div className="space-y-0.5">{renderMarkdown(content)}</div>;
}
