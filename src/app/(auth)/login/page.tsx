"use client";

import { useState } from "react";
import { MessageSquareQuote, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setIsSubmitting(false);
    if (error) {
      setErrorMsg(error.message || "인증 링크를 보내는 데 실패했습니다.");
    } else {
      setIsSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
              <MessageSquareQuote size={28} />
            </div>
            <span className="font-outfit font-bold text-3xl tracking-tight">DeptGuest</span>
          </Link>
          <h2 className="text-2xl font-bold mb-2">반가워요! 학우님</h2>
          <p className="text-secondary-foreground/60">학교 이메일로 인증하고 우리 학과 방명록에 참여하세요.</p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 ml-1">학교 이메일</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-foreground/40" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@univ.ac.kr"
                    className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-medium">
                  {errorMsg}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
              >
                <span>{isSubmitting ? "전송 중..." : "인증 링크 보내기"}</span>
                {!isSubmitting && <ArrowRight size={20} />}
              </button>
              
              <p className="text-center text-xs text-secondary-foreground/50">
                인증을 진행하면 서비스 <span className="underline">이용약관</span> 및 <span className="underline">개인정보 처리방침</span>에 동의하게 됩니다.
              </p>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">이메일 확인</h3>
              <p className="text-secondary-foreground/70 mb-8">
                <span className="font-semibold">{email}</span> 주소로 <br />인증 링크를 보냈습니다.
              </p>
              <button 
                onClick={() => setIsSent(false)}
                className="text-primary font-semibold hover:underline"
              >
                이메일 다시 입력하기
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">
            로그인 없이 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
}
