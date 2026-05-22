import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Bell,
  Calendar,
  Check,
  Copy,
  CreditCard,
  LogOut,
  Plus,
  Receipt,
  Send,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';

const CATEGORIES = {
  makan: { icon: '🍜', label: 'Makan' },
  trip: { icon: '✈️', label: 'Trip' },
  house: { icon: '🏠', label: 'House' },
  sports: { icon: '⚽', label: 'Sports' },
  event: { icon: '🎉', label: 'Event' },
};

const storage = {
  async get(key, fallback) {
    try {
      const api = window.storage;
      const raw = api?.getItem ? await api.getItem(key) : localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  async set(key, value) {
    const raw = JSON.stringify(value);
    try {
      const api = window.storage;
      if (api?.setItem) await api.setItem(key, raw);
      else localStorage.setItem(key, raw);
    } catch {
      localStorage.setItem(key, raw);
    }
  },
  async remove(key) {
    try {
      const api = window.storage;
      if (api?.removeItem) await api.removeItem(key);
      else localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const rm = (value) => `RM ${Number(value || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });
};
const getParticipantLink = (billId, participantId) => {
  const base = window.location.href.split('#')[0];
  return `${base}#/pay/${billId}/${participantId}`;
};
const isOverdue = (dueDate, paid) => !paid && dueDate && new Date(`${dueDate}T23:59:59`) < new Date();
const hashToRoute = () => window.location.hash.replace(/^#/, '') || '/';
const go = (path) => { window.location.hash = path; };

function injectStyles() {
  if (document.getElementById('bayar-styles')) return;
  const style = document.createElement('style');
  style.id = 'bayar-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:ital,wght@0,300;0,400;0,500&family=Outfit:wght@300;400;500;600&display=swap');
    :root {
      --ink:     #0F0F0F;
      --paper:   #F5F3EE;
      --rule:    #1A1A1A;
      --muted:   #888880;
      --accent:  #1A2B4A;
      --green:   #1A6B45;
      --amber:   #B45309;
      --surface: #FFFFFF;
      --line:    #D8D4CC;
    }
    * { border-radius: 0 !important; box-shadow: none !important; box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font-family: 'Outfit', sans-serif; }
    button, input, textarea, select { font: inherit; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
    @keyframes fillBar { from { width: 0%; } to { width: 100%; } }

    .container { width: min(1200px, 100%); margin: 0 auto; padding: 0 48px; }
    .btn-action { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); border: 1.5px solid var(--line); padding: 7px 14px; background: transparent; cursor: pointer; }
    .btn-action:hover { border-color: var(--ink); color: var(--ink); }

    .nav { height: 70px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid var(--rule); padding: 0 48px; }
    .nav-logo { font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 500; cursor: pointer; }
    .nav-links { display: flex; align-items: center; gap: 32px; }
    .btn-nav-login { text-transform: uppercase; letter-spacing: 0.15em; font-size: 12px; color: var(--ink); border: none; background: none; cursor: pointer; }
    .btn-nav-started { text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; background: var(--accent); color: #fff; padding: 12px 28px; border: none; cursor: pointer; }

    .hero { display: grid; grid-template-columns: 55% 45%; border-bottom: 1.5px solid var(--rule); min-height: 580px; align-items: stretch; }
    .hero-left { padding: 72px 48px; border-right: 1.5px solid var(--rule); display: flex; flex-direction: column; justify-content: center; }
    .hero-right { padding: 48px; display: flex; align-items: center; justify-content: center; }
    .hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); margin-bottom: 28px; animation: fadeUp 0.4s 0.0s ease both; }
    .hero-headline { font-family: 'DM Serif Display', serif; font-size: 64px; line-height: 1.05; letter-spacing: -0.02em; margin-bottom: 28px; animation: fadeUp 0.5s 0.1s ease both; }
    .hero-subtext { font-size: 16px; color: var(--muted); line-height: 1.7; max-width: 400px; margin-bottom: 40px; animation: fadeUp 0.5s 0.2s ease both; }
    .hero-cta { display: flex; gap: 16px; align-items: center; animation: fadeUp 0.5s 0.3s ease both; }
    .btn-cta-main { background: var(--accent); color: #fff; padding: 14px 32px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; border: none; cursor: pointer; }
    .btn-cta-secondary { background: transparent; color: var(--ink); border: 1.5px solid var(--ink); padding: 14px 32px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; cursor: pointer; }

    .receipt-card { background: var(--surface); border: 2px solid var(--rule); padding: 28px 32px; width: 100%; max-width: 400px; animation: fadeUp 0.6s 0.2s ease both; }
    .receipt-header { display: flex; justify-content: space-between; border-bottom: 1.5px solid var(--rule); padding-bottom: 14px; margin-bottom: 20px; }
    .receipt-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); }
    .receipt-date { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
    .bill-name { font-family: 'DM Serif Display', serif; font-size: 26px; margin-bottom: 4px; }
    .bill-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 24px; }
    .participant-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 0; border-bottom: 1px solid var(--line); }
    .participant-name { font-size: 14px; }
    .participant-amount { font-family: 'DM Mono', monospace; font-size: 14px; }
    .badge-paid { background: var(--accent); color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; padding: 3px 8px; }
    .badge-pending { border: 1.5px solid var(--amber); color: var(--amber); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; padding: 3px 8px; }
    .total-row { display: flex; justify-content: space-between; border-top: 2px solid var(--rule); padding-top: 16px; margin-top: 4px; }
    .total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
    .total-amount { font-family: 'DM Mono', monospace; font-size: 24px; font-weight: 500; color: var(--ink); }
    .btn-share { width: 100%; background: var(--accent); color: #fff; border: none; padding: 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 20px; cursor: pointer; }
    
    .category-strip { border-top: 1.5px solid var(--rule); border-bottom: 1.5px solid var(--rule); padding: 18px 48px; display: flex; align-items: center; gap: 28px; }
    .category-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); }
    .category-divider { width: 1px; height: 14px; background: var(--line); }
    .category-items { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink); }

    .footer { border-top: 1.5px solid var(--rule); padding: 24px 48px; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; }
    .footer-nav { display: flex; gap: 28px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
    .footer-copyright { font-size: 10px; color: var(--muted); letter-spacing: 0.08em; }

    .section-header { width: 100%; border-top: 2px solid var(--rule); border-bottom: 1px solid var(--line); padding: 20px 48px; display: flex; justify-content: space-between; align-items: center; }
    .section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); }
    .section-count { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
    
    .how-it-works-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 2px solid var(--rule); }
    .step-col { padding: 48px; display: flex; flex-direction: column; border-right: 1px solid var(--line); }
    .step-col:last-child { border-right: none; }
    .step-num { font-family: 'DM Serif Display', serif; font-size: 80px; line-height: 1; color: var(--line); margin-bottom: 24px; }
    .step-title { font-family: 'DM Serif Display', serif; font-size: 24px; color: var(--ink); margin-bottom: 12px; }
    .step-desc { font-size: 14px; color: var(--muted); line-height: 1.7; }
    .step-label { margin-top: auto; padding-top: 32px; border-top: 1px solid var(--line); font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); }
    
    .features-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 2px solid var(--rule); }
    .feature-cell { padding: 48px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .feature-cell:nth-child(2n) { border-right: none; }
    .feature-cell:nth-child(n+3) { border-bottom: none; }
    .feature-tag { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 16px; }
    .feature-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: var(--ink); margin-bottom: 12px; }
    .feature-desc { font-size: 14px; color: var(--muted); line-height: 1.7; max-width: 360px; }
    
    .cta-banner { padding: 64px 48px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--rule); }
    .cta-banner-left h2 { font-family: 'DM Serif Display', serif; font-size: 36px; color: var(--ink); margin: 8px 0 0; }
    .cta-banner-left .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); margin-bottom: 8px; }
    .btn-cta-banner { background: var(--accent); color: #fff; padding: 14px 36px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; border: none; cursor: pointer; }

    .step-col, .feature-cell, .cta-banner { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
    .step-col.visible, .feature-cell.visible, .cta-banner.visible { opacity: 1; transform: translateY(0); }
    .step-col:nth-child(2) { transition-delay: 0.1s; }
    .step-col:nth-child(3) { transition-delay: 0.2s; }
    .feature-cell:nth-child(2) { transition-delay: 0.1s; }
    .feature-cell:nth-child(3) { transition-delay: 0.1s; }
    .feature-cell:nth-child(4) { transition-delay: 0.2s; }

    .auth-page { display: grid; grid-template-columns: 45% 55%; min-height: 100vh; background: var(--paper); }
    .form-panel { padding: 64px 56px; display: flex; flex-direction: column; justify-content: center; background: var(--surface); border-right: 2px solid var(--rule); }
    .form-header { border-bottom: 1px solid var(--line); padding-bottom: 20px; margin-bottom: 48px; }
    .form-brand { font-size: 12px; text-transform: uppercase; letter-spacing: 0.25em; color: var(--ink); }
    .page-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); margin-bottom: 12px; animation: fadeUp 0.4s ease both; }
    .form-heading { font-family: 'DM Serif Display', serif; font-size: 40px; color: var(--ink); margin-bottom: 8px; animation: fadeUp 0.4s 0.1s ease both; }
    .form-subtext { font-size: 14px; color: var(--muted); margin-bottom: 40px; animation: fadeUp 0.4s 0.15s ease both; }
    
    .field-wrap { margin-bottom: 20px; animation: fadeUp 0.4s 0.2s ease both; }
    .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 8px; display: block; }
    .input-auth { width: 100%; border: 1.5px solid var(--line); padding: 13px 16px; font-size: 14px; color: var(--ink); background: var(--paper); outline: none; transition: border-color 150ms ease; }
    .input-auth:focus { border-color: var(--ink); background: var(--surface); }
    
    .btn-auth { margin-top: 32px; width: 100%; background: var(--accent); color: #fff; border: none; padding: 15px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; animation: fadeUp 0.4s 0.25s ease both; }
    .btn-auth:hover { opacity: 0.85; transition: 150ms; }
    .toggle-link { margin-top: 20px; text-align: center; font-size: 13px; color: var(--muted); }
    .toggle-link button { background: none; border: none; color: var(--ink); cursor: pointer; font-size: 13px; text-decoration: underline; }
    
    .right-panel { background: var(--accent); padding: 64px 56px; display: flex; flex-direction: column; justify-content: space-between; position: sticky; top: 0; height: 100vh; animation: fadeUp 0.6s 0.1s ease both; }
    .right-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em; color: rgba(255,255,255,0.4); margin-bottom: 48px; }
    /* Animations */
    .step-col, .feature-cell, .cta-banner { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
    .step-col.visible, .feature-cell.visible, .cta-banner.visible { opacity: 1; transform: translateY(0); }
    .step-col:nth-child(2) { transition-delay: 0.1s; }
    .step-col:nth-child(3) { transition-delay: 0.2s; }
    .feature-cell:nth-child(2) { transition-delay: 0.1s; }
    .feature-cell:nth-child(3) { transition-delay: 0.1s; }
    .feature-cell:nth-child(4) { transition-delay: 0.2s; }

    .auth-page { display: grid; grid-template-columns: 45% 55%; min-height: 100vh; background: var(--paper); }
    .form-panel { padding: 64px 56px; display: flex; flex-direction: column; justify-content: center; background: var(--surface); border-right: 2px solid var(--rule); }
    .form-header { border-bottom: 1px solid var(--line); padding-bottom: 20px; margin-bottom: 48px; }
    .form-brand { font-size: 12px; text-transform: uppercase; letter-spacing: 0.25em; color: var(--ink); }
    .page-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); margin-bottom: 12px; animation: fadeUp 0.4s ease both; }
    .form-heading { font-family: 'DM Serif Display', serif; font-size: 40px; color: var(--ink); margin-bottom: 8px; animation: fadeUp 0.4s 0.1s ease both; }
    .form-subtext { font-size: 14px; color: var(--muted); margin-bottom: 40px; animation: fadeUp 0.4s 0.15s ease both; }
    
    .field-wrap { margin-bottom: 20px; animation: fadeUp 0.4s 0.2s ease both; }
    .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 8px; display: block; }
    .input-auth { width: 100%; border: 1.5px solid var(--line); padding: 13px 16px; font-size: 14px; color: var(--ink); background: var(--paper); outline: none; transition: border-color 150ms ease; }
    .input-auth:focus { border-color: var(--ink); background: var(--surface); }
    
    .btn-auth { margin-top: 32px; width: 100%; background: var(--accent); color: #fff; border: none; padding: 15px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; animation: fadeUp 0.4s 0.25s ease both; }
    .btn-auth:hover { opacity: 0.85; transition: 150ms; }
    .toggle-link { margin-top: 20px; text-align: center; font-size: 13px; color: var(--muted); }
    .toggle-link button { background: none; border: none; color: var(--ink); cursor: pointer; font-size: 13px; text-decoration: underline; }
    
    .right-panel { background: var(--accent); padding: 64px 56px; display: flex; flex-direction: column; justify-content: space-between; position: sticky; top: 0; height: 100vh; animation: fadeUp 0.6s 0.1s ease both; }
    .right-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em; color: rgba(255,255,255,0.4); margin-bottom: 48px; }
    .right-heading { font-family: 'DM Serif Display', serif; font-size: 56px; line-height: 1.1; color: #fff; }
    .right-desc { border-top: 1px solid rgba(255,255,255,0.2); padding-top: 24px; margin-top: 32px; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7; }
    .stats-strip { border-top: 1px solid rgba(255,255,255,0.15); padding-top: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
    .stat-val { font-family: 'DM Mono', monospace; font-size: 22px; color: #fff; font-weight: 500; }
    .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.5); margin-top: 4px; }
    
    .error-msg { border-left: 3px solid #991B1B; padding: 10px 14px; background: #FFF5F5; font-size: 13px; color: #991B1B; margin-bottom: 20px; }
    
    /* Dashboard Styles */
    .dashboard-page { background: var(--paper); min-height: 100vh; }
    .dash-nav { background: var(--paper); border-bottom: 2px solid var(--rule); padding: 20px 48px; display: flex; justify-content: space-between; align-items: center; }
    .dash-nav-logo { font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--ink); cursor: pointer; }
    .dash-nav-right { display: flex; gap: 24px; align-items: center; }
    .dash-nav-link { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); }
    .dash-nav-divider { width: 1px; height: 14px; background: var(--line); }
    .dash-nav-logout { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #991B1B; border: 1.5px solid #991B1B; padding: 8px 18px; cursor: pointer; transition: 150ms; background: transparent; }
    .dash-nav-logout:hover { background: #991B1B; color: #fff; }

    .dash-header { padding: 48px 48px 32px 48px; border-bottom: 2px solid var(--rule); display: flex; justify-content: space-between; align-items: flex-end; animation: fadeUp 0.4s ease both; }
    .dash-header-left .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); margin-bottom: 8px; }
    .dash-header-left .title { font-family: 'DM Serif Display', serif; font-size: 52px; color: var(--ink); line-height: 1; }
    .dash-header-right { display: flex; flex-direction: column; align-items: center; }
    .btn-new-bill { background: var(--accent); color: #fff; border: none; padding: 14px 28px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; }
    .btn-new-bill:hover { opacity: 0.85; }
    .btn-demo-link { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); text-align: center; margin-top: 8px; cursor: pointer; }
    .btn-demo-link:hover { color: var(--ink); text-decoration: underline; }

    .stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; border-bottom: 2px solid var(--rule); animation: fadeUp 0.4s 0.1s ease both; }
    .stat-cell { padding: 32px 48px; border-right: 1px solid var(--line); }
    .stat-cell:last-child { border-right: none; }
    .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 12px; }
    .stat-val { font-family: 'DM Mono', monospace; font-size: 32px; color: var(--ink); font-weight: 500; }
    .stat-val.overdue { color: #991B1B; }

    .bills-header { padding: 20px 48px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; animation: fadeUp 0.4s 0.15s ease both; }
    .bills-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); }
    .bills-count { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }

    .bill-row { padding: 28px 48px; border-bottom: 1px solid var(--line); display: grid; grid-template-columns: 260px 1fr 180px 160px; align-items: center; gap: 32px; background: var(--paper); cursor: pointer; transition: 150ms; }
    .bill-row:hover { background: #F0EDE6; }
    .bill-identity .cat { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 6px; }
    .bill-identity .title { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--ink); }
    .bill-identity .date { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .bill-identity .date.overdue { color: #991B1B; }

    .progress-col { display: flex; flex-direction: column; }
    .progress-bar { height: 3px; background: var(--line); width: 100%; }
    .progress-fill { height: 3px; background: var(--green); animation: fillBar 800ms cubic-bezier(0.4, 0, 0.2, 1) both; animation-delay: 0.4s; }
    .progress-labels { margin-top: 10px; display: flex; justify-content: space-between; font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); }
    
    .paid-col .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 6px; }
    .paid-col .value { font-family: 'DM Mono', monospace; font-size: 22px; color: var(--ink); }
    .paid-col .value.complete { color: var(--green); }

    .actions-col { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-view { border: 1.5px solid var(--ink); background: transparent; color: var(--ink); padding: 9px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; }
    .btn-view:hover { background: var(--ink); color: #fff; }
    .btn-share { border: 1.5px solid var(--line); background: transparent; color: var(--muted); padding: 9px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; }
    .btn-share:hover { border-color: var(--ink); color: var(--ink); }

    .empty-dash { padding: 96px 48px; display: flex; flex-direction: column; align-items: center; border-bottom: 2px solid var(--rule); text-align: center; }
    .empty-dash .dash { font-family: 'DM Serif Display', serif; font-size: 64px; color: var(--line); margin-bottom: 24px; }
    .empty-dash .title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); margin-bottom: 12px; }
    .empty-dash .desc { font-size: 15px; color: var(--muted); max-width: 360px; line-height: 1.7; margin-bottom: 36px; }
    .empty-dash .btn { background: var(--accent); color: #fff; border: none; padding: 14px 32px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; animation: pulse 0.6s 1.2s ease both; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
    
    /* Create Bill Styles */
    .create-page { min-height: 100vh; background: var(--paper); padding: 48px 24px; }
    .create-card { max-width: 920px; margin: 0 auto; border: 2px solid var(--rule); background: #fff; padding: 48px; }
    .create-header { margin-bottom: 32px; border-bottom: 2px solid var(--rule); padding-bottom: 32px; }
    .create-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 8px; }
    .create-title { font-family: 'DM Serif Display', serif; font-size: 40px; color: var(--ink); margin-bottom: 8px; }
    .create-sub { font-size: 14px; color: var(--muted); }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .field-group { margin-bottom: 24px; }
    .create-input { width: 100%; height: 52px; border: 1px solid var(--rule); padding: 0 16px; font-size: 14px; background: #FAFAF7; outline: none; box-sizing: border-box; font-family: inherit; }
    .create-input:focus { border: 2px solid var(--accent); }
    .create-textarea { width: 100%; height: 120px; border: 1px solid var(--rule); padding: 16px; font-size: 14px; background: #FAFAF7; outline: none; box-sizing: border-box; font-family: inherit; }
    .create-textarea:focus { border: 2px solid var(--accent); }
    
    .participant-list { margin-top: 32px; }
    .p-row { display: grid; grid-template-columns: 2fr 2fr 1fr auto; gap: 16px; align-items: center; padding: 20px 0; border-top: 1px solid var(--line); }
    .btn-add-p { border: 1.5px solid var(--line); background: transparent; padding: 12px 24px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink); cursor: pointer; margin-top: 16px; }
    .btn-add-p:hover { border-color: var(--ink); }
    
    .footer-actions { margin-top: 48px; border-top: 2px solid var(--rule); padding-top: 32px; display: flex; justify-content: space-between; align-items: center; }
    .btn-create { background: var(--accent); color: #fff; border: none; padding: 18px 48px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; }
    
    @media (max-width: 768px) {
      .grid-2 { grid-template-columns: 1fr; }
      .p-row { grid-template-columns: 1fr; }
      .footer-actions { flex-direction: column; gap: 24px; }
      .btn-create { width: 100%; }
    }

    /* Payment Page Styles */
    .pay-container { max-width: 760px; margin: 0 auto; padding: 48px 24px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
    .pay-logo { font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; text-align: center; margin-bottom: 48px; color: var(--ink); font-weight: 500; }
    .pay-card { background: #fff; border: 2px solid var(--rule); padding: 48px; }
    .pay-header { display: flex; justify-content: space-between; border-bottom: 1.5px solid var(--rule); padding-bottom: 14px; margin-bottom: 24px; }
    .pay-header-text { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); }
    .pay-title { font-family: 'DM Serif Display', serif; font-size: 36px; color: var(--ink); margin-bottom: 8px; }
    .pay-info { font-size: 14px; color: var(--muted); margin-bottom: 24px; }
    .pay-warning { border: 1.5px solid #991B1B; color: #991B1B; padding: 14px; font-size: 13px; margin-bottom: 24px; }
    
    .selector-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 8px; display: block; }
    .pay-select { width: 100%; border: 1.5px solid var(--line); padding: 13px 16px; font-size: 14px; background: var(--paper); outline: none; margin-bottom: 32px; font-family: inherit; }
    .pay-select:focus { border-color: var(--ink); }
    
    .amt-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); margin-bottom: 4px; }
    .amt-val { font-family: 'DM Mono', monospace; font-size: 48px; color: var(--ink); font-weight: 500; margin-bottom: 8px; }
    .amt-sub { font-size: 14px; color: var(--muted); margin-bottom: 32px; }
    
    .method-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .method-card { border: 1.5px solid var(--line); padding: 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; cursor: pointer; background: transparent; font-family: inherit; }
    .method-card.active { border-color: var(--accent); background: var(--accent); color: #fff; }
    
    .btn-confirm { width: 100%; background: var(--accent); color: #fff; border: none; padding: 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; }
    .btn-confirm:hover { opacity: 0.85; }
    .trust-note { text-align: center; font-size: 11px; color: var(--muted); margin-top: 16px; }
    
    .success-card { background: #fff; border: 2px solid var(--rule); padding: 48px; width: 100%; max-width: 760px; }
    .success-header { display: flex; justify-content: space-between; border-bottom: 2px solid var(--rule); padding-bottom: 14px; margin-bottom: 24px; }
    .success-title { font-family: 'DM Serif Display', serif; font-size: 36px; color: var(--ink); margin-bottom: 16px; }
    .status-badge { background: var(--green); color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 10px; display: inline-block; margin-bottom: 32px; }
    .receipt-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--line); }
    .receipt-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); }
    .receipt-val { font-size: 14px; color: var(--ink); font-weight: 500; }
    .btn-back { width: 100%; background: var(--accent); color: #fff; border: none; padding: 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; cursor: pointer; margin-top: 32px; }
    .btn-back:hover { opacity: 0.85; }
  `;
  document.head.appendChild(style);
}

function useHashRoute() {
  const [route, setRoute] = useState(hashToRoute());
  useEffect(() => {
    const onHash = () => setRoute(hashToRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const show = (message) => {
    const id = uid('toast');
    setToasts((items) => [...items, { id, message }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3000);
  };
  return { toasts, show };
}

function Logo() {
  return <button className="logo" onClick={() => go('/')} aria-label="Bayar home"><span className="logo-mark"><img className="logo-img" src="/Bayar-logo.png" alt="Bayar logo" /></span></button>;
}

function Header({ session, onLogout }) {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => go('/')}>BAYAR</div>
      <div className="nav-links">
        {session ? (
          <>
            <button className="btn-nav-login" onClick={() => go('/dashboard')}>DASHBOARD</button>
            <button className="btn-nav-login" onClick={onLogout}>LOGOUT</button>
          </>
        ) : (
          <>
            <button className="btn-nav-login" onClick={() => go('/login')}>LOGIN</button>
            <button className="btn-nav-started" onClick={() => go('/signup')}>GET STARTED</button>
          </>
        )}
      </div>
    </nav>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.step-col, .feature-cell, .cta-banner').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function Landing() {
  useScrollReveal();
  return (
    <>
      <main className="hero">
        <section className="hero-left">
          <div className="hero-label">SPLIT BILL TRACKER — MY</div>
          <h1 className="hero-headline">The cleanest way to split bills.</h1>
          <p className="hero-subtext">A disciplined approach to shared expenses. No social feeds, no clutter. Just structural clarity for tracking and settling group payments.</p>
          <div className="hero-cta">
            <button className="btn-cta-main" onClick={() => go('/signup')}>GET STARTED</button>
            <button className="btn-cta-secondary" onClick={() => go('/login')}>LOGIN</button>
          </div>
        </section>
        <section className="hero-right">
          <div className="receipt-card">
            <div className="receipt-header">
              <div className="receipt-title">BAYAR RECEIPT</div>
              <div className="receipt-date">22 MAY 2026</div>
            </div>
            <div className="bill-name">Bali Trip 2025</div>
            <div className="bill-label">TRIP — 6 PARTICIPANTS</div>
            <div className="participant-row">
              <span className="participant-name">Aina</span>
              <span style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="participant-amount">RM 180.00</span>
                <span className="badge-paid">PAID</span>
              </span>
            </div>
            <div className="participant-row">
              <span className="participant-name">Hakim</span>
              <span style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="participant-amount">RM 450.00</span>
                <span className="badge-pending">PENDING</span>
              </span>
            </div>
            <div className="participant-row">
              <span className="participant-name">Danial</span>
              <span style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="participant-amount">RM 450.00</span>
                <span className="badge-pending">PENDING</span>
              </span>
            </div>
            <div className="total-row">
              <div className="total-label">TOTAL DUE</div>
              <div className="total-amount">RM 1,080.00</div>
            </div>
            <button className="btn-share">SHARE PAYMENT LINK</button>
          </div>
        </section>
      </main>

      <section className="section-header">
        <div className="section-label">HOW IT WORKS</div>
        <div className="section-count">3 STEPS</div>
      </section>
      <div className="how-it-works-grid">
        <div className="step-col">
          <div className="step-num">01</div>
          <div className="step-title">Create a bill.</div>
          <div className="step-desc">Set the total, add your group members, choose how to split — equally or custom amounts. Takes under a minute.</div>
          <div className="step-label">BILL CREATION</div>
        </div>
        <div className="step-col">
          <div className="step-num">02</div>
          <div className="step-title">Share the link.</div>
          <div className="step-desc">Each member gets a unique payment link. Send it via WhatsApp, copy it, or nudge them directly from your dashboard.</div>
          <div className="step-label">PAYMENT LINKS</div>
        </div>
        <div className="step-col">
          <div className="step-num">03</div>
          <div className="step-title">Track who paid.</div>
          <div className="step-desc">Watch your dashboard update in real time. See collected amounts, pending members, and nudge anyone who hasn't paid.</div>
          <div className="step-label">LIVE TRACKING</div>
        </div>
      </div>

      <section className="section-header">
        <div className="section-label">WHY BAYAR</div>
        <div className="section-count">4 REASONS</div>
      </section>
      <div className="features-grid">
        <div className="feature-cell">
          <div className="feature-tag">PERSONALIZED</div>
          <div className="feature-title">Every member gets their own link.</div>
          <div className="feature-desc">No confusion about who paid what. Each participant receives a unique payment link with their exact share pre-loaded.</div>
        </div>
        <div className="feature-cell">
          <div className="feature-tag">INSTANT</div>
          <div className="feature-title">Confirm in three taps.</div>
          <div className="feature-desc">Members open their link, select a payment method, and confirm. No account required. No app to download. Just pay.</div>
        </div>
        <div className="feature-cell">
          <div className="feature-tag">ORGANISED</div>
          <div className="feature-title">One dashboard. Every bill.</div>
          <div className="feature-desc">See all your bills, collected amounts, and pending members in a single clean view. No spreadsheets, no group chat scrolling.</div>
        </div>
        <div className="feature-cell">
          <div className="feature-tag">EFFORTLESS</div>
          <div className="feature-title">Nudge without the awkward.</div>
          <div className="feature-desc">One tap sends a personalized WhatsApp reminder with the member's name, amount, and payment link — directly from your dashboard.</div>
        </div>
      </div>

      <section className="cta-banner">
        <div className="cta-banner-left">
          <div className="label">READY TO COLLECT?</div>
          <h2>Stop chasing. Start collecting.</h2>
        </div>
        <button className="btn-cta-banner" onClick={() => go('/signup')}>GET STARTED</button>
      </section>

      <section className="category-strip">
        <div className="category-title">GREAT FOR</div>
        <div className="category-divider"></div>
        <div className="category-items">MAKAN · TRIPS · HOUSE BILLS · SPORTS · EVENTS</div>
      </section>
      <footer className="footer">
        <div className="footer-brand">BAYAR</div>
        <div className="footer-nav">
          <div>FEATURES</div>
          <div>SECURITY</div>
          <div>PRIVACY</div>
          <div>TERMS</div>
          <div>CONTACT</div>
        </div>
        <div className="footer-copyright">© 2025 BAYAR. ALL RIGHTS RESERVED.</div>
      </footer>
    </>
  );
}

function Auth({ mode, users, setUsers, setSession, seedDemo }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const isSignup = mode === 'signup';
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password || (isSignup && !form.name.trim())) return setError('Complete all fields first.');
    if (isSignup) {
      if (users.some((u) => u.email === email)) return setError('An account with this email already exists. Sign in instead.');
      const user = { id: uid('user'), name: form.name.trim(), email, password: form.password, createdAt: new Date().toISOString() };
      const next = [...users, user];
      await storage.set('users', next);
      setUsers(next);
      const session = { userId: user.id, name: user.name, email: user.email };
      await storage.set('session', session);
      setSession(session);
      await seedDemo(user);
      go('/dashboard');
      return;
    }
    const user = users.find((u) => u.email === email && u.password === form.password);
    if (!user) return setError('Incorrect email or password. Please try again.');
    const session = { userId: user.id, name: user.name, email: user.email };
    await storage.set('session', session);
    setSession(session);
    go('/dashboard');
  };
  return (
    <main className="auth-page">
      <section className="form-panel">
        <div className="form-header">
          <div className="form-brand" onClick={() => go('/')} style={{ cursor: 'pointer' }}>BAYAR</div>
        </div>
        <div className="page-label">{isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}</div>
        <h1 className="form-heading">{isSignup ? 'Start collecting.' : 'Welcome back.'}</h1>
        <p className="form-subtext">{isSignup ? 'Create your account and send your first bill in minutes.' : 'Continue collecting without awkward chasing.'}</p>
        <form onSubmit={submit}>
          {error && <div className="error-msg">{error}</div>}
          {isSignup && (
            <div className="field-wrap">
              <label className="field-label">Full Name</label>
              <input className="input-auth" type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Irfan Ariff" />
            </div>
          )}
          <div className="field-wrap">
            <label className="field-label">Email Address</label>
            <input className="input-auth" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="field-wrap">
            <label className="field-label">Password</label>
            <input className="input-auth" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn-auth" type="submit">{isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}</button>
        </form>
        <div className="toggle-link">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <button onClick={() => go(isSignup ? '/login' : '/signup')}>{isSignup ? 'SIGN IN' : 'CREATE AN ACCOUNT'}</button>
        </div>
      </section>
      <section className="right-panel">
        <div>
          <div className="right-label">BAYAR</div>
          <h2 className="right-heading">
            {isSignup ? (
              <>Bills split.<br />Payments<br />collected.</>
            ) : (
              <>No more<br />awkward<br />reminders.</>
            )}
          </h2>
          <p className="right-desc">
            {isSignup ? (
              <>Set up a bill, share one link,<br />and let Bayar handle the<br />uncomfortable follow-ups.</>
            ) : (
              <>Your group is waiting.<br />Sign in to see who has paid<br />and who still owes you.</>
            )}
          </p>
        </div>
        <div className="stats-strip">
          <div>
            <div className="stat-val">RM 0</div>
            <div className="stat-label">COLLECTED TODAY</div>
          </div>
          <div>
            <div className="stat-val">0</div>
            <div className="stat-label">BILLS ACTIVE</div>
          </div>
          <div>
            <div className="stat-val">{'< 1 MIN'}</div>
            <div className="stat-label">TO CREATE A BILL</div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, min, step }) {
  return <div className="field"><label>{label}</label><input className="input" type={type} min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

function Dashboard({ session, bills, loading, showToast, onToggleDemo }) {
  const mine = bills.filter((b) => b.organizerId === session?.userId);
  const stats = useMemo(() => {
    const totalCollected = mine.reduce((sum, b) => sum + b.participants.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0), 0);
    const pending = mine.reduce((sum, b) => sum + b.participants.filter((p) => !p.paid).reduce((s, p) => s + Number(p.amount), 0), 0);
    const overdueBills = mine.filter((b) => b.participants.some((p) => isOverdue(b.dueDate, p.paid))).length;
    return { totalCollected, pending, overdueBills };
  }, [mine]);
  return (
    <main className="dashboard-page">
      <nav className="dash-nav">
        <div className="dash-nav-logo" onClick={() => go('/')} style={{ cursor: 'pointer' }}>BAYAR</div>
        <div className="dash-nav-right">
          <div className="dash-nav-link">DASHBOARD</div>
          <div className="dash-nav-divider"></div>
          <button className="dash-nav-logout" onClick={() => { localStorage.removeItem('session'); go('/login'); }}>LOGOUT</button>
        </div>
      </nav>
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="label">GOOD MORNING,</div>
          <div className="title">{session?.name}.</div>
        </div>
        <div className="dash-header-right">
          <button className="btn-new-bill" onClick={() => go('/create')}>+ NEW BILL</button>
          <div className="btn-demo-link" onClick={onToggleDemo}>{bills.some((b) => b.demo) ? 'REMOVE DEMO DATA' : 'ADD DEMO DATA'}</div>
        </div>
      </header>
      <section className="stats-row">
        <div className="stat-cell"><div className="stat-label">TOTAL BILLS</div><div className="stat-val">{mine.length}</div></div>
        <div className="stat-cell"><div className="stat-label">TOTAL COLLECTED</div><div className="stat-val">{rm(stats.totalCollected)}</div></div>
        <div className="stat-cell"><div className="stat-label">PENDING AMOUNT</div><div className="stat-val">{rm(stats.pending)}</div></div>
        <div className="stat-cell"><div className="stat-label">OVERDUE BILLS</div><div className={`stat-val ${stats.overdueBills > 0 ? 'overdue' : ''}`}>{stats.overdueBills}</div></div>
      </section>
      <section className="bills-header">
        <div className="bills-label">YOUR BILLS</div>
        <div className="bills-count">{mine.length} BILLS</div>
      </section>
      {mine.length > 0 ? (
        mine.map((bill) => <BillRow key={bill.id} bill={bill} showToast={showToast} />)
      ) : (
        <div className="empty-dash">
          <div className="dash">—</div>
          <div className="title">NO BILLS YET</div>
          <div className="desc">Create your first bill and share the payment link with your group.</div>
          <button className="btn btn-primary empty-cta" onClick={() => go('/create')}>+ CREATE YOUR FIRST BILL</button>
        </div>
      )}
    </main>
  );
}

function BillRow({ bill, showToast }) {
  const collected = bill.participants.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(bill.totalAmount);
  const pct = total ? Math.min(100, (collected / total) * 100) : 0;
  const paidCount = bill.participants.filter((p) => p.paid).length;
  const overdue = isOverdue(bill.dueDate, paidCount === bill.participants.length);
  const share = () => { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/pay/${bill.id}`); showToast('Payment link copied!'); };
  return (
    <div className="bill-row" onClick={() => go(`/bill/${bill.id}`)}>
      <div className="bill-identity">
        <div className="cat">{CATEGORIES[bill.category]?.label.toUpperCase()}</div>
        <div className="title">{bill.title}</div>
        <div className={`date ${overdue ? 'overdue' : ''}`} style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{overdue ? 'OVERDUE' : 'DUE'} — {formatDate(bill.dueDate).toUpperCase()}</div>
      </div>
      <div className="progress-col">
        <div className="progress-bar"><div className="progress-fill" style={{ '--pct': `${pct}%` }}></div></div>
        <div className="progress-labels"><span>{rm(collected)} COLLECTED</span><span>{rm(total - collected)} REMAINING</span></div>
      </div>
      <div className="paid-col">
        <div className="label">PAID</div>
        <div className={`value ${paidCount === bill.participants.length ? 'complete' : ''}`}>{paidCount} / {bill.participants.length}</div>
      </div>
      <div className="actions-col" onClick={(e) => e.stopPropagation()}>
        <button className="btn-view" onClick={() => go(`/bill/${bill.id}`)}>VIEW</button>
        <button className="btn-share" onClick={share}>SHARE</button>
      </div>
    </div>
  );
}

