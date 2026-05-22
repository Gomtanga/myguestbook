"use client";

import { useState } from "react";
import { MessageSquareQuote, Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedUpSuccess, setIsSignedUpSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message || "로그인에 실패했습니다. 비밀번호를 확인해주세요.");
      return;
    }

    if (data.user) {
      // 소속 학과가 설정되어 있는지 검증
      const { data: profile } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile && profile.department_id) {
        router.push("/");
      } else {
        router.push("/select");
      }
      router.refresh();
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setErrorMsg("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message || "회원가입에 실패했습니다.");
      return;
    }

    // 만약 Supabase 설정에 따라 세션이 즉시 생성되었다면 자동 로그인 처리
    if (data.session) {
      router.push("/select");
      router.refresh();
    } else {
      // 이메일 확인 절차가 켜져 있는 경우 완료 화면 출력
      setIsSignedUpSuccess(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (isSignUpMode) {
        await handleSignUp();
      } else {
        await handleLogin();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
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
          <h2 className="text-2xl font-bold mb-2">
            {isSignUpMode ? "새로운 계정 만들기" : "반가워요! 학우님"}
          </h2>
          <p className="text-secondary-foreground/60 text-sm">
            {isSignUpMode 
              ? "이메일과 비밀번호를 입력하여 방명록 계정을 생성하세요." 
              : "이메일과 비밀번호를 입력해 우리 학과 방명록에 로그인하세요."}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          {isSignedUpSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">인증 메일 전송 완료</h3>
              <p className="text-secondary-foreground/70 text-sm mb-8 leading-relaxed">
                계정 생성을 완료하려면 <span className="font-semibold">{email}</span> 주소로 전송된 <br />
                이메일 인증 링크를 클릭하여 계정을 활성화해주세요.
              </p>
              <button 
                onClick={() => {
                  setIsSignedUpSuccess(false);
                  setIsSignUpMode(false);
                }}
                className="text-primary font-semibold hover:underline text-sm"
              >
                로그인 화면으로 이동하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 ml-1">이메일 주소</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-foreground/40" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@univ.ac.kr"
                    className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 ml-1">비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-foreground/40" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                  />
                </div>
              </div>

              {isSignUpMode && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-semibold mb-2 ml-1">비밀번호 확인</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-foreground/40" size={18} />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-medium animate-shake">
                  {errorMsg}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50 text-sm font-medium"
              >
                <span>
                  {isSubmitting 
                    ? (isSignUpMode ? "회원가입 진행 중..." : "로그인 중...") 
                    : (isSignUpMode ? "가입하기" : "로그인")}
                </span>
                {!isSubmitting && <ArrowRight size={18} />}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setErrorMsg("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {isSignUpMode 
                    ? "이미 계정이 있으신가요? 로그인하기" 
                    : "아직 계정이 없으신가요? 회원가입하기"}
                </button>
              </div>
            </form>
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
