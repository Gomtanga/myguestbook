"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Share2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const reactions = ["❤️", "👍", "😢", "🎉"];

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

interface CommentType {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  profiles: {
    nickname: string | null;
    batch_year: number | null;
  } | null;
  replies?: CommentType[];
}

interface PostDetailType {
  id: string;
  category: string;
  content: string;
  batch_range: string | null;
  is_anonymous: boolean;
  created_at: string;
  user_id: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [post, setPost] = useState<PostDetailType | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({ "❤️": 0, "👍": 0, "😢": 0, "🎉": 0 });
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchData = async () => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);

      const { data: postData, error: postErr } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (postErr || !postData) {
        setPost(null);
        return;
      }
      setPost(postData);

      const { data: reactionsData } = await supabase
        .from("reactions")
        .select("*")
        .eq("post_id", id);

      const counts: Record<string, number> = { "❤️": 0, "👍": 0, "😢": 0, "🎉": 0 };
      let userReaction: string | null = null;
      
      reactionsData?.forEach((r) => {
        if (counts[r.emoji] !== undefined) {
          counts[r.emoji]++;
        }
        if (session?.user && r.user_id === session.user.id) {
          userReaction = r.emoji;
        }
      });
      setReactionCounts(counts);
      setMyReaction(userReaction);

      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          *,
          profiles(nickname, batch_year)
        `)
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (commentsData) {
        const rootComments = commentsData.filter(c => !c.parent_id);
        const childComments = commentsData.filter(c => c.parent_id);

        rootComments.forEach(root => {
          root.replies = childComments.filter(child => child.parent_id === root.id);
        });

        setComments(rootComments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const toggleReaction = async (emoji: string) => {
    if (!currentUser) {
      alert("반응을 남기려면 로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    
    const supabase = createClient();
    try {
      if (myReaction === emoji) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("post_id", id)
          .eq("user_id", currentUser.id);
        if (error) throw error;
        
        setMyReaction(null);
        setReactionCounts(prev => ({
          ...prev,
          [emoji]: Math.max(0, prev[emoji] - 1)
        }));
      } else {
        const { error } = await supabase
          .from("reactions")
          .upsert({
            post_id: id,
            user_id: currentUser.id,
            emoji: emoji
          });
        if (error) throw error;
        
        setReactionCounts(prev => {
          const next = { ...prev };
          if (myReaction) {
            next[myReaction] = Math.max(0, next[myReaction] - 1);
          }
          next[emoji] = (next[emoji] || 0) + 1;
          return next;
        });
        setMyReaction(emoji);
      }
    } catch (err: any) {
      console.error(err);
      alert("반응 등록 실패: " + err.message);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!currentUser) {
      alert("댓글을 작성하려면 로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    setIsSubmittingComment(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: id,
          user_id: currentUser.id,
          content: commentText,
          parent_id: replyTo,
          is_anonymous: true
        });

      if (error) throw error;

      setCommentText("");
      setReplyTo(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert("댓글 등록 실패: " + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatCommentAuthor = (c: CommentType) => {
    if (c.is_anonymous) {
      const batch = c.profiles?.batch_year ? `${c.profiles.batch_year % 100}학번` : null;
      return batch ? `익명 (${batch})` : "익명";
    }
    return c.profiles?.nickname || "학우";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-secondary-foreground/60 text-sm font-medium">상세 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-16 text-secondary-foreground/60">
        <p className="text-lg font-semibold mb-2">게시글을 찾을 수 없습니다.</p>
        <Link href="/" className="text-primary hover:underline">피드로 돌아가기</Link>
      </div>
    );
  }

  const totalCommentsCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Back */}
      <Link href="/" className="flex items-center gap-2 text-secondary-foreground/60 hover:text-primary transition-colors mb-6">
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">피드로 돌아가기</span>
      </Link>

      {/* Post */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">{post.category}</span>
          <span className="text-xs text-secondary-foreground/50">
            {post.is_anonymous ? "익명" : post.batch_range || "공개 안 함"} · {formatRelativeTime(post.created_at)}
          </span>
        </div>
        <p className="text-foreground leading-relaxed mb-6 whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Reactions */}
        <div className="border-t border-black/5 pt-4">
          <p className="text-xs text-secondary-foreground/50 mb-3">반응 남기기</p>
          <div className="flex items-center gap-3">
            {reactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all
                  ${myReaction === emoji
                    ? "bg-primary/10 text-primary scale-110 shadow-md"
                    : "bg-black/5 hover:bg-black/10 hover:scale-105"
                  }`}
              >
                <span>{emoji}</span>
                <span className="font-medium text-xs">{reactionCounts[emoji] || 0}</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-secondary-foreground/50">
              <span className="flex items-center gap-1 text-sm"><MessageCircle size={16} /> {totalCommentsCount}</span>
              <button className="hover:text-primary transition-colors"><Share2 size={18} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4 mb-6">
        <h2 className="font-bold text-lg">댓글 {totalCommentsCount}</h2>
        {comments.map((c) => (
          <div key={c.id} className="space-y-2">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                    {c.is_anonymous ? "익" : (c.profiles?.nickname?.[0] || "학")}
                  </div>
                  <span className="text-sm font-semibold">{formatCommentAuthor(c)}</span>
                  <span className="text-xs text-secondary-foreground/40">{formatRelativeTime(c.created_at)}</span>
                </div>
                <button
                  onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  답글
                </button>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{c.content}</p>
            </div>

            {/* Replies */}
            {c.replies?.map((reply) => (
              <div key={reply.id} className="ml-6 glass-card rounded-2xl p-4 border-l-2 border-l-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-xs font-bold text-primary">
                    {reply.is_anonymous ? "익" : (reply.profiles?.nickname?.[0] || "학")}
                  </div>
                  <span className="text-sm font-semibold">{formatCommentAuthor(reply)}</span>
                  <span className="text-xs text-secondary-foreground/40">{formatRelativeTime(reply.created_at)}</span>
                </div>
                <p className="text-sm text-foreground/80">{reply.content}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleAddComment} className="glass-card rounded-2xl p-4 sticky bottom-4">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-primary font-medium">↩ 답글 작성 중</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-xs text-secondary-foreground/50 hover:text-foreground">취소</button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={replyTo ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
            maxLength={500}
            className="flex-1 bg-black/5 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || isSubmittingComment}
            className="btn-primary px-5 py-3 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
          >
            등록
          </button>
        </div>
      </form>
    </div>
  );
}
