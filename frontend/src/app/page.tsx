"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface Notebook {
  id: string;
  name: string;
  filenames: string[];
  total_chunks: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [status, setStatus] = useState<string>("Connessione...");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);
  
  // MODALITÀ STUDIO / ESAME
  const [studyMode, setStudyMode] = useState<"study" | "exam">("study");

  // RINOMINA NOTEBOOK
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (activeNotebook) {
      setTempName(activeNotebook.name);
      setIsEditingName(false);
      const savedChat = localStorage.getItem(`chat_history_${activeNotebook.id}`);
      if (savedChat) {
        try {
          setMessages(JSON.parse(savedChat));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [activeNotebook]);

  useEffect(() => {
    if (activeNotebook && messages.length > 0) {
      localStorage.setItem(`chat_history_${activeNotebook.id}`, JSON.stringify(messages));
    }
  }, [messages, activeNotebook]);

  const fetchNotebooks = async (selectId?: string) => {
    try {
      const res = await fetch("http://localhost:8000/api/notebooks");
      const data: Notebook[] = await res.json();
      setNotebooks(data);

      if (selectId) {
        const found = data.find((n) => n.id === selectId);
        if (found) setActiveNotebook(found);
      } else if (data.length > 0 && !activeNotebook) {
        setActiveNotebook(data[0]);
      }
    } catch (e) {
      console.error("Errore recupero notebook", e);
    }
  };

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then(() => {
        setStatus("Online");
        fetchNotebooks();
      })
      .catch(() => setStatus("Offline"));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectNotebook = (nb: Notebook) => {
    if (loading) handleStop();
    setActiveNotebook(nb);
  };

  const handleNewNotebookClick = () => {
    if (loading) handleStop();
    setActiveNotebook(null);
    setMessages([]);
    setIsSourcesModalOpen(false);
    if (!isSidebarOpen) setIsSidebarOpen(true);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: updated[lastIdx].content + "\n\n*[Interrotto]*"
          };
        }
        return updated;
      });
    }
  };

  const handleSaveRename = async () => {
    if (!activeNotebook || !tempName.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/notebooks/${activeNotebook.id}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_name: tempName.trim() })
      });
      if (!res.ok) throw new Error("Rinomina fallita");
      const data = await res.json();
      
      setActiveNotebook((prev) => prev ? { ...prev, name: data.name } : null);
      setIsEditingName(false);
      fetchNotebooks(activeNotebook.id);
    } catch (e) {
      alert("Errore durante la rinomina del quaderno.");
    }
  };

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Sei sicuro di voler eliminare l'intero quaderno?")) return;
    try {
      await fetch(`http://localhost:8000/api/notebooks/${id}`, { method: "DELETE" });
      localStorage.removeItem(`chat_history_${id}`);
      if (activeNotebook?.id === id) {
        setActiveNotebook(null);
        setMessages([]);
        setIsSourcesModalOpen(false);
      }
      fetchNotebooks();
    } catch (e) {
      alert("Errore durante l'eliminazione.");
    }
  };

  const handleDeleteSingleFile = async (fname: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeNotebook) return;
    if (!confirm(`Rimuovere il file "${fname}"?`)) return;

    try {
      await fetch(`http://localhost:8000/api/notebooks/${activeNotebook.id}/files/${encodeURIComponent(fname)}`, {
        method: "DELETE"
      });
      fetchNotebooks(activeNotebook.id);
    } catch (e) {
      alert("Errore durante la rimozione.");
    }
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    let mdContent = `# ${activeNotebook ? activeNotebook.name : "Appunti AI"}\n\n`;
    messages.forEach((m) => {
      const title = m.role === "user" ? "### 👤 Tu" : "### 🧠 Qwen 2.5";
      mdContent += `${title}\n${m.content}\n\n---\n\n`;
    });
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeNotebook ? activeNotebook.name.replace(/\s+/g, '_') : "appunti"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAutoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    if (activeNotebook) formData.append("notebook_id", activeNotebook.id);

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Errore upload");
      const data = await res.json();
      await fetchNotebooks(data.id);
    } catch (error) {
      alert("Errore durante il caricamento del PDF.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const sendToBackend = async (textToSend: string, currentHistory: Message[]) => {
    setLoading(true);

    const updatedHistory = [...currentHistory, { role: "user" as const, content: textToSend }];
    setMessages([...updatedHistory, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: textToSend,
          notebook_id: activeNotebook ? activeNotebook.id : "",
          history: currentHistory,
          mode: studyMode
        }),
      });

      if (!res.ok || !res.body) throw new Error("Errore server");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + chunk };
          return [...updated];
        });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = "Errore di connessione.";
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const userMsg = prompt;
    setPrompt("");
    sendToBackend(userMsg, messages);
  };

  const handleRegenerate = () => {
    if (messages.length < 2 || loading) return;
    const historyWithoutLastAssistant = messages.slice(0, messages.length - 1);
    const lastUserMsg = messages[messages.length - 2].content;
    setMessages(historyWithoutLastAssistant);
    sendToBackend(lastUserMsg, historyWithoutLastAssistant.slice(0, historyWithoutLastAssistant.length - 1));
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0b0f19", color: "#e2e8f0", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      
      {/* SIDEBAR */}
      <aside style={{ 
        width: isSidebarOpen ? "280px" : "0px", 
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: "#111827", 
        borderRight: isSidebarOpen ? "1px solid #1f2937" : "none",
        flexShrink: 0,
        overflow: "hidden",
        zIndex: 20
      }}>
        <div style={{ width: "280px", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "1.5rem 1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700", margin: "0 0 1.25rem 0", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.4rem" }}>🧠</span> Workspace
            </h2>

            <button
              onClick={handleNewNotebookClick}
              style={{ width: "100%", padding: "0.85rem", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "#fff", fontWeight: "600", cursor: "pointer", transition: "0.2s", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
              Nuovo Quaderno
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 1.25rem" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", fontWeight: "700", marginBottom: "0.75rem" }}>
              I tuoi appunti
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {notebooks.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#4b5563", fontStyle: "italic" }}>Nessun quaderno creato.</p>
              ) : (
                notebooks.map((nb) => {
                  const isActive = activeNotebook?.id === nb.id;
                  return (
                    <div
                      key={nb.id}
                      onClick={() => handleSelectNotebook(nb)}
                      style={{
                        padding: "0.75rem", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                        backgroundColor: isActive ? "#1f2937" : "transparent",
                        color: isActive ? "#fff" : "#9ca3af",
                        transition: "background-color 0.2s"
                      }}
                      onMouseOver={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = "#1f293780" }}
                      onMouseOut={(e) => { if(!isActive) e.currentTarget.style.backgroundColor = "transparent" }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: isActive ? "600" : "500" }}>{nb.name}</div>
                        <div style={{ fontSize: "0.75rem", color: isActive ? "#9ca3af" : "#6b7280", marginTop: "2px" }}>
                          {nb.filenames.length} file • {nb.total_chunks} chunk
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotebook(nb.id, e)}
                        style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "4px", borderRadius: "4px" }}
                        onMouseOver={(e) => e.currentTarget.style.color = "#ef4444"}
                        onMouseOut={(e) => e.currentTarget.style.color = "#6b7280"}
                        title="Elimina Notebook"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #1f2937", fontSize: "0.75rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", color: status === "Online" ? "#10b981" : "#ef4444" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: status === "Online" ? "#10b981" : "#ef4444" }}></div>
            Backend {status}
          </div>
        </div>
      </aside>

      {/* AREA PRINCIPALE */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minWidth: 0 }}>
        
        {/* HEADER */}
        <header style={{ padding: "1.25rem 2rem", borderBottom: "1px solid #1f2937", backgroundColor: "rgba(11, 15, 25, 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", transition: "0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1f2937"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              title="Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            </button>

            {/* TITOLO ED EDITING NOME NOTEBOOK */}
            {activeNotebook && isEditingName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  autoFocus
                  style={{ backgroundColor: "#1f2937", border: "1px solid #3b82f6", color: "#fff", fontSize: "1.1rem", fontWeight: "600", borderRadius: "6px", padding: "4px 8px", outline: "none" }}
                />
                <button onClick={handleSaveRename} style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", fontSize: "1.1rem", padding: "2px 6px" }} title="Salva">✓</button>
                <button onClick={() => setIsEditingName(false)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.1rem", padding: "2px 6px" }} title="Annulla">✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <h1 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeNotebook ? activeNotebook.name : "Nuovo Quaderno"}
                </h1>
                {activeNotebook && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" }}
                    onMouseOver={(e) => e.currentTarget.style.color = "#60a5fa"}
                    onMouseOut={(e) => e.currentTarget.style.color = "#6b7280"}
                    title="Rinomina Quaderno"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            
            {/* TOGGLE MODALITÀ STUDIO / ESAME */}
            {activeNotebook && (
              <div style={{ display: "flex", backgroundColor: "#1f2937", borderRadius: "8px", padding: "3px", border: "1px solid #374151" }}>
                <button
                  onClick={() => setStudyMode("study")}
                  style={{ padding: "4px 10px", borderRadius: "6px", border: "none", backgroundColor: studyMode === "study" ? "#2563eb" : "transparent", color: studyMode === "study" ? "#fff" : "#9ca3af", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", transition: "0.2s" }}
                >
                  📖 Studio
                </button>
                <button
                  onClick={() => setStudyMode("exam")}
                  style={{ padding: "4px 10px", borderRadius: "6px", border: "none", backgroundColor: studyMode === "exam" ? "#dc2626" : "transparent", color: studyMode === "exam" ? "#fff" : "#9ca3af", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", transition: "0.2s" }}
                >
                  🎓 Esame
                </button>
              </div>
            )}

            {activeNotebook && (
              <button onClick={() => setIsSourcesModalOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.5rem 1rem", borderRadius: "8px", backgroundColor: "#1e293b", color: "#60a5fa", fontSize: "0.85rem", fontWeight: "600", border: "1px solid #3b82f640", cursor: "pointer", transition: "0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#334155"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#1e293b"}
              >
                📚 Fonti ({activeNotebook.filenames.length})
              </button>
            )}

            {messages.length > 0 && (
              <button onClick={handleExportMarkdown} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.5rem 1rem", borderRadius: "8px", backgroundColor: "transparent", color: "#9ca3af", fontSize: "0.85rem", fontWeight: "600", border: "1px solid #374151", cursor: "pointer", transition: "0.2s" }}
                onMouseOver={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#4b5563"; }}
                onMouseOut={(e) => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.borderColor = "#374151"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m7-7l5 5 5-5m-5 5V3"/></svg>
                Esporta .md
              </button>
            )}
          </div>
        </header>

        {/* CHAT AREA */}
        <section style={{ flex: 1, padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          
          {!activeNotebook ? (
            <div style={{ margin: "auto", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "500px", width: "100%", padding: "2rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📚</div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#f8fafc", fontSize: "1.5rem", fontWeight: "700" }}>Crea un nuovo Quaderno</h3>
              <p style={{ margin: "0 0 2rem 0", color: "#94a3b8", textAlign: "center" }}>Carica il tuo primo PDF per iniziare a studiare. L'IA analizzerà il documento per rispondere alle tue domande.</p>
              
              <label style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", border: "2px dashed #4b5563", borderRadius: "16px", cursor: uploading ? "wait" : "pointer", backgroundColor: "#111827", transition: "all 0.2s ease" }}
                     onMouseOver={(e) => !uploading && (e.currentTarget.style.borderColor = "#3b82f6", e.currentTarget.style.backgroundColor = "#1e293b")}
                     onMouseOut={(e) => !uploading && (e.currentTarget.style.borderColor = "#4b5563", e.currentTarget.style.backgroundColor = "#111827")}>
                <span style={{ fontSize: "2rem", marginBottom: "12px" }}>{uploading ? "⏳" : "📥"}</span>
                <span style={{ color: "#e2e8f0", fontWeight: "600", fontSize: "1.1rem", marginBottom: "4px" }}>
                  {uploading ? "Indicizzazione in corso..." : "Clicca per caricare un PDF"}
                </span>
                {!uploading && <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Solo file .pdf supportati</span>}
                <input type="file" accept=".pdf" style={{ display: "none" }} onChange={handleAutoUpload} disabled={uploading} />
              </label>
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "2rem" }}>
              {messages.length === 0 ? (
                <div style={{ margin: "auto", textAlign: "center", paddingTop: "15vh", color: "#6b7280" }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "#e2e8f0", fontSize: "1.2rem" }}>Quaderno pronto</h3>
                  <p style={{ margin: 0, fontSize: "0.95rem" }}>
                    {studyMode === "exam" ? "Modalità **Esame** attiva: fai una domanda per farti interrogare." : "Fai una domanda o chiedi un riassunto dei tuoi documenti."}
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", width: "100%" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: msg.role === "user" ? "#94a3b8" : "#3b82f6", marginBottom: "6px", marginLeft: msg.role === "user" ? "0" : "4px", marginRight: msg.role === "user" ? "4px" : "0" }}>
                      {msg.role === "user" ? "Tu" : studyMode === "exam" ? "🎓 Docente (Esame)" : "Qwen 2.5 (Assistente)"}
                    </div>
                    
                    <div style={{
                      maxWidth: "85%", padding: "1rem 1.25rem", borderRadius: "16px",
                      borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                      borderBottomLeftRadius: msg.role === "assistant" ? "4px" : "16px",
                      backgroundColor: msg.role === "user" ? "#2563eb" : "#1f2937",
                      color: msg.role === "user" ? "#fff" : "#e2e8f0",
                      lineHeight: "1.6", fontSize: "0.95rem", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}>
                      {msg.role === "assistant" ? (
                        <ReactMarkdown components={{ p: ({node, ...props}) => <p style={{ margin: "0 0 0.75rem 0" }} {...props} />, ul: ({node, ...props}) => <ul style={{ margin: "0 0 1rem 1.5rem", padding: 0 }} {...props} />, li: ({node, ...props}) => <li style={{ marginBottom: "0.25rem" }} {...props} /> }}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                      )}
                    </div>

                    {msg.role === "assistant" && index === messages.length - 1 && !loading && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "6px", marginLeft: "4px" }}>
                        <button onClick={() => navigator.clipboard.writeText(msg.content)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", padding: "2px 6px", borderRadius: "4px" }} onMouseOver={(e) => e.currentTarget.style.color = "#fff"} onMouseOut={(e) => e.currentTarget.style.color = "#9ca3af"}>
                          📋 Copia
                        </button>
                        <button onClick={handleRegenerate} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", padding: "2px 6px", borderRadius: "4px" }} onMouseOver={(e) => e.currentTarget.style.color = "#fff"} onMouseOut={(e) => e.currentTarget.style.color = "#9ca3af"}>
                          🔄 Rigenera
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </section>

        {/* INPUT BAR */}
        <div style={{ padding: "1.5rem 2rem", backgroundColor: "#0b0f19", borderTop: "1px solid #1f2937", display: "flex", justifyContent: "center" }}>
          <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "800px", position: "relative", display: "flex", alignItems: "flex-end", backgroundColor: "#1f2937", borderRadius: "16px", border: "1px solid #374151", padding: "0.5rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
            <textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder={studyMode === "exam" ? "Rispondi al professore..." : (activeNotebook ? "Chiedi qualcosa sui documenti..." : "Crea prima un quaderno...")}
              disabled={!activeNotebook}
              style={{ flex: 1, padding: "0.75rem 1rem", minHeight: "24px", maxHeight: "150px", backgroundColor: "transparent", border: "none", color: "#f8fafc", fontSize: "1rem", resize: "none", outline: "none", fontFamily: "inherit" }}
              rows={1}
            />
            <div style={{ padding: "4px 8px 4px 0" }}>
              {loading ? (
                <button type="button" onClick={handleStop} style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#ef4444", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
              ) : (
                <button type="submit" disabled={!prompt.trim() || !activeNotebook} style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: prompt.trim() && activeNotebook ? "#2563eb" : "#374151", color: prompt.trim() && activeNotebook ? "#fff" : "#9ca3af", border: "none", cursor: prompt.trim() && activeNotebook ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* MODALE FONTI */}
        {isSourcesModalOpen && activeNotebook && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(11, 15, 25, 0.7)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div style={{ width: "100%", maxWidth: "550px", backgroundColor: "#111827", borderRadius: "16px", border: "1px solid #374151", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1f2937" }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: "700" }}>Gestione Fonti: {activeNotebook.name}</h2>
                <button onClick={() => setIsSourcesModalOpen(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }} title="Chiudi">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.75rem" }}>Documenti Inclusi ({activeNotebook.filenames.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
                    {activeNotebook.filenames.length === 0 ? (
                      <p style={{ color: "#64748b", fontSize: "0.9rem", fontStyle: "italic", margin: 0 }}>Nessun documento.</p>
                    ) : (
                      activeNotebook.filenames.map((fname, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", backgroundColor: "#1f2937", borderRadius: "8px", border: "1px solid #374151" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                            <span style={{ fontSize: "1.2rem" }}>📄</span>
                            <span style={{ fontSize: "0.95rem", color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{fname}</span>
                          </div>
                          <button onClick={(e) => handleDeleteSingleFile(fname, e)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex" }} title="Rimuovi file">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-6v6"/></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.75rem" }}>Aggiungi nuovo file</div>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", border: "2px dashed #4b5563", borderRadius: "8px", cursor: uploading ? "wait" : "pointer", backgroundColor: "#1f2937", transition: "0.2s" }}>
                    <span style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{uploading ? "⏳" : "📥"}</span>
                    <span style={{ color: "#e2e8f0", fontWeight: "600", fontSize: "0.95rem" }}>{uploading ? "Caricamento in corso..." : "Trascina qui o clicca per caricare un PDF"}</span>
                    <input type="file" accept=".pdf" style={{ display: "none" }} onChange={handleAutoUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}