function CreateBill({ session, bills, setBills }) {
  const [error, setError] = useState('');
  const [split, setSplit] = useState('equal');
  const [form, setForm] = useState({ title: '', category: 'makan', description: '', totalAmount: '', dueDate: new Date().toISOString().slice(0, 10) });
  const [people, setPeople] = useState([{ id: uid('part'), name: '', email: '', amount: '' }]);
  const validPeople = people.filter((p) => p.name.trim() && p.email.trim());
  const organizerCustomShare = Math.max(0, Number(form.totalAmount || 0) - validPeople.reduce((sum, p) => sum + Number(p.amount || 0), 0));
  const updatePerson = (id, key, value) => setPeople((items) => items.map((p) => p.id === id ? { ...p, [key]: value } : p));
  const addPerson = () => setPeople([...people, { id: uid('part'), name: '', email: '', amount: '' }]);
  const removePerson = (id) => setPeople(people.length > 1 ? people.filter((p) => p.id !== id) : people);
  
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const totalAmount = Number(form.totalAmount);
    if (!form.title.trim() || !totalAmount || !form.dueDate || validPeople.length < 1) return setError('Complete all fields');
    
    let participants = split === 'equal' 
      ? [{ id: uid('part'), name: session.name, email: session.email, amount: totalAmount / (validPeople.length + 1), isOrganizer: true, paid: true }, ...validPeople.map(p => ({ ...p, amount: totalAmount / (validPeople.length + 1), paid: false }))]
      : [{ id: uid('part'), name: session.name, email: session.email, amount: organizerCustomShare, isOrganizer: true, paid: true }, ...validPeople.map(p => ({ ...p, amount: Number(p.amount || 0), paid: false }))];

    const bill = {
      id: uid('bill'), organizerId: session.userId, organizerName: session.name, ...form,
      participants: participants.map(p => ({ ...p, id: uid('part'), email: p.email.toLowerCase(), isOrganizer: !!p.isOrganizer, paid: !!p.paid }))
    };
    const next = [bill, ...bills];
    await storage.set('bills', next);
    setBills(next);
    go(`/bill/${bill.id}`);
  };

  return (
    <main className="create-page">
      <div className="pay-logo" onClick={() => go('/dashboard')} style={{ cursor: 'pointer' }}>BAYAR</div>
      <form className="create-card" onSubmit={submit}>
        <header className="create-header">
          <div className="create-label">NEW BILL</div>
          <h1 className="create-title">Create bill.</h1>
          <p className="create-sub">Set the total, add members, and generate a public payment link.</p>
        </header>
        {error && <div className="error-msg" style={{ marginBottom: 24 }}>{error}</div>}
        <div className="grid-2">
          <div className="field-group"><label className="selector-label">TITLE</label><input className="create-input" placeholder="Bali Trip 2025" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div className="field-group"><label className="selector-label">CATEGORY</label><select className="pay-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}</select></div>
        </div>
        <div className="field-group"><label className="selector-label">DESCRIPTION</label><textarea className="create-textarea" placeholder="Shared expenses..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div className="grid-2">
          <div className="field-group"><label className="selector-label">TOTAL AMOUNT (RM)</label><input className="create-input" type="number" placeholder="0.00" value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} /></div>
          <div className="field-group"><label className="selector-label">DUE DATE</label><input className="create-input" type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} /></div>
        </div>
        <div className="field-group"><label className="selector-label">SPLIT METHOD</label><select className="pay-select" value={split} onChange={e => setSplit(e.target.value)}><option value="equal">Equal split</option><option value="custom">Custom amounts</option></select></div>
        
        <div className="participant-list">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="selector-label">PARTICIPANTS</label>
            <div className="create-label">{split === 'equal' ? 'EQUAL SPLIT AUTOMATIC' : 'MANUAL ENTRY'}</div>
          </div>
          {people.map(p => (
            <div className="p-row" key={p.id}>
              <input className="create-input" placeholder="Name" value={p.name} onChange={e => updatePerson(p.id, 'name', e.target.value)} />
              <input className="create-input" placeholder="Email" value={p.email} onChange={e => updatePerson(p.id, 'email', e.target.value)} />
              {split === 'custom' ? <input className="create-input" placeholder="RM 0.00" value={p.amount} onChange={e => updatePerson(p.id, 'amount', e.target.value)} /> : <div className="create-input" style={{ display: 'flex', alignItems: 'center', background: '#E0DDD6' }}>RM {rm(Number(form.totalAmount)/(people.length+1))}</div>}
              <button type="button" className="btn-action" onClick={() => removePerson(p.id)}>REMOVE</button>
            </div>
          ))}
          <button type="button" className="btn-add-p" onClick={addPerson}>+ ADD PARTICIPANT</button>
        </div>
        <footer className="footer-actions">
          <div>
            <div className="create-label">TOTAL</div>
            <div style={{ fontSize: '24px', fontWeight: '500', fontFamily: 'DM Mono' }}>{rm(Number(form.totalAmount))}</div>
          </div>
          <button className="btn-create" type="submit">CREATE BILL →</button>
        </footer>
      </form>
    </main>
  );
}

