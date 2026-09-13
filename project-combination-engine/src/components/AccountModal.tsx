import React, { useEffect, useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccountModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, logout, deleteAccount } = useAuth(); const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null); const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (open) fetch('/api/billing').then(r => r.json()).then(b => setCheckoutUrl(b.checkoutUrl)).catch(() => {}); }, [open]);
  if (!open || !user) return null;
  const pro = user.plan === 'pro';
  return <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-start"><div><p className="text-xs font-black text-toss-blue uppercase tracking-wider">내 계정</p><h2 className="text-xl font-extrabold mt-1 dark:text-zinc-100">{user.name}님 · {pro ? 'Pro' : 'Free'}</h2><p className="text-xs text-toss-muted mt-1">{user.email}</p></div><button onClick={onClose} className="p-2 cursor-pointer"><X className="w-5 h-5" /></button></div>
      <div className="grid sm:grid-cols-2 gap-4 mt-7">
        <Plan title="Free" price="₩0" active={!pro} items={["네트워크 2개", "네트워크당 인물 25명", "AI 분석 월 10회"]} />
        <Plan title="Pro" price="₩9,900 / 월" active={pro} items={["네트워크 최대 100개", "네트워크당 인물 1,000명", "AI 분석 월 300회"]} action={!pro ? <button onClick={() => checkoutUrl ? window.location.assign(checkoutUrl) : alert('결제 링크가 아직 연결되지 않았습니다. 운영 환경에 PRO_CHECKOUT_URL을 설정해주세요.')} className="w-full mt-4 py-2.5 bg-toss-blue text-white rounded-xl text-xs font-bold cursor-pointer">Pro로 업그레이드</button> : undefined} />
      </div>
      <div className="mt-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed flex gap-3"><ShieldCheck className="w-5 h-5 shrink-0" /><span><strong>개인정보 보호:</strong> 비밀번호는 복구할 수 없는 방식으로 해시되며, 인물·연락처·관계 데이터는 AES-256-GCM으로 암호화되어 사용자별 저장소에 보관됩니다. 필요한 정보만 입력하고 당사자의 동의 없이 민감정보를 기록하지 마세요.</span></div>
      <div className="mt-6 pt-5 border-t border-toss-border dark:border-zinc-800 flex justify-between items-center gap-3"><button onClick={() => { logout(); onClose(); }} className="text-xs font-bold text-toss-sub-text cursor-pointer">로그아웃</button>{confirmDelete ? <div className="flex items-center gap-2"><span className="text-[11px] text-rose-500">모든 데이터가 영구 삭제됩니다.</span><button onClick={() => deleteAccount()} className="text-xs font-bold text-rose-600 cursor-pointer">삭제 확정</button><button onClick={() => setConfirmDelete(false)} className="text-xs cursor-pointer">취소</button></div> : <button onClick={() => setConfirmDelete(true)} className="text-xs font-bold text-rose-500 cursor-pointer">계정 및 데이터 삭제</button>}</div>
    </div>
  </div>;
};

const Plan: React.FC<{ title: string; price: string; active: boolean; items: string[]; action?: React.ReactNode }> = ({ title, price, active, items, action }) => <div className={`rounded-2xl border p-5 ${active ? 'border-toss-blue bg-blue-50/40 dark:bg-blue-950/10' : 'border-toss-border dark:border-zinc-800'}`}><div className="flex justify-between"><h3 className="font-extrabold dark:text-zinc-100">{title}</h3>{active && <span className="text-[10px] font-black text-toss-blue">현재 요금제</span>}</div><p className="text-xl font-black mt-2 dark:text-zinc-100">{price}</p><ul className="mt-4 space-y-2">{items.map(item => <li key={item} className="flex gap-2 text-xs text-toss-sub-text dark:text-zinc-400"><Check className="w-3.5 h-3.5 text-toss-blue" />{item}</li>)}</ul>{action}</div>;
