"use client";

import { useState } from "react";
import { Check, Cloud, Cpu, ExternalLink, Pencil, Plus, Radio, Server, ShieldCheck, Trash2, X } from "lucide-react";
import type { AIService } from "../types";

type Draft = Pick<AIService, "name" | "deployment" | "provider" | "baseUrl" | "model">;
const emptyDraft: Draft = { name: "", deployment: "local", provider: "ace-step", baseUrl: "http://127.0.0.1:8001", model: "acestep-v15-turbo" };

export default function AIServiceManager({ services, onChange, onDefaultChange, onToast }: {
  services: AIService[];
  onChange: (services: AIService[]) => void;
  onDefaultChange: (id: string) => void;
  onToast: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const openNew = () => { setEditingId(null); setDraft({ ...emptyDraft }); };
  const openEdit = (service: AIService) => {
    setEditingId(service.id);
    setDraft({ name: service.name, deployment: service.deployment, provider: service.provider, baseUrl: service.baseUrl, model: service.model });
  };
  const saveDraft = () => {
    if (!draft || !draft.name.trim() || !draft.baseUrl.trim() || !draft.model.trim()) return;
    const normalizedUrl = draft.baseUrl.trim().replace(/\/$/, "");
    if (editingId) {
      onChange(services.map((service) => service.id === editingId ? { ...service, ...draft, name: draft.name.trim(), baseUrl: normalizedUrl, model: draft.model.trim(), connection: "unknown" } : service));
      onToast("AI service updated");
    } else {
      const service: AIService = { ...draft, id: `ai-${Date.now()}`, name: draft.name.trim(), baseUrl: normalizedUrl, model: draft.model.trim(), enabled: true, isDefault: services.length === 0, connection: "unknown" };
      onChange([...services, service]);
      onToast("AI service added");
    }
    setDraft(null);
    setEditingId(null);
  };
  const makeDefault = (id: string) => {
    onChange(services.map((service) => ({ ...service, isDefault: service.id === id, enabled: service.id === id ? true : service.enabled })));
    onDefaultChange(id);
    onToast("Default generation service changed");
  };
  const toggleEnabled = (id: string) => {
    const target = services.find((service) => service.id === id);
    if (target?.isDefault && target.enabled) {
      onToast("Choose another default service before disabling this one");
      return;
    }
    onChange(services.map((service) => service.id === id ? { ...service, enabled: !service.enabled } : service));
  };
  const removeService = (service: AIService) => {
    if (services.length === 1) { onToast("Keep at least one AI service configured"); return; }
    if (service.isDefault) { onToast("Choose another default service before removing this one"); return; }
    onChange(services.filter((item) => item.id !== service.id));
    onToast(`${service.name} removed`);
  };
  const providerName = (provider: AIService["provider"]) => provider === "ace-step" ? "ACE-Step 1.5" : provider === "gemini-lyria" ? "Gemini · Lyria" : "Custom endpoint";
  const checkConnection = async (service: AIService) => {
    if (service.provider === "gemini-lyria") {
      onToast("Gemini requires a backend API key; the frontend cannot test it safely");
      return;
    }
    setCheckingId(service.id);
    try {
      const response = await fetch(`${service.baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      onChange(services.map((item): AIService => item.id === service.id ? { ...item, connection: "online" } : item));
      onToast(`${service.name} is reachable`);
    } catch {
      onChange(services.map((item): AIService => item.id === service.id ? { ...item, connection: "offline" } : item));
      onToast("Could not reach the service. Check that it is running and allows browser requests.");
    } finally {
      setCheckingId(null);
    }
  };

  const changeProvider = (provider: Draft["provider"]) => {
    if (!draft) return;
    if (provider === "gemini-lyria") setDraft({ ...draft, provider, deployment: "cloud", baseUrl: "https://generativelanguage.googleapis.com/v1beta/interactions", model: "lyria-3.5" });
    else if (provider === "ace-step") setDraft({ ...draft, provider, deployment: "local", baseUrl: "http://127.0.0.1:8001", model: "acestep-v15-turbo" });
    else setDraft({ ...draft, provider });
  };

  return <div className="page-content ai-services-page">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-icon"><Radio size={13} /></span> GENERATION SETUP / 生成設定</div><h1>AI services / AI サービス</h1><p>Choose where music generation runs and which service is used by default. / 生成先と既定のサービスを選びます。</p></div><button className="button button-primary" onClick={openNew}><Plus size={15} /> Add service / サービス追加</button></div>
    <div className="ai-service-intro"><span><ShieldCheck size={17} /></span><div><strong>Your service settings stay on this device / サービス設定はこの端末に保存されます</strong><p>This frontend prototype saves service addresses and model names in browser storage. Test connection calls <code>GET /health</code> from this browser, so the endpoint must allow CORS. API keys are not saved; cloud credentials need a backend secret store when the backend is implemented. / このフロントエンド試作では接続先とモデル名をブラウザーに保存します。API キーは保存せず、クラウド認証情報はバックエンドで管理します。</p></div></div>
    <div className="ai-service-list">{services.map((service) => <article className={`ai-service-card ${!service.enabled ? "disabled" : ""}`} key={service.id}>
      <div className="ai-service-card-head"><span className={`ai-service-icon ${service.deployment}`}>{service.deployment === "local" ? <Cpu size={19} /> : <Cloud size={19} />}</span><div className="ai-service-title"><div><h2>{service.name}</h2>{service.isDefault && <span className="ai-default-badge"><Check size={11} /> DEFAULT / 既定</span>}</div><p>{providerName(service.provider)} <span>·</span> {service.deployment === "local" ? "Runs on this machine / この端末で実行" : "Cloud service / クラウド"}</p></div><span className={`ai-connection ${service.connection}`}><i />{service.connection === "online" ? "Online / 接続済み" : service.connection === "offline" ? "Unreachable / 接続不可" : "Not checked / 未確認"}</span></div>
      <div className="ai-service-details"><div><small>ENDPOINT / エンドポイント</small><strong>{service.baseUrl}</strong></div><div><small>MODEL / モデル</small><strong>{service.model}</strong></div><div><small>TYPE / 種別</small><strong>{service.deployment === "local" ? "Local / ローカル" : "Cloud / クラウド"}</strong></div></div>
      {service.provider === "gemini-lyria" && <p className="ai-gemini-note">Gemini API key must be configured in the backend environment. This is a sample endpoint and is not called from the browser.</p>}
      <div className="ai-service-card-foot"><label className="ai-toggle"><input type="checkbox" checked={service.enabled} onChange={() => toggleEnabled(service.id)} /><span /><b>{service.enabled ? "Enabled / 有効" : "Disabled / 無効"}</b></label><div className="ai-service-actions"><button className="button button-quiet" onClick={() => void checkConnection(service)} disabled={checkingId === service.id}>{checkingId === service.id ? <span className="loading-spinner" /> : <Radio size={14} />} {service.provider === "gemini-lyria" ? "Backend check / 要バックエンド" : "Test connection / 接続テスト"}</button>{!service.isDefault && <button className="button button-quiet" onClick={() => makeDefault(service.id)}>Make default / 既定にする</button>}<button className="ai-icon-action" aria-label={`Edit ${service.name} / 編集`} onClick={() => openEdit(service)}><Pencil size={15} /></button><button className="ai-icon-action danger" aria-label={`Remove ${service.name} / 削除`} onClick={() => removeService(service)}><Trash2 size={15} /></button></div></div>
    </article>)}
      {!services.length && <div className="ai-empty"><Server size={23} /><strong>No AI services yet / AI サービスがありません</strong><p>Add an ACE-Step local server or a cloud service endpoint. / ACE-Step のローカルサーバーまたはクラウド接続先を追加します。</p><button className="button button-primary" onClick={openNew}><Plus size={14} /> Add service / 追加</button></div>}
    </div>
    <section className="ace-step-guide"><div className="ace-guide-icon"><Cpu size={18} /></div><div><span className="eyebrow">LOCAL OPTION / ローカル</span><h2>Run ACE-Step 1.5 on Ubuntu / Ubuntu で実行</h2><p>Start the ACE-Step API on your Ubuntu machine, then point the local service at <code>http://127.0.0.1:8001</code>. / Ubuntu で ACE-Step API を起動し、ローカル接続先を指定します。</p><pre><code>uv run acestep-api</code></pre><a href="https://github.com/ace-step/ACE-Step-1.5" target="_blank" rel="noreferrer">Setup and hardware guide / 導入・ハードウェアガイド <ExternalLink size={13} /></a></div></section>

    {draft && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}><section className="modal-card ai-service-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
      <div className="modal-heading"><div><span className="modal-icon"><Server size={17} /></span><span><strong id="ai-modal-title">{editingId ? "Edit AI service / AI サービス編集" : "Add AI service / AI サービス追加"}</strong><small>Configure a local or hosted music generation endpoint. / ローカルまたはクラウドの生成先を設定します。</small></span></div><button onClick={() => setDraft(null)} aria-label="Close / 閉じる"><X size={18} /></button></div>
      <div className="ai-form-grid"><label>SERVICE NAME / サービス名<input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. ACE-Step on Ubuntu" /></label><label>RUNS ON / 実行環境<select value={draft.deployment} onChange={(event) => setDraft({ ...draft, deployment: event.target.value as Draft["deployment"] })}><option value="local">This machine (local) / ローカル</option><option value="cloud">Cloud endpoint / クラウド</option></select></label><label>PROVIDER / プロバイダー<select value={draft.provider} onChange={(event) => changeProvider(event.target.value as Draft["provider"])}><option value="ace-step">ACE-Step 1.5</option><option value="gemini-lyria">Gemini · Lyria 3.5</option><option value="custom">Custom API / カスタム API</option></select></label><label>MODEL / モデル<input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="acestep-v15-turbo" /></label><label className="full">API ENDPOINT / API エンドポイント<input type="url" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="http://127.0.0.1:8001" /></label></div>
      <div className="ai-secret-note"><ShieldCheck size={15} /><span>Credentials are not collected in this prototype. Add cloud API keys on the backend, never in browser storage. / この試作では認証情報を入力しません。クラウド API キーはブラウザーに保存せず、バックエンドに設定してください。</span></div>
      <div className="modal-actions"><button onClick={() => setDraft(null)}>Cancel / キャンセル</button><button className="button button-primary" disabled={!draft.name.trim() || !draft.baseUrl.trim() || !draft.model.trim()} onClick={saveDraft}>{editingId ? "Save changes / 保存" : "Add service / 追加"}</button></div>
    </section></div>}
  </div>;
}
