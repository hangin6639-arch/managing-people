import React, { useState } from 'react';
import { LockKeyhole, Network, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setSubmitting(true); try { if (mode === 'login') await login(email, password); else await register(name, email, password); } catch (e: any) { setError(e.message); } finally { setSubmitting(false); } };
  return <div className="min-h-screen bg-[#F2F4F6] dark:bg-zinc-950 flex items-center justify-center p-6">
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-8 border border-toss-border dark:border-zinc-800 toss-shadow">
      <div className="w-12 h-12 rounded-2xl bg-toss-blue text-white flex items-center justify-center mb-6"><Network className="w-6 h-6" /></div>
      <h1 className="text-2xl font-extrabold text-toss-text dark:text-zinc-100">Project Combination Engine</h1>
      <p className="text-sm text-toss-sub-text dark:text-zinc-400 mt-2">나만의 인적 네트워크를 안전하게 관리하세요.</p>
      <div className="grid grid-cols-2 bg-toss-bg dark:bg-zinc-800 p-1 rounded-xl mt-7 mb-5">
        {(['login','register'] as const).map(item => <button key={item} onClick={() => { setMode(item); setError(''); }} className={`py-2.5 rounded-lg text-xs font-bold cursor-pointer ${mode === item ? 'bg-white dark:bg-zinc-700 text-toss-blue shadow-sm' : 'text-toss-sub-text'}`}>{item === 'login' ? '로그인' : '회원가입'}</button>)}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && <input aria-label="이름" value={name} onChange={e => setName(e.target.value)} placeholder="이름" maxLength={30} required className="w-full px-4 py-3.5 rounded-xl bg-toss-bg dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-toss-blue/30" />}
        <input aria-label="이메일" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" autoComplete="email" required className="w-full px-4 py-3.5 rounded-xl bg-toss-bg dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-toss-blue/30" />
        <input aria-label="비밀번호" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? '비밀번호 (10자 이상)' : '비밀번호'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 10 : undefined} required className="w-full px-4 py-3.5 rounded-xl bg-toss-bg dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-toss-blue/30" />
        {error && <p role="alert" className="text-xs font-semibold text-rose-500">{error}</p>}
        <button disabled={submitting} className="w-full py-3.5 bg-toss-blue text-white rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50">{submitting ? '처리 중...' : mode === 'login' ? '로그인' : 'Free로 시작하기'}</button>
      </form>
      <div className="mt-6 pt-5 border-t border-toss-border dark:border-zinc-800 flex gap-3 text-[11px] leading-relaxed text-toss-muted"><ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /><span>입력한 인물 정보는 사용자별로 분리되고 서버 저장 시 암호화됩니다.</span></div>
    </div>
  </div>;
};
