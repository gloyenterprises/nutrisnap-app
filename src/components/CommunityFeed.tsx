import React, { useState } from 'react';
import type { CommunityPost, UserProfile, Comment } from '../types';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';

const mockPosts: CommunityPost[] = [
  {
    id: 1,
    author: 'HealthyHannah',
    avatarUrl: 'https://picsum.photos/id/1027/100/100',
    content: "Just hit my 30-day streak of tracking every meal! Feeling so proud and energetic. This app has been a game-changer for my relationship with food. ✨",
    timestamp: '2h ago',
    likes: 42,
    comments: [
      { id: 101, author: 'Fit foodie_Jen', avatarUrl: 'https://picsum.photos/id/1011/100/100', content: 'So inspiring! Keep it up!', timestamp: '1h ago' },
      { id: 102, author: 'MarathonMom', avatarUrl: 'https://picsum.photos/id/1005/100/100', content: 'You got this!! 💪', timestamp: '30m ago' },
    ],
    isLiked: false,
  },
  {
    id: 2,
    author: 'Fit foodie_Jen',
    avatarUrl: 'https://picsum.photos/id/1011/100/100',
    content: "Tried the 'Mediterranean Quinoa Salad' from the recipe finder and it was AMAZING! So delicious and filling. Highly recommend for a quick lunch.",
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop',
    timestamp: '5h ago',
    likes: 29,
    comments: [],
    isLiked: true,
  },
  {
    id: 3,
    author: 'MarathonMom',
    avatarUrl: 'https://picsum.photos/id/1005/100/100',
    content: "It's been a tough week, and I definitely had some comfort food. But instead of feeling guilty, I just logged it and moved on. Progress, not perfection, right? Sending support to anyone who needs it!",
    timestamp: '1d ago',
    likes: 153,
    comments: [],
    isLiked: false,
  },
];

interface CommunityFeedProps {
  userProfile: UserProfile | null;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ userProfile }) => {
  const [posts, setPosts] = useState<CommunityPost[]>(mockPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const [openCommentsId, setOpenCommentsId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});

  const handlePost = () => {
    if (!newPostContent.trim() || !userProfile) return;

    const newPost: CommunityPost = {
      id: Date.now(),
      author: userProfile.name,
      avatarUrl: userProfile.avatarUrl,
      content: newPostContent,
      timestamp: 'Just now',
      likes: 0,
      comments: [],
      isLiked: false,
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
  };

  const handleLike = (postId: number) => {
    setPosts(
      posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            isLiked: !post.isLiked,
          };
        }
        return post;
      })
    );
  };

  const handleCommentInputChange = (postId: number, text: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: text,
    }));
  };

  const handleCommentSubmit = (postId: number) => {
    const content = commentInputs[postId];
    if (!content?.trim() || !userProfile) return;

    const newComment: Comment = {
      id: Date.now(),
      author: userProfile.name,
      avatarUrl: userProfile.avatarUrl,
      content,
      timestamp: 'Just now',
    };

    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment],
        };
      }
      return post;
    }));

    handleCommentInputChange(postId, '');
  };

  const toggleComments = (postId: number) => {
    setOpenCommentsId(prevId => (prevId === postId ? null : postId));
  };
  
  const handleDeletePost = (postId: number) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
        setPosts(posts.filter(p => p.id !== postId));
    }
  };


  return (
    <div className="max-w-2xl mx-auto">
       <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Community Wins</h1>
        <p className="text-md text-gray-500 dark:text-gray-400 mt-2">Share your progress and cheer each other on!</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
        <textarea 
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          className="w-full p-2 border border-teal-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400" 
          placeholder={userProfile ? "Share a win or ask for support..." : "Please sign up to join the conversation!"}
          disabled={!userProfile}
          aria-label="New post content"
        ></textarea>
        <div className="text-right mt-2">
            <button 
              onClick={handlePost}
              disabled={!newPostContent.trim() || !userProfile}
              className="bg-teal-500 text-white font-bold py-2 px-6 rounded-full hover:bg-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed"
            >
              Post
            </button>
        </div>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="flex items-start">
              <img src={post.avatarUrl} alt={post.author} className="w-12 h-12 rounded-full mr-4" />
              <div className="flex-grow">
                <div className="flex items-baseline justify-between">
                  <p className="font-bold text-gray-800 dark:text-gray-100">{post.author}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400">{post.timestamp}</p>
                    {userProfile && post.author === userProfile.name && (
                        <button onClick={() => handleDeletePost(post.id)} title="Delete post" className="text-gray-400 hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-gray-700 dark:text-gray-300">{post.content}</p>
                {post.imageUrl && (
                    <img src={post.imageUrl} alt="User post" className="mt-3 rounded-lg w-full object-cover max-h-80 border dark:border-gray-700" />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6">
                <button 
                  onClick={() => handleLike(post.id)} 
                  className={`flex items-center gap-1 hover:text-red-500 transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                  aria-label={`Like post by ${post.author}`}
                >
                    <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'}/>
                    <span className="text-sm">{post.likes}</span>
                </button>
                 <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-teal-500 transition-colors" aria-label={`View comments on post by ${post.author}`}>
                    <MessageCircle size={18} />
                    <span className="text-sm">{post.comments.length}</span>
                </button>
            </div>
            {openCommentsId === post.id && (
                <div className="mt-4 pt-4 border-t border-teal-100 dark:border-gray-700">
                    {userProfile && (
                    <div className="flex items-start gap-3 mb-4">
                        <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-9 h-9 rounded-full" />
                        <form 
                        onSubmit={(e) => { e.preventDefault(); handleCommentSubmit(post.id); }}
                        className="flex-grow flex gap-2"
                        >
                        <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700"
                            aria-label="Write a comment"
                        />
                        <button type="submit" disabled={!commentInputs[post.id]?.trim()} className="bg-teal-500 text-white font-bold px-4 rounded-full hover:bg-teal-600 transition-colors disabled:bg-teal-300">
                            Post
                        </button>
                        </form>
                    </div>
                    )}
                    <div className="space-y-3">
                    {post.comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                        <img src={comment.avatarUrl} alt={comment.author} className="w-9 h-9 rounded-full" />
                        <div>
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3">
                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{comment.author}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 ml-3">{comment.timestamp}</p>
                        </div>
                        </div>
                    ))}
                    {post.comments.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No comments yet. Be the first to reply!</p>
                    )}
                    </div>
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
