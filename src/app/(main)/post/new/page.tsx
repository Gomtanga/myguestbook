"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase";

const categories = ["수업후기", "교수님", "취업/인턴", "동아리", "인간관계", "자유"];
const batchOptions = ["공개 안 함", "19학번", "20학번", "21학번", "22학번", "23학번", "24학번", "25학번"];

export default function NewPostPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [batchRange, setBatchRange] = useState("공개 안 함");
  const [showBatch, setShowBatch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("글을 작성하려면 로그인이 필요합니다.");
        router.push("/login");
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile || !profile.department_id) {
        alert("글을 작성하려면 먼저 학과를 설정해 주세요.");
        router.push("/select");
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !content.trim()) return;
    setIsSubmitting(true);
    
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 만료되었습니다. 다시 로그인 해주세요.");
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile?.department_id) {
        alert("학과를 찾을 수 없습니다. 학과를 먼저 선택해 주세요.");
        router.push("/select");
        return;
      }

      const { error } = await supabase
        .from("posts")
        .insert({
          department_id: profile.department_id,
          user_id: session.user.id,
          category,
          content,
          batch_range: batchRange === "공개 안 함" ? null : batchRange,
          is_anonymous: isAnonymous,
        });

      if (error) throw error;

      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert("글 게시 중 오류가 발생했습니다: " + (err.message || "다시 시도해 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold font-outfit">글 작성</h1>
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-black/5 rounded-full transition-colors text-secondary-foreground"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category */}
        <div className="glass-card rounded-2xl p-5">
          <label className="block text-sm font-bold mb-3 text-secondary-foreground/70">카테고리 *</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${category === cat
                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                    : "bg-black/5 text-secondary-foreground hover:bg-black/10"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="glass-card rounded-2xl p-5">
          <label className="block text-sm font-bold mb-3 text-secondary-foreground/70">내용 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={8}
            placeholder="학과 선후배에게 전하고 싶은 이야기를 자유롭게 작성해 주세요."
            className="w-full bg-transparent resize-none outline-none text-foreground placeholder-secondary-foreground/40 leading-relaxed"
          />
          <div className="flex justify-end mt-2">
            <span className={`text-xs font-medium ${content.length > 1800 ? "text-accent" : "text-secondary-foreground/40"}`}>
              {content.length} / 2000
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <label className="block text-sm font-bold text-secondary-foreground/70">작성자 설정</label>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">익명으로 작성</p>
              <p className="text-xs text-secondary-foreground/60">이름 대신 &apos;익명&apos;으로 표시됩니다</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isAnonymous ? "bg-primary" : "bg-black/10"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${isAnonymous ? "left-7" : "left-1"}`} />
            </button>
          </div>

          {/* Batch Range */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">학번 공개</p>
                <p className="text-xs text-secondary-foreground/60">선택적으로 학번대를 공개할 수 있어요</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatch(!showBatch)}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/5 rounded-xl text-sm font-medium hover:bg-black/10 transition-colors"
              >
                <span>{batchRange}</span>
                {showBatch ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            {showBatch && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {batchOptions.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => { setBatchRange(b); setShowBatch(false); }}
                    className={`py-2 rounded-xl text-xs font-medium transition-all
                      ${batchRange === b ? "bg-primary text-white" : "bg-black/5 hover:bg-black/10"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Upload (placeholder) */}
        <button
          type="button"
          className="w-full glass-card rounded-2xl p-5 flex items-center gap-3 text-secondary-foreground/60 hover:text-primary hover:shadow-xl transition-all"
        >
          <ImageIcon size={20} />
          <span className="text-sm font-medium">사진 첨부 (최대 3장)</span>
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={!category || !content.trim() || isSubmitting}
          className="btn-primary w-full py-4 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            "등록하기"
          )}
        </button>
      </form>
    </div>
  );
}
