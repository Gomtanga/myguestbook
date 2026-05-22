"use client";

import { useState } from "react";
import { MessageSquareQuote, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const universities = ["한남대학교", "충남대학교", "대전대학교", "배재대학교"];
const colleges = ["경상대학", "공과대학", "문과대학", "사회과학대학"];
const departments = ["경영학과", "경제학과", "무역학과", "컨벤션호텔경영학과"];

export default function SelectDepartmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState({
    univ: "",
    college: "",
    dept: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // 1. 학과 정보 조회 및 자동 생성
      let { data: dept } = await supabase
        .from("departments")
        .select("id")
        .eq("university", selected.univ)
        .eq("college", selected.college)
        .eq("name", selected.dept)
        .maybeSingle();

      if (!dept) {
        const slug = `${selected.univ}-${selected.college}-${selected.dept}`.replace(/\s+/g, '-');
        const { data: newDept, error: insertError } = await supabase
          .from("departments")
          .insert({
            university: selected.univ,
            college: selected.college,
            name: selected.dept,
            slug: slug
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          const fallbackSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
          const { data: retryDept } = await supabase
            .from("departments")
            .insert({
              university: selected.univ,
              college: selected.college,
              name: selected.dept,
              slug: fallbackSlug
            })
            .select("id")
            .maybeSingle();
          dept = retryDept;
        } else {
          dept = newDept;
        }
      }

      if (!dept) {
        throw new Error("학과 등록 실패");
      }

      // 2. 로그인 사용자 여부에 따라 처리
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: session.user.id,
            department_id: dept.id,
          });
        if (profileError) throw profileError;
      } else {
        localStorage.setItem("guest_dept_id", dept.id);
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("학과 설정 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
              <MessageSquareQuote size={24} />
            </div>
            <span className="font-outfit font-bold text-2xl tracking-tight">DeptGuest</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">학과를 선택해주세요</h2>
          <p className="text-secondary-foreground/60">소속 학과 방명록으로 바로 안내해 드릴게요.</p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-8 bg-primary" : "w-1.5 bg-black/10"
              }`}
            />
          ))}
        </div>

        <div className="glass-card rounded-3xl p-6 min-h-[400px] flex flex-col">
          <div className="flex-1">
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-secondary-foreground/50 mb-4 uppercase tracking-wider">대학교 선택</h3>
                {universities.map((u) => (
                  <button
                    key={u}
                    onClick={() => { setSelected({ ...selected, univ: u }); nextStep(); }}
                    className={`w-full p-4 text-left rounded-2xl transition-all border-2 
                      ${selected.univ === u ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-black/5 hover:bg-black/10"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{u}</span>
                      {selected.univ === u && <Check size={20} />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-secondary-foreground/50 mb-4 uppercase tracking-wider">{selected.univ} • 단과대</h3>
                {colleges.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setSelected({ ...selected, college: c }); nextStep(); }}
                    className={`w-full p-4 text-left rounded-2xl transition-all border-2 
                      ${selected.college === c ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-black/5 hover:bg-black/10"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{c}</span>
                      {selected.college === c && <Check size={20} />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-secondary-foreground/50 mb-4 uppercase tracking-wider">{selected.college} • 학과</h3>
                {departments.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setSelected({ ...selected, dept: d }); }}
                    className={`w-full p-4 text-left rounded-2xl transition-all border-2 
                      ${selected.dept === d ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-black/5 hover:bg-black/10"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{d}</span>
                      {selected.dept === d && <Check size={20} />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button onClick={prevStep} className="btn-secondary flex-1 py-4">이전</button>
            )}
            {step === 3 && selected.dept && (
              <button 
                onClick={handleComplete} 
                disabled={isSubmitting}
                className="btn-primary flex-1 py-4 disabled:opacity-50"
              >
                {isSubmitting ? "입장 중..." : "방명록 입장하기"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
