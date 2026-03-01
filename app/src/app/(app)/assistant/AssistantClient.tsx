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
    Settings,
    CheckCircle2,
    XCircle,
    Zap,
    ArrowRight,
    Key,
    Eye,
    EyeOff,
    Save,
    ChevronDown,
    Mic,
    Square,
    PanelLeftClose,
    PanelLeftOpen,
    Paperclip,
    FileText,
    ChevronUp,
    Download,
} from "lucide-react";
import Image from "next/image";
import { getAvatarById } from "@/components/profile/AvatarSelector";
import { useCart } from "@/context/cart-context";

interface Attachment {
    file: File;
    preview?: string;
    type: "image" | "pdf";
    base64?: string;
}

const GEMINI_MODELS = [
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", desc: "Económico" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Equilibrado" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Estable" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", desc: "Rápido + Potente (Preview)" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro", desc: "Más inteligente (Preview)" },
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", desc: "Último — Feb 2026 (Preview)" },
];

interface ModelStatus {
    available: boolean | null; // null = not tested yet
    checking: boolean;
    latency?: number;
    error?: string;
}

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
    attachmentPreviews?: { url: string; name: string; type: "image" | "pdf" }[];
}

export default function AssistantClient({
    userAvatarId,
    initialBotName,
}: {
    userAvatarId: string | null;
    initialBotName: string;
}) {
    const userAvatar = userAvatarId ? getAvatarById(userAvatarId) : null;
    const userAvatarEmoji = userAvatar?.emoji || null;
    const userAvatarGradient = userAvatar?.gradient || null;
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [botName, setBotName] = useState(initialBotName);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [dataFreshness, setDataFreshness] = useState<string | null>(null);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [modelPanelOpen, setModelPanelOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState("gemini-2.5-flash");
    const [activeProvider, setActiveProvider] = useState<"gemini" | "openrouter">("gemini");
    const [openRouterModel, setOpenRouterModel] = useState("");
    const [savingOpenRouterModel, setSavingOpenRouterModel] = useState(false);
    const [savedORModels, setSavedORModels] = useState<{ id: string; model_id: string; label: string | null }[]>([]);
    const [deletingORModel, setDeletingORModel] = useState<string | null>(null);
    const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
    const [switchingModel, setSwitchingModel] = useState<string | null>(null);
    const [newApiKey, setNewApiKey] = useState("");
    const [newApiKeyLabel, setNewApiKeyLabel] = useState("");
    const [showNewApiKey, setShowNewApiKey] = useState(false);
    const [savingApiKey, setSavingApiKey] = useState(false);
    const [apiKeys, setApiKeys] = useState<{ id: string; label: string; key_preview: string; is_active: boolean }[]>([]);
    const [apiKeyMessage, setApiKeyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showApiKeySection, setShowApiKeySection] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modelSelectorRef = useRef<HTMLDivElement>(null);

    // Fetch bot name, current model, and provider from config
    useEffect(() => {
        fetch("/api/ai/config")
            .then((r) => r.json())
            .then((data) => {
                if (data.config?.ai_bot_name) {
                    setBotName(data.config.ai_bot_name);
                }
                if (data.config?.ai_model) {
                    setCurrentModel(data.config.ai_model);
                    // If model is not in GEMINI_MODELS, set it as OpenRouter model
                    const isGeminiModel = GEMINI_MODELS.some(m => m.value === data.config.ai_model);
                    if (!isGeminiModel) {
                        setOpenRouterModel(data.config.ai_model);
                    }
                }
                if (data.config?.ai_provider) {
                    setActiveProvider(data.config.ai_provider === "openrouter" ? "openrouter" : "gemini");
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

    // Auto-focus textarea when streaming ends
    useEffect(() => {
        if (!isStreaming && !isLoading) {
            textareaRef.current?.focus();
        }
    }, [isStreaming, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const scrollH = textareaRef.current.scrollHeight;
            const maxH = 200; // ~7 lines before scroll appears
            textareaRef.current.style.height = `${Math.min(scrollH, maxH)}px`;
            textareaRef.current.style.overflowY = scrollH > maxH ? "auto" : "hidden";
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

    const createNewConversation = () => {
        // Lazy creation: only reset local state here.
        // The actual DB record is created in sendMessage() when the first message is sent.
        setActiveConversation(null);
        setMessages([]);
        setError(null);
        setStreamingContent("");
        setSidebarOpen(false);
    };

    const deleteConversation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await fetch(`/api/ai/conversations?id=${deleteConfirmId}`, { method: "DELETE" });
            setConversations((prev) => prev.filter((c) => c.id !== deleteConfirmId));
            if (activeConversation === deleteConfirmId) {
                setActiveConversation(null);
                setMessages([]);
            }
        } catch {
            console.error("Error deleting conversation");
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirmId(null);
    };

    const deleteAllConversations = async () => {
        setIsDeletingAll(true);
        try {
            const res = await fetch("/api/ai/conversations?all=true", { method: "DELETE" });
            if (res.ok) {
                setConversations([]);
                setActiveConversation(null);
                setMessages([]);
            } else {
                console.error("Error deleting all conversations");
            }
        } catch {
            console.error("Error deleting all conversations");
        } finally {
            setIsDeletingAll(false);
            setDeleteAllConfirm(false);
        }
    };

    // Close model selector on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modelSelectorRef.current && !modelSelectorRef.current.contains(e.target as Node)) {
                setShowModelSelector(false);
            }
        };
        if (showModelSelector) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showModelSelector]);

    // File attachment handler
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const MAX_SIZE = 20 * 1024 * 1024; // 20MB Gemini limit
        const ALLOWED_TYPES = [
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf"
        ];

        for (const file of Array.from(files)) {
            if (file.size > MAX_SIZE) {
                setError(`"${file.name}" excede el límite de 20MB`);
                continue;
            }
            if (!ALLOWED_TYPES.includes(file.type)) {
                setError(`"${file.name}" no es un tipo soportado. Usa imágenes o PDF.`);
                continue;
            }

            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.split(",")[1]); // Remove data:... prefix
                };
                reader.readAsDataURL(file);
            });

            const isImage = file.type.startsWith("image/");
            const preview = isImage ? URL.createObjectURL(file) : undefined;

            setAttachments((prev) => [...prev, {
                file,
                preview,
                type: isImage ? "image" : "pdf",
                base64,
            }]);
        }

        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => {
            const attachment = prev[index];
            if (attachment.preview) URL.revokeObjectURL(attachment.preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    const sendMessage = async () => {
        if ((!input.trim() && attachments.length === 0) || isStreaming) return;

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

        // Build attachment previews for display in chat
        const previewsForMessage = attachments.map(a => ({
            url: a.base64 ? `data:${a.file.type};base64,${a.base64}` : "",
            name: a.file.name,
            type: a.type,
        }));

        const userMessage: Message = {
            id: `temp-${Date.now()}`,
            role: "user",
            content: input.trim() + (attachments.length > 0
                ? `\n\n📎 ${attachments.map(a => a.file.name).join(", ")}`
                : ""),
            created_at: new Date().toISOString(),
            attachmentPreviews: previewsForMessage.length > 0 ? previewsForMessage : undefined,
        };

        // Capture attachments before clearing
        const currentAttachments = attachments.map(a => ({
            base64: a.base64!,
            mimeType: a.file.type,
            fileName: a.file.name,
        }));

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setAttachments([]);
        setError(null);
        setIsLoading(true);
        setIsStreaming(true);
        setStreamingContent("");

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        // Auto-focus textarea after sending
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });

        try {
            abortControllerRef.current = new AbortController();

            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId,
                    message: input.trim() || "Analiza este archivo adjunto",
                    attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
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

    // Clipboard paste handler for images
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                // Generate a friendly name
                const timestamp = new Date().toLocaleString("es-CL", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                });
                const ext = file.type.split("/")[1] || "png";
                const namedFile = new File([file], `Captura ${timestamp}.${ext}`, { type: file.type });

                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        resolve(result.split(",")[1]);
                    };
                    reader.readAsDataURL(namedFile);
                });

                const preview = URL.createObjectURL(namedFile);

                setAttachments((prev) => [...prev, {
                    file: namedFile,
                    preview,
                    type: "image",
                    base64,
                }]);
            }
        }
    };

    /* ──── Voice Recording (Speech-to-Text) ──── */

    const startRecording = async () => {
        try {
            // Use Web Speech API for speech-to-text
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognitionAPI) {
                setError("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
                return;
            }

            const recognition = new SpeechRecognitionAPI();
            recognition.lang = "es-CL";
            recognition.continuous = true;
            recognition.interimResults = true;

            let finalTranscript = "";

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
                let interim = "";
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + " ";
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setInput(finalTranscript + interim);
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                if (event.error === "not-allowed") {
                    setError("Permiso de micrófono denegado. Habilítalo en la configuración del navegador.");
                }
                stopRecording();
            };

            recognition.onend = () => {
                setIsRecording(false);
                setRecordingTime(0);
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                    recordingIntervalRef.current = null;
                }
                textareaRef.current?.focus();
            };

            // Store reference for stopping
            (mediaRecorderRef as React.MutableRefObject<unknown>).current = recognition;

            recognition.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Timer for recording duration display
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error starting recording:", err);
            setError("Error al iniciar la grabación de audio.");
        }
    };

    const stopRecording = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = mediaRecorderRef.current as any;
        if (recognition) {
            try {
                recognition.stop();
            } catch { /* already stopped */ }
            (mediaRecorderRef as React.MutableRefObject<unknown>).current = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        textareaRef.current?.focus();
    };

    const formatRecordingTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
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

    /* ──── Model Testing & Switching ──── */

    const testModel = async (modelValue: string) => {
        setModelStatuses((prev) => ({
            ...prev,
            [modelValue]: { available: null, checking: true },
        }));

        try {
            const res = await fetch("/api/ai/test-model", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelValue }),
            });
            const data = await res.json();

            setModelStatuses((prev) => ({
                ...prev,
                [modelValue]: {
                    available: data.available ?? false,
                    checking: false,
                    latency: data.latency,
                    error: data.error,
                },
            }));
        } catch {
            setModelStatuses((prev) => ({
                ...prev,
                [modelValue]: { available: false, checking: false, error: "Error de conexión" },
            }));
        }
    };

    const testAllModels = async () => {
        // Test all models in parallel
        await Promise.all(GEMINI_MODELS.map((m) => testModel(m.value)));
    };

    const switchModel = async (modelValue: string, provider?: "gemini" | "openrouter") => {
        setSwitchingModel(modelValue);
        try {
            const res = await fetch("/api/ai/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelValue, provider: provider || undefined }),
            });

            if (res.ok) {
                setCurrentModel(modelValue);
                if (provider) setActiveProvider(provider);
                setError(null);
                // Auto-close panel after short delay
                setTimeout(() => setModelPanelOpen(false), 600);
            } else {
                const data = await res.json();
                setError(data.error || "Error al cambiar modelo");
            }
        } catch {
            setError("Error de conexión al cambiar modelo");
        } finally {
            setSwitchingModel(null);
        }
    };

    const saveOpenRouterModel = async () => {
        if (!openRouterModel.trim()) return;
        setSavingOpenRouterModel(true);
        try {
            // 1. Set as active model
            const res = await fetch("/api/ai/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: openRouterModel.trim(), provider: "openrouter" }),
            });
            if (res.ok) {
                setCurrentModel(openRouterModel.trim());
                setActiveProvider("openrouter");
                setError(null);
            } else {
                const data = await res.json();
                setError(data.error || "Error al guardar modelo");
                setSavingOpenRouterModel(false);
                return;
            }

            // 2. Persist to saved models (ignore 409 = already exists)
            const saveRes = await fetch("/api/ai/openrouter-models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model_id: openRouterModel.trim() }),
            });
            if (saveRes.ok) {
                await loadSavedORModels();
            }
        } catch {
            setError("Error de conexión");
        } finally {
            setSavingOpenRouterModel(false);
        }
    };

    const loadSavedORModels = async () => {
        try {
            const res = await fetch("/api/ai/openrouter-models");
            const data = await res.json();
            setSavedORModels(data.models || []);
        } catch {
            console.error("Error loading saved OR models");
        }
    };

    const deleteSavedORModel = async (id: string) => {
        setDeletingORModel(id);
        try {
            const res = await fetch(`/api/ai/openrouter-models?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setSavedORModels((prev) => prev.filter((m) => m.id !== id));
            }
        } catch {
            console.error("Error deleting saved OR model");
        } finally {
            setDeletingORModel(null);
        }
    };

    const selectSavedORModel = async (modelId: string) => {
        setSwitchingModel(modelId);
        try {
            const res = await fetch("/api/ai/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: modelId, provider: "openrouter" }),
            });
            if (res.ok) {
                setCurrentModel(modelId);
                setActiveProvider("openrouter");
                setOpenRouterModel(modelId);
                setError(null);
                setTimeout(() => setModelPanelOpen(false), 600);
            }
        } catch {
            setError("Error de conexión");
        } finally {
            setSwitchingModel(null);
        }
    };

    /* ---- API Key Management ---- */

    const loadApiKeys = async () => {
        try {
            const res = await fetch("/api/ai/api-keys");
            const data = await res.json();
            setApiKeys(data.keys || []);
        } catch {
            console.error("Error loading API keys");
        }
    };

    const saveNewApiKey = async () => {
        if (!newApiKey.trim()) return;
        setSavingApiKey(true);
        setApiKeyMessage(null);
        try {
            const res = await fetch("/api/ai/api-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiKey: newApiKey.trim(),
                    label: newApiKeyLabel.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setApiKeyMessage({ type: "success", text: data.message || "Key guardada y activada" });
                setNewApiKey("");
                setNewApiKeyLabel("");
                setShowNewApiKey(false);
                loadApiKeys();
                // Reset model statuses so user can re-test with new key
                setModelStatuses({});
                setTimeout(() => testAllModels(), 500);
            } else {
                setApiKeyMessage({ type: "error", text: data.error || "Error al guardar" });
            }
        } catch {
            setApiKeyMessage({ type: "error", text: "Error de conexion" });
        } finally {
            setSavingApiKey(false);
            setTimeout(() => setApiKeyMessage(null), 4000);
        }
    };

    const activateApiKey = async (keyId: string) => {
        try {
            const res = await fetch("/api/ai/api-keys", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyId }),
            });
            const data = await res.json();
            if (res.ok) {
                setApiKeyMessage({ type: "success", text: data.message || "Key activada" });
                loadApiKeys();
                // Reset model statuses so user can re-test with new key
                setModelStatuses({});
                setTimeout(() => testAllModels(), 500);
            } else {
                setApiKeyMessage({ type: "error", text: data.error || "Error al activar" });
            }
        } catch {
            setApiKeyMessage({ type: "error", text: "Error de conexion" });
        } finally {
            setTimeout(() => setApiKeyMessage(null), 4000);
        }
    };

    return (
        <>
            <main className="flex h-[calc(100vh-1rem)] md:h-screen overflow-hidden bg-transparent">
                {/* ──── Delete Confirmation Modal ──── */}
                <AnimatePresence>
                    {deleteConfirmId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                            onClick={cancelDelete}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-[var(--glass-strong)] border border-[var(--border)] rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                                        <Trash2 className="w-5 h-5 text-red-400" />
                                    </div>
                                    <h3 className="text-base font-bold text-[var(--foreground)]">
                                        Eliminar conversación
                                    </h3>
                                </div>
                                <p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">
                                    ¿Estás seguro de que deseas eliminar esta conversación?
                                    <br />
                                    <span className="text-xs opacity-70">Esta acción no se puede deshacer.</span>
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={cancelDelete}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                                        bg-[var(--surface)] hover:bg-[var(--surface-hover)]
                                        border border-[var(--border)] text-[var(--foreground)]
                                        transition-all duration-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                                        bg-red-500 hover:bg-red-400 text-white
                                        transition-all duration-200 shadow-lg shadow-red-500/20
                                        hover:shadow-red-500/30"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ──── Delete ALL Confirmation Modal ──── */}
                <AnimatePresence>
                    {deleteAllConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                            onClick={() => setDeleteAllConfirm(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-[var(--glass-strong)] border border-[var(--border)] rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <h3 className="text-base font-bold text-[var(--foreground)]">
                                        Eliminar todos los chats
                                    </h3>
                                </div>
                                <p className="text-sm text-[var(--muted)] mb-2 leading-relaxed">
                                    ¿Estás seguro de que deseas eliminar <strong className="text-[var(--foreground)]">{conversations.length}</strong> conversación{conversations.length !== 1 ? "es" : ""}?
                                </p>
                                <p className="text-xs text-[var(--muted)] opacity-70 mb-6">
                                    Esta acción ocultará todas las conversaciones de tu historial. No se pueden recuperar.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteAllConfirm(false)}
                                        disabled={isDeletingAll}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                                        bg-[var(--surface)] hover:bg-[var(--surface-hover)]
                                        border border-[var(--border)] text-[var(--foreground)]
                                        transition-all duration-200 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={deleteAllConversations}
                                        disabled={isDeletingAll}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                                        bg-red-500 hover:bg-red-400 text-white
                                        transition-all duration-200 shadow-lg shadow-red-500/20
                                        hover:shadow-red-500/30 disabled:opacity-50
                                        flex items-center justify-center gap-2"
                                    >
                                        {isDeletingAll ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Eliminando…
                                            </>
                                        ) : (
                                            "Eliminar todo"
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                    h-full flex flex-col
                    bg-[var(--glass-strong)] border-r border-[var(--border)]
                    transition-all duration-300 ease-out overflow-hidden
                    ${sidebarCollapsed ? "md:w-0 md:border-r-0" : "md:w-60"}
                    w-60
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
                            <button
                                onClick={() => setSidebarCollapsed(true)}
                                className="hidden md:flex p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                                title="Ocultar historial"
                            >
                                <PanelLeftClose className="w-4.5 h-4.5 text-[var(--muted)]" />
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
                                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                                    transition-all duration-150 group cursor-pointer
                                    ${activeConversation === conv.id
                                            ? "bg-white/[0.08] dark:bg-white/[0.08] light:bg-black/[0.06]"
                                            : "hover:bg-white/[0.04] dark:hover:bg-white/[0.04] light:hover:bg-black/[0.03]"
                                        }
                                `}
                                >
                                    <MessageSquare className={`w-4 h-4 shrink-0 ${activeConversation === conv.id ? "text-[var(--foreground)]" : "text-[var(--muted)] opacity-50"
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] truncate ${activeConversation === conv.id
                                            ? "text-[var(--foreground)] font-medium"
                                            : "text-[var(--foreground)] opacity-80"
                                            }`}>
                                            {conv.title}
                                        </p>
                                        <p className="text-[10px] text-[var(--muted)] opacity-50 mt-0.5">
                                            {formatTime(conv.updated_at)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => deleteConversation(conv.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md
                                        hover:bg-white/10 text-[var(--muted)] hover:text-red-400
                                        transition-all duration-150"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Sidebar Footer – Settings */}
                    {conversations.length > 0 && (
                        <div className="p-3 border-t border-[var(--border)]">
                            <button
                                onClick={() => setDeleteAllConfirm(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                                text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10
                                transition-all duration-200 group"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar todos los chats</span>
                            </button>
                        </div>
                    )}
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
                        {sidebarCollapsed && (
                            <button
                                onClick={() => setSidebarCollapsed(false)}
                                className="hidden md:flex p-2 rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
                                title="Mostrar historial"
                            >
                                <PanelLeftOpen className="w-5 h-5 text-[var(--foreground)]" />
                            </button>
                        )}
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Image src="/el-maestro.png" alt="El Maestro" width={36} height={36} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="font-bold text-[var(--foreground)] text-base">{botName}</h1>
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
                        <button
                            onClick={() => {
                                setModelPanelOpen(!modelPanelOpen);
                                if (!modelPanelOpen) {
                                    if (Object.keys(modelStatuses).length === 0) testAllModels();
                                    loadSavedORModels();
                                }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            text-xs transition-all
                            ${modelPanelOpen
                                    ? "bg-white/[0.08] text-[var(--foreground)]"
                                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/[0.04]"
                                }`}
                            title="Cambiar modelo IA"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Modelo</span>
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

                    {/* Model Switching Panel */}
                    <AnimatePresence>
                        {modelPanelOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden border-b border-[var(--border)] bg-[var(--glass-strong)]"
                            >
                                <div className="p-4 max-w-3xl mx-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-medium text-[var(--foreground)]">
                                                Modelo IA
                                            </h3>
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-[var(--muted)] font-mono">
                                                {activeProvider === "openrouter" ? "🌐 " : ""}{GEMINI_MODELS.find((m) => m.value === currentModel)?.label || currentModel}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeProvider === "gemini" && (
                                                <button
                                                    onClick={testAllModels}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md
                                                    text-[11px] font-medium
                                                    bg-white/[0.04] hover:bg-white/[0.08] text-[var(--muted)] hover:text-[var(--foreground)]
                                                    transition-all"
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${Object.values(modelStatuses).some((s) => s.checking) ? "animate-spin" : ""
                                                        }`} />
                                                    Verificar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setModelPanelOpen(false)}
                                                className="p-1 rounded-md hover:bg-white/[0.06] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                                title="Cerrar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Provider Tabs */}
                                    <div className="flex gap-1.5 mb-3 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                        <button
                                            onClick={() => setActiveProvider("gemini")}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeProvider === "gemini"
                                                ? "bg-white/[0.1] text-[var(--foreground)] shadow-sm"
                                                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/[0.04]"
                                                }`}
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                            Gemini
                                        </button>
                                        <button
                                            onClick={() => setActiveProvider("openrouter")}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeProvider === "openrouter"
                                                ? "bg-white/[0.1] text-[var(--foreground)] shadow-sm"
                                                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/[0.04]"
                                                }`}
                                        >
                                            🌐
                                            OpenRouter
                                        </button>
                                    </div>

                                    {/* Gemini Models Grid */}
                                    {activeProvider === "gemini" && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                {GEMINI_MODELS.map((m) => {
                                                    const status = modelStatuses[m.value];
                                                    const isCurrent = m.value === currentModel;
                                                    const isSwitching = switchingModel === m.value;

                                                    return (
                                                        <div
                                                            key={m.value}
                                                            className={`relative p-3 rounded-lg transition-all duration-200 cursor-pointer
                                                            ${isCurrent
                                                                    ? "bg-white/[0.08]"
                                                                    : "bg-white/[0.02] hover:bg-white/[0.05]"
                                                                }`}
                                                            onClick={() => !isCurrent && status?.available && switchModel(m.value, "gemini")}
                                                        >
                                                            <div className="flex items-start justify-between mb-1">
                                                                <div className="min-w-0">
                                                                    <p className={`text-[13px] font-medium truncate ${isCurrent ? "text-[var(--foreground)]" : "text-[var(--foreground)] opacity-80"
                                                                        }`}>
                                                                        {m.label}
                                                                    </p>
                                                                    <p className="text-[10px] text-[var(--muted)] opacity-60">{m.desc}</p>
                                                                </div>
                                                                {isCurrent && (
                                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 ml-1" />
                                                                )}
                                                            </div>

                                                            {/* Status indicator */}
                                                            <div className="flex items-center justify-between mt-1.5">
                                                                <div className="flex items-center gap-1">
                                                                    {!status ? (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); testModel(m.value); }}
                                                                            className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] underline transition-colors"
                                                                        >
                                                                            Verificar
                                                                        </button>
                                                                    ) : status.checking ? (
                                                                        <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                            Verificando...
                                                                        </span>
                                                                    ) : status.available ? (
                                                                        <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                            OK
                                                                            {status.latency && (
                                                                                <span className="text-[var(--muted)] opacity-60">{status.latency}ms</span>
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1 text-[10px] text-red-400/80" title={status.error}>
                                                                            <XCircle className="w-3 h-3" />
                                                                            {status.error || "No disponible"}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {!isCurrent && status?.available && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); switchModel(m.value, "gemini"); }}
                                                                        disabled={isSwitching}
                                                                        className="flex items-center gap-1 px-2 py-0.5 rounded-md
                                                                        text-[10px] font-medium
                                                                        bg-white/[0.06] hover:bg-white/[0.1]
                                                                        text-[var(--foreground)] transition-all
                                                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {isSwitching ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            <>
                                                                                Usar <ArrowRight className="w-2.5 h-2.5" />
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-[var(--muted)] mt-2.5 opacity-40">
                                                Si un modelo muestra error de cuota, prueba otro.
                                            </p>
                                        </>
                                    )}

                                    {/* OpenRouter Custom Model */}
                                    {activeProvider === "openrouter" && (
                                        <div className="space-y-3">
                                            {/* Saved models grid */}
                                            {savedORModels.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                    {savedORModels.map((m) => {
                                                        const isCurrent = m.model_id === currentModel && activeProvider === "openrouter";
                                                        const isSwitching = switchingModel === m.model_id;
                                                        const isDeleting = deletingORModel === m.id;
                                                        return (
                                                            <div
                                                                key={m.id}
                                                                className={`relative group p-3 rounded-lg transition-all duration-200 cursor-pointer
                                                                ${isCurrent
                                                                        ? "bg-white/[0.08] ring-1 ring-emerald-500/30"
                                                                        : "bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06]"
                                                                    }`}
                                                                onClick={() => !isCurrent && !isDeleting && selectSavedORModel(m.model_id)}
                                                            >
                                                                {/* Delete button */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); deleteSavedORModel(m.id); }}
                                                                    disabled={isDeleting}
                                                                    className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100
                                                                    hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400
                                                                    transition-all disabled:opacity-50"
                                                                    title="Eliminar modelo"
                                                                >
                                                                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                                </button>
                                                                <div className="flex items-start gap-2 pr-6">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className={`text-[12px] font-mono truncate ${isCurrent ? "text-[var(--foreground)]" : "text-[var(--foreground)] opacity-80"}`}>
                                                                            {m.model_id}
                                                                        </p>
                                                                        {m.label && (
                                                                            <p className="text-[10px] text-[var(--muted)] opacity-60 truncate">{m.label}</p>
                                                                        )}
                                                                    </div>
                                                                    {isCurrent && (
                                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                                                    )}
                                                                </div>
                                                                {!isCurrent && (
                                                                    <div className="flex items-center mt-1.5">
                                                                        {isSwitching ? (
                                                                            <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                                                                                <Loader2 className="w-3 h-3 animate-spin" /> Cambiando...
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-[var(--muted)] opacity-50">Click para usar</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Add new model input */}
                                            <div className="p-4 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.08]">
                                                <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2.5">
                                                    Agregar modelo
                                                </p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={openRouterModel}
                                                        onChange={(e) => setOpenRouterModel(e.target.value)}
                                                        className="flex-1 rounded-lg px-3 py-2 text-xs font-mono
                                                        bg-white/[0.04] border border-white/[0.08]
                                                        text-[var(--foreground)] placeholder-[var(--muted)]
                                                        focus:border-white/[0.2] focus:ring-1 focus:ring-white/[0.1]
                                                        transition-all outline-none"
                                                        placeholder="ej: minimax/minimax-m2.5"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                saveOpenRouterModel();
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={saveOpenRouterModel}
                                                        disabled={savingOpenRouterModel || !openRouterModel.trim()}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                                                        text-xs font-medium
                                                        bg-white/[0.08] hover:bg-white/[0.12]
                                                        text-[var(--foreground)] transition-all
                                                        disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        {savingOpenRouterModel ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Save className="w-3.5 h-3.5" />
                                                        )}
                                                        {savingOpenRouterModel ? "Guardando..." : "Guardar y usar"}
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-[var(--muted)] opacity-40">
                                                Usa cualquier modelo disponible en{" "}
                                                <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--foreground)]">
                                                    openrouter.ai/models
                                                </a>. La API Key se configura en Administración.
                                            </p>
                                        </div>
                                    )}

                                    {/* API Key Management Section */}
                                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                                        <button
                                            onClick={() => {
                                                setShowApiKeySection(!showApiKeySection);
                                                if (!showApiKeySection && apiKeys.length === 0) {
                                                    loadApiKeys();
                                                }
                                            }}
                                            className="flex items-center gap-2 w-full text-left"
                                        >
                                            <Key className="w-3.5 h-3.5 text-[var(--muted)]" />
                                            <span className="text-xs font-medium text-[var(--foreground)]">
                                                API Keys
                                            </span>
                                            <ChevronDown className={`w-3.5 h-3.5 text-[var(--muted)] transition-transform duration-200 ml-auto ${showApiKeySection ? "rotate-180" : ""}`} />
                                        </button>

                                        <AnimatePresence>
                                            {showApiKeySection && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-3 space-y-3">
                                                        {apiKeys.length > 0 && (
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                                                                {apiKeys.map((k) => (
                                                                    <div
                                                                        key={k.id}
                                                                        onClick={() => !k.is_active && activateApiKey(k.id)}
                                                                        className={`relative p-2.5 rounded-lg text-xs transition-all cursor-pointer
                                                                        ${k.is_active
                                                                                ? "bg-white/[0.08] ring-1 ring-emerald-500/30"
                                                                                : "bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12]"
                                                                            }`}
                                                                    >
                                                                        {k.is_active && (
                                                                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                                                                        )}
                                                                        <p className={`font-medium truncate text-[11px] ${k.is_active ? "text-[var(--foreground)]" : "text-[var(--foreground)] opacity-80"}`}>
                                                                            {k.label}
                                                                        </p>
                                                                        <p className="text-[9px] text-[var(--muted)] font-mono opacity-50 truncate mt-0.5">
                                                                            {k.key_preview}
                                                                        </p>
                                                                        {!k.is_active && (
                                                                            <p className="text-[9px] text-[var(--muted)] mt-1 opacity-60">
                                                                                Click para usar
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="p-3 rounded-lg bg-white/[0.02] border border-dashed border-white/[0.08]">
                                                            <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">
                                                                Nueva API Key
                                                            </p>
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="text"
                                                                    value={newApiKeyLabel}
                                                                    onChange={(e) => setNewApiKeyLabel(e.target.value)}
                                                                    className="w-full rounded-md px-3 py-1.5 text-xs
                                                                    bg-white/[0.04] border border-white/[0.08]
                                                                    text-[var(--foreground)] placeholder-[var(--muted)]
                                                                    focus:border-white/[0.15] focus:ring-0
                                                                    transition-all outline-none"
                                                                    placeholder="Nombre (ej: Key personal)"
                                                                />
                                                                <div className="relative">
                                                                    <input
                                                                        type={showNewApiKey ? "text" : "password"}
                                                                        value={newApiKey}
                                                                        onChange={(e) => setNewApiKey(e.target.value)}
                                                                        className="w-full rounded-md px-3 py-1.5 pr-8 text-xs font-mono
                                                                        bg-white/[0.04] border border-white/[0.08]
                                                                        text-[var(--foreground)] placeholder-[var(--muted)]
                                                                        focus:border-white/[0.15] focus:ring-0
                                                                        transition-all outline-none"
                                                                        placeholder="AIzaSy..."
                                                                    />
                                                                    <button
                                                                        onClick={() => setShowNewApiKey(!showNewApiKey)}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                                                                    >
                                                                        {showNewApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    onClick={saveNewApiKey}
                                                                    disabled={savingApiKey || !newApiKey.trim()}
                                                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
                                                                    text-xs font-medium
                                                                    bg-white/[0.06] hover:bg-white/[0.1]
                                                                    text-[var(--foreground)] transition-all
                                                                    disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {savingApiKey ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <Save className="w-3 h-3" />
                                                                    )}
                                                                    {savingApiKey ? "Guardando..." : "Guardar y usar"}
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] text-[var(--muted)] mt-1.5 opacity-50">
                                                                Obtén tu API Key en{" "}
                                                                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--foreground)]">
                                                                    aistudio.google.com
                                                                </a>
                                                            </p>
                                                        </div>

                                                        {/* API Key status message */}
                                                        {apiKeyMessage && (
                                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] ${apiKeyMessage.type === "success"
                                                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                                }`}>
                                                                {apiKeyMessage.type === "success" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                                {apiKeyMessage.text}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                                        ¡Hola! Soy {botName}
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
                                    <ChatBubble key={msg.id} message={msg} botName={botName} index={i} userAvatarEmoji={userAvatarEmoji} userAvatarGradient={userAvatarGradient} />
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
                                        userAvatarEmoji={userAvatarEmoji}
                                        userAvatarGradient={userAvatarGradient}
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
                    <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--glass)]">
                        <div className="max-w-3xl mx-auto">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />

                            {/* Recording indicator */}
                            {isRecording && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg
                                    bg-red-500/10 border border-red-500/20"
                                >
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-xs text-red-400 font-medium">
                                        Escuchando... {formatRecordingTime(recordingTime)}
                                    </span>
                                    <span className="text-[10px] text-[var(--muted)] ml-auto">
                                        Habla y tu voz se convertirá en texto
                                    </span>
                                </motion.div>
                            )}

                            {/* Attachment previews */}
                            {attachments.length > 0 && (
                                <div className="flex items-center gap-2 mb-2 px-1 overflow-x-auto pb-1">
                                    {attachments.map((att, i) => (
                                        <div key={i} className="relative group shrink-0">
                                            {att.type === "image" && att.preview ? (
                                                <button
                                                    onClick={() => setPreviewLightbox(att.preview!)}
                                                    className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)]
                                                    cursor-pointer hover:scale-105 hover:border-amber-500/50 transition-all">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={att.preview} alt={att.file.name} className="w-full h-full object-cover" />
                                                </button>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col items-center justify-center gap-1">
                                                    <FileText className="w-5 h-5 text-red-400" />
                                                    <span className="text-[8px] text-[var(--muted)] truncate max-w-[54px] px-1">{att.file.name}</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeAttachment(i)}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                                                bg-[var(--background)] border border-[var(--border)]
                                                flex items-center justify-center
                                                opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3 text-[var(--muted)]" />
                                            </button>
                                        </div>
                                    ))}
                                    <span className="text-[10px] text-[var(--muted)] opacity-50 shrink-0">
                                        {attachments.length} archivo{attachments.length > 1 ? "s" : ""} · máx 20MB
                                    </span>
                                </div>
                            )}

                            <div className="relative flex items-end gap-2">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    placeholder={`Pregúntale a ${botName}...`}
                                    rows={2}
                                    disabled={isStreaming}
                                    className="flex-1 resize-none rounded-2xl px-4 py-3 pr-4
                                    bg-[var(--surface)] border border-[var(--border)]
                                    text-[var(--foreground)] placeholder-[var(--muted)]
                                    focus:border-[var(--foreground)]/20 focus:ring-1 focus:ring-[var(--foreground)]/10
                                    text-sm leading-relaxed transition-all duration-200
                                    disabled:opacity-50 outline-none"
                                    style={{ maxHeight: "200px", overflowY: "hidden" }}
                                />

                                {/* Attach file button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isStreaming}
                                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                                    bg-[var(--surface)] border border-[var(--border)]
                                    text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]
                                    transition-all duration-200 disabled:opacity-30"
                                    title="Adjuntar imagen o PDF (máx 20MB)"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>

                                {/* Mic button */}
                                <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={isStreaming}
                                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                                    transition-all duration-200 disabled:opacity-30
                                    ${isRecording
                                            ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30 animate-pulse"
                                            : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                                        }`}
                                    title={isRecording ? "Detener grabación" : "Grabar mensaje de voz"}
                                >
                                    {isRecording ? (
                                        <Square className="w-3.5 h-3.5" />
                                    ) : (
                                        <Mic className="w-4 h-4" />
                                    )}
                                </button>

                                {/* Send button */}
                                <button
                                    onClick={sendMessage}
                                    disabled={(!input.trim() && attachments.length === 0) || isStreaming}
                                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                                    bg-gradient-to-r from-amber-500 to-orange-500
                                    hover:from-amber-400 hover:to-orange-400
                                    disabled:opacity-30 disabled:cursor-not-allowed
                                    text-white transition-all duration-200
                                    shadow-md shadow-orange-500/20"
                                >
                                    {isStreaming ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Footer with model selector */}
                        <div className="flex items-center justify-center gap-2 mt-1.5 relative" ref={modelSelectorRef}>
                            <button
                                onClick={() => setShowModelSelector(!showModelSelector)}
                                className="flex items-center gap-1 text-[10px] text-[var(--muted)] opacity-40
                                hover:opacity-70 transition-opacity cursor-pointer"
                            >
                                {GEMINI_MODELS.find((m) => m.value === currentModel)?.label || currentModel}
                                <ChevronUp className={`w-2.5 h-2.5 transition-transform ${showModelSelector ? "rotate-180" : ""}`} />
                            </button>
                            <span className="text-[10px] text-[var(--muted)] opacity-20">·</span>
                            <span className="text-[10px] text-[var(--muted)] opacity-40">
                                {botName} puede cometer errores.
                            </span>

                            {/* Model selector dropdown */}
                            <AnimatePresence>
                                {showModelSelector && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-6 left-1/2 -translate-x-1/2
                                        bg-[var(--surface)] border border-[var(--border)]
                                        rounded-xl shadow-xl shadow-black/20
                                        p-1.5 min-w-[220px] z-50"
                                    >
                                        {GEMINI_MODELS.map((m) => {
                                            const status = modelStatuses[m.value];
                                            const isCurrent = m.value === currentModel;
                                            const isAvailable = status?.available;

                                            return (
                                                <button
                                                    key={m.value}
                                                    onClick={() => {
                                                        if (!isCurrent && isAvailable) {
                                                            switchModel(m.value);
                                                            setShowModelSelector(false);
                                                        }
                                                    }}
                                                    disabled={isCurrent || !isAvailable}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                                                    transition-all duration-150
                                                    ${isCurrent
                                                            ? "bg-white/[0.08]"
                                                            : isAvailable
                                                                ? "hover:bg-white/[0.05] cursor-pointer"
                                                                : "opacity-30 cursor-not-allowed"
                                                        }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-medium text-[var(--foreground)] truncate">
                                                            {m.label}
                                                        </p>
                                                        <p className="text-[9px] text-[var(--muted)] opacity-60">{m.desc}</p>
                                                    </div>
                                                    {isCurrent && (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                    )}
                                                    {!isCurrent && isAvailable && (
                                                        <span className="text-[9px] text-[var(--muted)] opacity-50">Usar</span>
                                                    )}
                                                    {!status && (
                                                        <span className="text-[9px] text-[var(--muted)] opacity-30">?</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>

            {/* Input attachment lightbox */}
            <AnimatePresence>
                {previewLightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setPreviewLightbox(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative max-w-[90vw] max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewLightbox}
                                alt="Vista previa"
                                className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
                            />
                            <button
                                onClick={() => setPreviewLightbox(null)}
                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full
                                    bg-white/10 border border-white/20 backdrop-blur-md
                                    flex items-center justify-center
                                    hover:bg-white/20 transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/* ──────────── Chat Bubble Component ──────────── */

function ChatBubble({
    message,
    botName,
    isStreaming,
    index,
    userAvatarEmoji,
    userAvatarGradient,
}: {
    message: Message;
    botName: string;
    isStreaming?: boolean;
    index: number;
    userAvatarEmoji?: string | null;
    userAvatarGradient?: string | null;
}) {
    const isUser = message.role === "user";
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Download handler for PDFs
    const handleDownload = (base64Data: string, fileName: string, mimeType: string) => {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                className={`flex items-start gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : ""}`}
            >
                {/* Avatar */}
                {isUser ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${userAvatarGradient ? `bg-gradient-to-br ${userAvatarGradient}` : "bg-[var(--brand)]"}`}>
                        <span className="text-sm">{userAvatarEmoji || "👤"}</span>
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
                            ? "bg-[var(--brand)] rounded-tr-md"
                            : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-md"
                        }
                `}
                    style={isUser ? { color: '#ffffff' } : undefined}
                >
                    {isUser ? (
                        <div>
                            {/* Text content without the 📎 line */}
                            <p className="whitespace-pre-wrap">
                                {message.content.split("\n\n📎")[0]}
                            </p>
                            {/* Visual attachment previews */}
                            {message.attachmentPreviews && message.attachmentPreviews.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {message.attachmentPreviews.map((att, i) => (
                                        att.type === "image" && att.url ? (
                                            <button key={i}
                                                onClick={() => setLightboxImage(att.url)}
                                                className="block w-32 h-32 rounded-lg overflow-hidden border border-white/20
                                                hover:border-white/40 transition-all cursor-pointer
                                                hover:shadow-lg hover:scale-[1.02]">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={att.url} alt={att.name}
                                                    className="w-full h-full object-cover" />
                                            </button>
                                        ) : (
                                            <button key={i}
                                                onClick={() => {
                                                    // Extract base64 from data URI if available, otherwise just show name
                                                    const dataUriMatch = att.url?.match(/^data:([^;]+);base64,(.+)$/);
                                                    if (dataUriMatch) {
                                                        handleDownload(dataUriMatch[2], att.name, dataUriMatch[1]);
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg
                                                bg-white/10 border border-white/15
                                                hover:bg-white/20 transition-colors cursor-pointer">
                                                <FileText className="w-4 h-4 text-white/70" />
                                                <span className="text-xs text-white/80 truncate max-w-[120px]">{att.name}</span>
                                                <Download className="w-3 h-3 text-white/50" />
                                            </button>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="prose-chat">
                            <MarkdownContent
                                content={message.content}
                                onAddToCart={(data) => {
                                    // Will be handled by the ProductCard component
                                }}
                                onSearchSimilar={(query) => {
                                    // Will be handled by the ProductCard component
                                }}
                            />
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

            {/* Image Lightbox Modal */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setLightboxImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative max-w-[90vw] max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={lightboxImage}
                                alt="Vista ampliada"
                                className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
                            />
                            <button
                                onClick={() => setLightboxImage(null)}
                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full
                                    bg-white/10 border border-white/20 backdrop-blur-md
                                    flex items-center justify-center
                                    hover:bg-white/20 transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/* ──────────── Simple Markdown Renderer ──────────── */

interface ProductCardData {
    sku: string;
    name: string;
    cat: string;
    img: string;
    val: number;
}

function ProductCard({ data }: { data: ProductCardData }) {
    const { addToCart } = useCart();

    const handleAddToCart = () => {
        addToCart({
            sku: data.sku,
            nombre: data.name,
            valor: data.val || 0,
            imagen: data.img,
        });
    };

    const handleSearchSimilar = () => {
        const categoryParam = data.cat ? `?category=${encodeURIComponent(data.cat)}` : '';
        window.open(`/inventory${categoryParam}`, '_blank');
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                marginTop: "8px",
                marginBottom: "4px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
            }}
        >
            <div style={{ flexShrink: 0 }}>
                <p style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "4px",
                }}>
                    Producto
                </p>
                {data.img ? (
                    <img
                        src={data.img}
                        alt={data.name}
                        loading="lazy"
                        style={{
                            width: "100px",
                            height: "100px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            background: "var(--glass)",
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                ) : (
                    <div style={{
                        width: "100px",
                        height: "100px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--glass)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                        opacity: 0.4,
                    }}>
                        📦
                    </div>
                )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                <a
                    href={`/inventory?filterSku=${encodeURIComponent(data.sku)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--foreground)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                    title={`Ver "${data.name}" en inventario`}
                >
                    {data.name}
                    <span style={{
                        display: "inline-block",
                        marginLeft: "4px",
                        fontSize: "10px",
                        opacity: 0.5,
                        verticalAlign: "middle",
                    }}>↗</span>
                </a>
                <p style={{ fontSize: "10px", color: "var(--muted)" }}>
                    SKU: {data.sku}{data.cat ? ` · ${data.cat}` : ""}
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                        onClick={handleAddToCart}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            border: "none",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                            color: "white",
                            transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                        🛒 Agregar al carrito
                    </button>
                    <button
                        onClick={handleSearchSimilar}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            fontSize: "11px",
                            fontWeight: 500,
                            cursor: "pointer",
                            background: "var(--glass)",
                            color: "var(--foreground)",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--glass)")}
                    >
                        🔍 Ver similares
                    </button>
                </div>
            </div>
        </div>
    );
}

function MarkdownContent({ content }: {
    content: string;
    onAddToCart?: (data: ProductCardData) => void;
    onSearchSimilar?: (query: string) => void;
}) {
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
                // Separate list items that contain PRODUCT_CARD tags
                const pendingCards: ProductCardData[] = [];
                const cleanedItems = listItems.map(item => {
                    const cardMatches = item.match(/\[PRODUCT_CARD:\{.*?\}\]/g);
                    if (cardMatches) {
                        for (const match of cardMatches) {
                            try {
                                const jsonStr = match.match(/^\[PRODUCT_CARD:(.+)\]$/)?.[1];
                                if (jsonStr) pendingCards.push(JSON.parse(jsonStr));
                            } catch { /* skip */ }
                        }
                        return item.replace(/\[PRODUCT_CARD:\{.*?\}\]/g, '').trim();
                    }
                    return item;
                });
                elements.push(
                    <Tag key={key++} className={`${listType === "ul" ? "list-disc" : "list-decimal"} pl-5 my-1.5 space-y-0.5`}>
                        {cleanedItems.map((item, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
                        ))}
                    </Tag>
                );
                // Render any product cards that were embedded in list items
                for (const cardData of pendingCards) {
                    elements.push(<ProductCard key={key++} data={cardData} />);
                }
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
            // PRODUCT_CARD token: [PRODUCT_CARD:{json}]
            else if (/^\[PRODUCT_CARD:.+\]$/.test(line.trim())) {
                flushList();
                try {
                    const jsonStr = line.trim().match(/^\[PRODUCT_CARD:(.+)\]$/)?.[1];
                    if (jsonStr) {
                        const data: ProductCardData = JSON.parse(jsonStr);
                        elements.push(<ProductCard key={key++} data={data} />);
                    }
                } catch {
                    // If JSON parse fails, skip silently
                }
            }
            // ITEM_IMG token on its own line: [ITEM_IMG:url] (fallback)
            else if (/^\[ITEM_IMG:.+\]$/.test(line.trim())) {
                flushList();
                const imgUrl = line.trim().match(/^\[ITEM_IMG:(.+)\]$/)?.[1];
                if (imgUrl) {
                    elements.push(
                        <div key={key++} className="my-2">
                            <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                                Producto
                            </p>
                            <img
                                src={imgUrl}
                                alt="Imagen del producto"
                                loading="lazy"
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface)",
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        </div>
                    );
                }
            }
            // Image on its own line: ![alt](url)
            else if (/^!\[.*?\]\(.*?\)$/.test(line.trim())) {
                flushList();
                const match = line.trim().match(/^!\[(.*)\]\((.+)\)$/);
                if (match) {
                    elements.push(
                        <div key={key++} className="my-2">
                            <img
                                src={match[2]}
                                alt={match[1]}
                                loading="lazy"
                                style={{
                                    width: "120px",
                                    height: "120px",
                                    objectFit: "cover",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface)",
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        </div>
                    );
                }
            }
            // Paragraph (also extract inline PRODUCT_CARD tags)
            else {
                flushList();
                // Check if this line contains PRODUCT_CARD tags mixed with text
                const productCardMatches = line.match(/\[PRODUCT_CARD:\{.*?\}\]/g);
                if (productCardMatches && productCardMatches.length > 0) {
                    // Remove PRODUCT_CARD tags and render remaining text
                    const textWithout = line.replace(/\[PRODUCT_CARD:\{.*?\}\]/g, '').trim();
                    if (textWithout) {
                        elements.push(
                            <p key={key++} className="my-1" dangerouslySetInnerHTML={{ __html: inlineFormat(textWithout) }} />
                        );
                    }
                    // Render each PRODUCT_CARD as a component
                    for (const match of productCardMatches) {
                        try {
                            const jsonStr = match.match(/^\[PRODUCT_CARD:(.+)\]$/)?.[1];
                            if (jsonStr) {
                                const data: ProductCardData = JSON.parse(jsonStr);
                                elements.push(<ProductCard key={key++} data={data} />);
                            }
                        } catch { /* skip malformed cards */ }
                    }
                } else {
                    elements.push(
                        <p key={key++} className="my-1" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
                    );
                }
            }
        }

        flushList();
        return elements;
    };

    const inlineFormat = (text: string): string => {
        return text
            // [PRODUCT_CARD:{json}] tokens → render as small inline label (full card handled at line level)
            .replace(/\[PRODUCT_CARD:[^\]]+\]/g, '')
            // [ITEM_IMG:url] tokens → <img> thumbnail
            .replace(/\[ITEM_IMG:(.+?)\]/g, '<img src="$1" alt="Producto" loading="lazy" style="width:80px;height:80px;object-fit:cover;border-radius:8px;display:block;margin:6px 0;border:1px solid var(--border)" onerror="this.style.display=\'none\'" />')
            // Inline images ![alt](url) → <img> thumbnail
            .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" loading="lazy" style="width:64px;height:64px;object-fit:cover;border-radius:8px;display:inline-block;vertical-align:middle;margin:2px 4px;border:1px solid var(--border)" onerror="this.style.display=\'none\'" />')
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