function BillDetail({ bill, showToast }) {
  const [copied, setCopied] = useState({});
  const [sent, setSent] = useState({});
  if (!bill) return <NotFound />;
  const collected = bill.participants.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(bill.totalAmount);
  const remaining = total - collected;
  const pct = total ? Math.min(100, (collected / total) * 100) : 0;
  const overdue = isOverdue(bill.dueDate, bill.participants.every(p => p.paid));
  const billShareUrl = `${location.origin}${location.pathname}#/pay/${bill.id}`;
  const copy = async (pId = 'all') => {
    const url = pId === 'all' ? billShareUrl : getParticipantLink(bill.id, pId);
    await navigator.clipboard.writeText(url);
    if (pId === 'all') setCopied(true); else setCopied({ ...copied, [pId]: true });
    showToast('Link copied!');
    setTimeout(() => { if (pId === 'all') setCopied(false); else setCopied({ ...copied, [pId]: false }); }, 2000);
  };
  const nudge = async (p) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Pay here: ${getParticipantLink(bill.id, p.id)}`)}`, '_blank');
    setSent({ ...sent, [p.id]: true });
    setTimeout(() => setSent({ ...sent, [p.id]: false }), 2000);
  };
  return (
    <main className="bill-detail-page">
      <section className="left-panel">
        <div className="back-link" onClick={() => go('/dashboard')}>← ALL BILLS</div>
        <div className="bill-cat">{CATEGORIES[bill.category]?.label.toUpperCase()}</div>
        <h1 className="bill-title">{bill.title}</h1>
        <p className="bill-desc">{bill.description}</p>
        <div className={`bill-due ${overdue ? 'overdue' : ''}`}>
          {overdue ? 'OVERDUE' : 'DUE'} — {formatDate(bill.dueDate).toUpperCase()}
        </div>
        <div className="divider" />
        <div className="collected-label">COLLECTED</div>
        <div className="collected-amt">{rm(collected)}</div>
        <div className="progress-bar-container"><div className="progress-fill-bar" style={{ width: `${pct}%` }}></div></div>
        <div className="stat-cells">
          <div className="stat-cell-left">
            <div className="pct-label" style={{ marginBottom: 4 }}>COLLECTED</div>
            <div style={{ color: 'var(--green)', fontSize: '18px', fontFamily: 'DM Mono' }}>{rm(collected)}</div>
          </div>
          <div className="stat-cell-right">
            <div className="pct-label" style={{ marginBottom: 4 }}>REMAINING</div>
            <div style={{ color: remaining > 0 ? 'var(--amber)' : 'var(--green)', fontSize: '18px', fontFamily: 'DM Mono' }}>{rm(remaining)}</div>
          </div>
        </div>
        <div className="divider" />
        <div className="large-pct">{Math.round(pct)}%</div>
        <div className="pct-label">OF TOTAL COLLECTED</div>
      </section>
      <section className="right-panel">
        <div className="ledger-header">
          <div className="ledger-header-label">BILL DETAILS</div>
          <div className="ledger-header-label">{bill.participants.length} PARTICIPANTS</div>
        </div>
        {bill.participants.map(p => (
          <div className={`participant-row ${p.isOrganizer ? 'organizer' : ''}`} key={p.id}>
            <div>
              <div className="p-name">{p.name}{p.isOrganizer ? ' (YOU)' : ''}</div>
              <div className="p-email">{p.email}</div>
              <div className="p-amt">{rm(p.amount)}</div>
            </div>
            <div>
              {p.paid ? <span className="p-badge-paid">PAID</span> :
               isOverdue(bill.dueDate, false) ? <span className="p-badge-overdue">OVERDUE</span> :
               <span className="p-badge-pending">PENDING</span>}
            </div>
            {!p.paid && !p.isOrganizer && <button className={`btn-action ${copied[p.id] ? 'btn-nudge' : ''}`} onClick={() => copy(p.id)}>{copied[p.id] ? 'COPIED' : 'COPY LINK'}</button>}
            {!p.paid && !p.isOrganizer && <button className={`btn-action btn-nudge ${sent[p.id] ? 'btn-nudge' : ''}`} onClick={() => nudge(p)}>{sent[p.id] ? 'SENT' : 'NUDGE'}</button>}
          </div>
        ))}
        <div className="share-section-header">
          <div className="ledger-header-label">SHARE PAYMENT LINK</div>
          <div className="ledger-header-label" style={{ color: 'var(--muted)' }}>BILL-LEVEL LINK (FALLBACK)</div>
        </div>
        <div className="share-body">
          <div className="url-row">
            <div className="url-field">{`bayar.app/pay/${bill.id}`}</div>
            <button className="btn-copy" onClick={() => copy('all')} style={{ borderColor: copied ? 'var(--green)' : 'var(--ink)', color: copied ? 'var(--green)' : 'var(--ink)' }}>{copied ? 'COPIED' : 'COPY'}</button>
          </div>
          <button className="btn-wa" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Pay here: ${billShareUrl}`)}`)}>SHARE VIA WHATSAPP</button>
          <p className="helper-text">For personalized links, use the COPY LINK button next to each participant above.</p>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ paid, overdue }) {
  if (paid) return <span className="badge badge-paid">✅ Paid</span>;
  if (overdue) return <span className="badge badge-overdue">❌ Overdue</span>;
  return <span className="badge badge-pending">⏳ Pending</span>;
}

