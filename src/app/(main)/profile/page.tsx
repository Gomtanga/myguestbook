"use client";

import { useEffect, useState } from "react";
import { User, FileText, ChevronRight, LogOut, Edit2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface PostType {
  id: string;
  category: string;
  content: string;
  created_at: string;
  reactions: { emoji: string }[];
  comments: { id: string }[];
}

interface ProfileType {
  nickname: string | null;
  batch_year: number | null;
  departments: {
    university: string;
    college: string;
    name: string;
  } | null;
}

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

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [nickname, setNickname] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchProfileAndPosts = async () => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }
      setCurrentUser(session.user);

      // Fetch Profile with Department
      const { data: profileData } = await supabase
        .from("profiles")
        .select(`
          nickname,
          batch_year,
          departments(university, college, name)
        `)
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as any);
        setNickname(profileData.nickname || "학우");
      }

      // Fetch User's Posts
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id,
          category,
          content,
          created_at,
          reactions:reactions(emoji),
          comments:comments(id)
        `)
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (postsData) {
        setPosts(postsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndPosts();
  }, [router]);

  const handleSaveNickname = async () => {
    if (!nickname.trim() || !currentUser) return;
    setIsSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: nickname.trim() })
        .eq("id", currentUser.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      alert("닉네임 변경에 실패했습니다: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("guest_dept_id"); // clear guest selection as well
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-secondary-foreground/60 text-sm font-medium">프로필 정보를 불러오는 중...</p>
      </div>
    );
  }

  const totalPostsCount = posts.length;
  const totalReactionsReceived = posts.reduce((acc, p) => acc + (p.reactions?.length || 0), 0);
  const totalCommentsReceived = posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      {/* Profile Card */}
      <div className="glass-card rounded-3xl p-8 text-center">
        <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
          <User size={40} />
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2 justify-center mb-2">
            <input
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={isSaving}
              className="text-lg font-bold text-center bg-black/5 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              maxLength={30}
            />
            <button
              onClick={handleSaveNickname}
              disabled={isSaving}
              className="text-primary text-sm font-semibold hover:underline disabled:opacity-50"
            >
              저장
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center mb-2">
            <h2 className="text-xl font-bold">{nickname}</h2>
            <button onClick={() => setIsEditing(true)} className="text-secondary-foreground/40 hover:text-primary transition-colors">
              <Edit2 size={16} />
            </button>
          </div>
        )}

        <p className="text-secondary-foreground/60 text-sm">
          {profile?.departments 
            ? `${profile.departments.university} · ${profile.departments.college} · ${profile.departments.name}`
            : "학과 미지정"}
        </p>
        <p className="text-xs text-secondary-foreground/40 mt-1">인증 완료 ✓</p>

        <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-black/5">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totalPostsCount}</p>
            <p className="text-xs text-secondary-foreground/50 mt-1">작성한 글</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totalReactionsReceived}</p>
            <p className="text-xs text-secondary-foreground/50 mt-1">받은 반응</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totalCommentsReceived}</p>
            <p className="text-xs text-secondary-foreground/50 mt-1">받은 댓글</p>
          </div>
        </div>
      </div>

      {/* My Posts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-primary" />
          <h3 className="font-bold text-lg">내가 쓴 글</h3>
        </div>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-2xl text-secondary-foreground/40 text-sm">
              아직 작성한 게시글이 없습니다.
            </div>
          ) : (
            posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="glass-card rounded-2xl p-5 flex items-center justify-between hover:shadow-xl transition-shadow group block">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary">{post.category}</span>
                    <span className="text-xs text-secondary-foreground/40">{formatRelativeTime(post.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground/80 truncate">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-secondary-foreground/50">
                    <span>❤️ {post.reactions?.length || 0}</span>
                    <span>💬 {post.comments?.length || 0}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-secondary-foreground/30 group-hover:text-primary transition-colors ml-4 flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all text-sm font-medium"
      >
        <LogOut size={18} />
        로그아웃
      </button>
    </div>
  );
}
