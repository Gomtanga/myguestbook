"use client";

import { useEffect, useState } from "react";
import { Pin, MessageCircle, Share2, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const categories = ["전체", "수업후기", "교수님", "취업/인턴", "동아리", "인간관계", "자유"];
const sorts = ["최신순", "반응순", "댓글순"] as const;

function formatRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
}

interface DeptType {
  id: string;
  university: string;
  college: string;
  name: string;
}

interface PostType {
  id: string;
  category: string;
  content: string;
  batch_range: string | null;
  is_anonymous: boolean;
  is_pinned: boolean;
  created_at: string;
  reactions: { emoji: string }[];
  comments: { id: string }[];
  reactionsCount: Record<string, number>;
  totalReactions: number;
  totalComments: number;
}

export default function HomePage() {
  const [activeDept, setActiveDept] = useState<DeptType | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [pinnedPost, setPinnedPost] = useState<PostType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCat, setSelectedCat] = useState("전체");
  const [sort, setSort] = useState<typeof sorts[number]>("최신순");
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [showDeptSelect, setShowDeptSelect] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const supabase = createClient();
      try {
        let deptId: string | null = null;
        
        // 1. 로그인 사용자의 프로필 학과 확인
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("department_id")
            .eq("id", session.user.id)
            .maybeSingle();
            
          if (profile?.department_id) {
            deptId = profile.department_id;
          }
        }
        
        // 2. 비로그인 세션의 guest_dept_id 확인
        if (!deptId) {
          deptId = localStorage.getItem("guest_dept_id");
        }
        
        // 3. 학과 정보 불러오기
        let currentDept: DeptType | null = null;
        if (deptId) {
          const { data: d } = await supabase
            .from("departments")
            .select("*")
            .eq("id", deptId)
            .maybeSingle();
          currentDept = d;
        }
        
        // 4. 설정된 학과가 없는 경우 첫 번째 학과 자동 지정
        if (!currentDept) {
          const { data: depts } = await supabase
            .from("departments")
            .select("*")
            .limit(1);
          if (depts && depts.length > 0) {
            currentDept = depts[0];
            localStorage.setItem("guest_dept_id", depts[0].id);
          }
        }
        
        setActiveDept(currentDept);
        
        if (currentDept) {
          const { data: pData } = await supabase
            .from("posts")
            .select(`
              *,
              reactions:reactions(emoji),
              comments:comments(id)
            `)
            .eq("department_id", currentDept.id)
            .is("deleted_at", null);
            
          if (pData) {
            const formatted: PostType[] = pData.map((post: any) => {
              const counts: Record<string, number> = { "❤️": 0, "👍": 0, "😢": 0, "🎉": 0 };
              post.reactions?.forEach((r: any) => {
                if (counts[r.emoji] !== undefined) {
                  counts[r.emoji]++;
                }
              });
              const totalReactions = post.reactions?.length || 0;
              const totalComments = post.comments?.length || 0;
              return {
                ...post,
                reactionsCount: counts,
                totalReactions,
                totalComments
              };
            });
            
            setPosts(formatted.filter(p => !p.is_pinned));
            setPinnedPost(formatted.find(p => p.is_pinned) || null);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  const filteredPosts = posts
    .filter((p) => {
      const matchCat = selectedCat === "전체" || p.category === selectedCat;
      const matchSearch = search === "" || p.content.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sort === "반응순") {
        return b.totalReactions - a.totalReactions;
      }
      if (sort === "댓글순") {
        return b.totalComments - a.totalComments;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-secondary-foreground/60 text-sm font-medium">글 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <section className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setShowDeptSelect(!showDeptSelect)}
            className="flex items-center gap-1.5 group"
          >
            <h1 className="text-2xl font-bold font-outfit">
              {activeDept ? activeDept.name : "경영학과"}
            </h1>
            <span className={`text-secondary-foreground transition-transform duration-200 ${showDeptSelect ? "rotate-180" : ""}`}>▼</span>
          </button>
          <p className="text-secondary-foreground/60 text-sm">
            {activeDept ? `${activeDept.university} · ${activeDept.college}` : "한남대학교 · 경상대학"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 hover:bg-black/5 rounded-full transition-colors text-secondary-foreground/60"
          >
            <Search size={20} />
          </button>
          <Link href="/post/new" className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
            <Plus size={18} />
            <span>글쓰기</span>
          </Link>
        </div>
      </section>

      {/* Dept Dropdown */}
      {showDeptSelect && (
        <div className="glass-card rounded-2xl p-4 -mt-2">
          <p className="text-xs font-bold text-secondary-foreground/50 mb-2">학과 변경</p>
          <Link href="/select" className="text-primary text-sm font-medium hover:underline">
            다른 학과 방명록으로 이동 →
          </Link>
        </div>
      )}

      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-foreground/40" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="게시글 검색..."
              className="w-full pl-11 pr-4 py-3 bg-white/80 backdrop-blur border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <button
            onClick={() => { setShowSearch(false); setSearch(""); }}
            className="p-3 hover:bg-black/5 rounded-full text-secondary-foreground/60"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Pinned Post */}
      {pinnedPost && (
        <Link 
          href={`/post/${pinnedPost.id}`} 
          className="glass-card rounded-2xl p-5 border-l-4 border-l-primary relative overflow-hidden block hover:shadow-xl transition-shadow"
        >
          <div className="absolute top-2 right-3 text-primary/10">
            <Pin size={48} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-md">📌 필독</span>
            <span className="text-xs text-secondary-foreground/50">
              관리자 · {formatRelativeTime(pinnedPost.created_at)}
            </span>
          </div>
          <p className="font-bold mb-1">공지사항</p>
          <p className="text-sm text-secondary-foreground/70 line-clamp-1">{pinnedPost.content}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-secondary-foreground/50">
            <span>❤️ {pinnedPost.totalReactions}</span><span>💬 {pinnedPost.totalComments}</span>
          </div>
        </Link>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 flex-shrink-0
              ${selectedCat === cat
                ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                : "bg-white/80 text-secondary-foreground hover:bg-white"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sort Tabs */}
      <div className="flex items-center gap-1 border-b border-black/5 pb-0">
        {sorts.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-4 py-2 text-sm font-medium transition-all rounded-t-xl
              ${sort === s
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-secondary-foreground/50 hover:text-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 text-secondary-foreground/40">
            <p className="text-lg mb-1">검색 결과가 없어요</p>
            <p className="text-sm">다른 키워드나 다른 카테고리로 변경해보세요.</p>
          </div>
        ) : (
          filteredPosts.map((post, i) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="glass-card rounded-2xl p-5 hover:shadow-xl transition-all duration-200 block cursor-pointer"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-2 mb-3 text-xs text-secondary-foreground/60">
                <span className="font-bold text-primary">{post.category}</span>
                <span>·</span>
                <span>{post.is_anonymous ? "익명" : post.batch_range || "공개 안 함"}</span>
                <span>·</span>
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>
              <p className="text-foreground/90 leading-relaxed mb-4 line-clamp-2">{post.content}</p>
              <div className="flex items-center justify-between border-t border-black/5 pt-3">
                <div className="flex items-center gap-3">
                  {Object.entries(post.reactionsCount).map(([emoji, count]) => (
                    count > 0 && (
                      <span key={emoji} className="flex items-center gap-1 text-sm text-secondary-foreground/60">
                        {emoji} <span className="font-medium">{count}</span>
                      </span>
                    )
                  ))}
                  {post.totalReactions === 0 && (
                    <span className="text-xs text-secondary-foreground/40">반응 없음</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-secondary-foreground/50">
                  <span className="flex items-center gap-1 text-sm">
                    <MessageCircle size={15} /> {post.totalComments}
                  </span>
                  <Share2 size={16} className="hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-8 right-6 md:hidden">
        <Link href="/post/new" className="w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform">
          <Plus size={26} />
        </Link>
      </div>
    </div>
  );
}