function PaymentPage({ bill, participantIdFromRoute, updateBill }) {
  const [participantId, setParticipantId] = useState(participantIdFromRoute || '');
  const [method, setMethod] = useState('FPX');
  const [receipt, setReceipt] = useState('');
  const [modal, setModal] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    setParticipantId(participantIdFromRoute || '');
    setModal(false);
    setSuccess(false);
    setReceipt('');
  }, [participantIdFromRoute, bill?.id]);
  if (!bill) return <PaymentError />;
  const participant = bill.participants.find((p) => p.id === participantId);
  const overdue = participant ? isOverdue(bill.dueDate, participant.paid) : false;
  const confirm = async () => {
    const next = { ...bill, participants: bill.participants.map((p) => p.id === participantId ? { ...p, paid: true, paidAt: new Date().toISOString(), receipt: receipt || null, paymentMethod: method } : p) };
    await updateBill(next);
    setSuccess(true);
  };
  if (success) return <PaymentSuccess participant={participant} />;
  return (
    <main className="pay-container">
      <div className="pay-logo">BAYAR</div>
      <section className="pay-card">
        <div className="pay-header">
          <div className="pay-header-text">PAYMENT REQUEST</div>
          <div className="pay-header-text">DUE {formatDate(bill.dueDate).toUpperCase()}</div>
        </div>
        {overdue && <div className="pay-warning">PAYMENT WAS DUE ON {formatDate(bill.dueDate).toUpperCase()}. YOU CAN STILL CONFIRM PAYMENT.</div>}
        <h1 className="pay-title">{bill.title}</h1>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '8px' }}>{CATEGORIES[bill.category]?.label.toUpperCase()}</p>
        <p className="pay-info">{bill.description || 'No description added.'}</p>
        {!participantIdFromRoute && (
          <>
            <label className="selector-label">SELECT YOUR NAME</label>
            <select className="pay-select" value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
              <option value="">CHOOSE PARTICIPANT</option>
              {bill.participants.map((p) => <option key={p.id} value={p.id}>{p.name} — {rm(p.amount)}</option>)}
            </select>
          </>
        )}
        {participant && (
          <>
            <div className="amt-label">YOUR SHARE</div>
            <div className="amt-val">{rm(participant.amount)}</div>
            <p className="amt-sub">This is your portion of {bill.title}.</p>
            <div className="method-grid">
              {['FPX', 'ONLINE BANKING', 'MANUAL'].map((m) => <button key={m} className={`method-card ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)}>{m}</button>)}
            </div>
            {method === 'MANUAL' && <label className="method-card" style={{ display: 'block', width: '100%', marginBottom: '24px' }}><input type="file" onChange={(e) => setReceipt(e.target.files?.[0]?.name || '')} style={{ display: 'none' }} />{receipt ? `RECEIPT: ${receipt}` : 'UPLOAD RECEIPT (OPTIONAL)'}</label>}
            <button className="btn-confirm" onClick={confirm}>CONFIRM MY PAYMENT →</button>
            <p className="trust-note">Your confirmation will update the organizer’s bill status.</p>
          </>
        )}
      </section>
    </main>
  );
}

function PaymentModal({ participant, method, setMethod, receipt, setReceipt, onClose, onConfirm }) {
  const methods = [{ value: 'FPX', label: '🏦 FPX' }, { value: 'Online Banking', label: '💳 Online Banking' }, { value: 'Manual Transfer', label: '📋 Manual Transfer' }];
  return (
    <div className="modal-backdrop">
      <section className="card modal">
        <div className="sheet-head"><h2 style={{ margin: 0, letterSpacing: '-.04em' }}>Complete Payment</h2><button className="btn btn-ghost btn-small" onClick={onClose} aria-label="Close payment modal"><X size={17} /></button></div>
        <div className="sheet-amount">{rm(participant?.amount)}</div>
        <div className="method-grid">{methods.map((item) => <button key={item.value} className={`method-card ${method === item.value ? 'active' : ''}`} onClick={() => setMethod(item.value)}>{item.label}</button>)}</div>
        <label className="upload-zone" style={{ marginTop: 14 }}><input className="upload-input" type="file" onChange={(e) => setReceipt(e.target.files?.[0]?.name || '')} /><div>📎</div><div>Tap to upload receipt (optional)</div>{receipt && <div className="receipt-ok">✓ {receipt}</div>}</label>
        <button className="btn btn-accent" style={{ width: '100%', marginTop: 14 }} onClick={onConfirm}>I've Paid ✓</button>
        <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginBottom: 0 }}>Your payment will be recorded and the organizer will be notified.</p>
      </section>
    </div>
  );
}

function PaymentSuccess({ participant }) {
  return (
    <main className="pay-container">
      <div className="pay-logo">BAYAR</div>
      <section className="success-card">
        <div className="success-header">
          <div className="pay-header-text">PAYMENT RECEIPT</div>
          <div className="pay-header-text">RECORDED</div>
        </div>
        <h1 className="success-title">Payment recorded.</h1>
        <div className="status-badge">PAID</div>
        <div className="receipt-row"><span className="receipt-label">BILL</span><span className="receipt-val">{participant?.billTitle || 'N/A'}</span></div>
        <div className="receipt-row"><span className="receipt-label">PARTICIPANT</span><span className="receipt-val">{participant?.name}</span></div>
        <div className="receipt-row"><span className="receipt-label">AMOUNT</span><span className="receipt-val">{rm(participant?.amount)}</span></div>
        <div className="receipt-row"><span className="receipt-label">STATUS</span><span className="receipt-val" style={{ color: 'var(--green)' }}>PAID</span></div>
        <div className="receipt-row"><span className="receipt-label">ORGANIZER</span><span className="receipt-val">{participant?.organizerName || 'N/A'}</span></div>
        <p style={{ marginTop: '32px', color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>Your payment confirmation has been recorded. The organizer has been notified.</p>
        <button className="btn-back" onClick={() => go('/dashboard')}>BACK TO DASHBOARD →</button>
        <p className="trust-note" style={{ marginTop: '32px' }}>POWERED BY BAYAR</p>
      </section>
    </main>
  );
}

function PaymentError() {
  return <main className="container pay-shell"><section className="card success-card"><div className="pay-banner pay-error">❌ This payment link is invalid or has expired.</div><div className="powered"><img className="logo-img" src="/Bayar-logo.png" alt="Bayar logo" /><span>Powered by Bayar</span></div></section></main>;
}

function NotFound() {
  return <main className="container auth-shell"><section className="card pay-card" style={{ textAlign: 'center' }}><h1>Not found</h1><p className="muted">This bill or page does not exist.</p><button className="btn btn-primary" onClick={() => go('/')}>Go home</button></section></main>;
}

function Toasts({ items }) {
  return <div className="toast-wrap">{items.map((t) => <div className="toast" key={t.id}>{t.message}</div>)}</div>;
}

export default function BayarApp() {
  const route = useHashRoute();
  const { toasts, show } = useToasts();
  const [users, setUsers] = useState([]);
  const [session, setSession] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    injectStyles();
    (async () => {
      const [storedUsers, storedSession, storedBills] = await Promise.all([storage.get('users', []), storage.get('session', null), storage.get('bills', [])]);
      const clearExistingBillsOnce = !localStorage.getItem('bayar_existing_bills_cleared_once');
      if (clearExistingBillsOnce) {
        await storage.set('bills', []);
        localStorage.setItem('bayar_existing_bills_cleared_once', 'true');
      }
      setUsers(storedUsers);
      setSession(storedSession);
      setBills(clearExistingBillsOnce ? [] : storedBills);
      setTimeout(() => setLoading(false), 520);
    })();
  }, []);

  const seedDemo = async (user) => {
    const existing = await storage.get('bills', []);
    if (existing.some((b) => b.organizerId === user.id && b.demo)) return;
    const demo = [
      demoBill(user, 'Bali Trip 2025', 'trip', 1280, 4, 6, 14),
      demoBill(user, 'Friday Makan Team', 'makan', 360, 3, 5, 3),
      demoBill(user, 'House Utilities May', 'house', 420, 1, 4, -2),
    ];
    const next = [...demo, ...existing];
    await storage.set('bills', next);
    setBills(next);
  };

  const toggleDemoData = async () => {
    if (!session) return;
    const hasDemo = bills.some((b) => b.organizerId === session.userId && b.demo);
    const user = { id: session.userId, name: session.name, email: session.email };
    const next = hasDemo
      ? bills.filter((b) => !(b.organizerId === session.userId && b.demo))
      : [demoBill(user, 'Bali Trip 2025', 'trip', 1280, 4, 6, 14), demoBill(user, 'Friday Makan Team', 'makan', 360, 3, 5, 3), demoBill(user, 'House Utilities May', 'house', 420, 1, 4, -2), ...bills];
    await storage.set('bills', next);
    setBills(next);
    show(hasDemo ? 'Demo data removed' : 'Demo data added');
  };

  const updateBill = async (nextBill) => {
    const next = bills.map((b) => b.id === nextBill.id ? nextBill : b);
    await storage.set('bills', next);
    setBills(next);
  };

  const logout = async () => {
    await storage.remove('session');
    setSession(null);
    go('/login');
  };

  const requireAuth = (view) => session ? view : <Auth mode="login" users={users} setUsers={setUsers} setSession={setSession} seedDemo={seedDemo} />;
  const billId = route.match(/^\/bill\/([^/]+)/)?.[1];
  const payMatch = route.match(/^\/pay\/([^/]+)(?:\/([^/]+))?/);
  const payId = payMatch?.[1];
  const payParticipantId = payMatch?.[2];
  const page = payId ? <PaymentPage bill={bills.find((b) => b.id === payId)} participantIdFromRoute={payParticipantId} updateBill={updateBill} />
    : billId ? requireAuth(<BillDetail bill={bills.find((b) => b.id === billId)} showToast={show} />)
    : route === '/login' ? <Auth mode="login" users={users} setUsers={setUsers} setSession={setSession} seedDemo={seedDemo} />
    : route === '/signup' ? <Auth mode="signup" users={users} setUsers={setUsers} setSession={setSession} seedDemo={seedDemo} />
    : route === '/dashboard' ? requireAuth(<Dashboard session={session} bills={bills} loading={loading} showToast={show} onToggleDemo={toggleDemoData} />)
    : route === '/create' ? requireAuth(<CreateBill session={session} bills={bills} setBills={setBills} />)
    : route === '/' ? <Landing /> : <NotFound />;

  return <div className="bayar-app">{page}<Toasts items={toasts} /></div>;
}

function demoBill(user, title, category, total, paidCount, peopleCount, dueOffset) {
  const due = new Date();
  due.setDate(due.getDate() + dueOffset);
  const names = ['Aina', 'Hakim', 'Danial', 'Maya', 'Idris', 'Adam'];
  const amount = Number((total / peopleCount).toFixed(2));
  return {
    id: uid('bill'), organizerId: user.id, organizerName: user.name, title, category, demo: true,
    description: `${CATEGORIES[category].label} expenses shared with the group.`, totalAmount: total,
    dueDate: due.toISOString().slice(0, 10), createdAt: new Date().toISOString(),
    participants: Array.from({ length: peopleCount }).map((_, index) => ({
      id: uid('part'), name: names[index], email: `${names[index].toLowerCase()}@email.com`, amount: index === peopleCount - 1 ? Number((total - amount * (peopleCount - 1)).toFixed(2)) : amount,
      paid: index < paidCount, paidAt: index < paidCount ? new Date().toISOString() : null, receipt: null,
    })),
  };
}
