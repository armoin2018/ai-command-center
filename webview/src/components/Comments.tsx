import React from 'react';
import { TreeNodeData } from '../types/tree';
import './Comments.css';

interface Comment {
    id: string;
    itemId: string;
    author: string;
    text: string;
    createdOn: string;
    updatedAt?: string;
    parentId?: string;
    mentions?: string[];
}

interface CommentsProps {
    itemId: string;
    onClose: () => void;
}

export const Comments: React.FC<CommentsProps> = ({ itemId, onClose }) => {
    const [comments, setComments] = React.useState<Comment[]>([]);
    const [newComment, setNewComment] = React.useState('');
    const [replyTo, setReplyTo] = React.useState<string | null>(null);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editText, setEditText] = React.useState('');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        loadComments();
    }, [itemId]);

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyTo, editingId]);

    const loadComments = () => {
        const stored = localStorage.getItem(`comments-${itemId}`);
        if (stored) {
            setComments(JSON.parse(stored));
        }
    };

    const saveComments = (updatedComments: Comment[]) => {
        localStorage.setItem(`comments-${itemId}`, JSON.stringify(updatedComments));
        setComments(updatedComments);
    };

    const extractMentions = (text: string): string[] => {
        const mentionRegex = /@(\w+)/g;
        const matches = text.match(mentionRegex);
        return matches ? matches.map(m => m.slice(1)) : [];
    };

    const renderMarkdown = (text: string): React.ReactNode => {
        // Simple markdown rendering
        let rendered = text;

        // Bold **text**
        rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic *text*
        rendered = rendered.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Code `code`
        rendered = rendered.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Mentions @user
        rendered = rendered.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

        return <span dangerouslySetInnerHTML={{ __html: rendered }} />;
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: `comment-${Date.now()}`,
            itemId,
            author: 'Current User', // TODO: Get from context
            text: newComment,
            createdOn: new Date().toISOString(),
            parentId: replyTo || undefined,
            mentions: extractMentions(newComment)
        };

        saveComments([...comments, comment]);
        setNewComment('');
        setReplyTo(null);
    };

    const handleEditComment = (id: string) => {
        const comment = comments.find(c => c.id === id);
        if (comment) {
            setEditingId(id);
            setEditText(comment.text);
        }
    };

    const handleSaveEdit = () => {
        if (!editText.trim() || !editingId) return;

        const updated = comments.map(c =>
            c.id === editingId
                ? { ...c, text: editText, updatedAt: new Date().toISOString(), mentions: extractMentions(editText) }
                : c
        );

        saveComments(updated);
        setEditingId(null);
        setEditText('');
    };

    const handleDeleteComment = (id: string) => {
        if (confirm('Delete this comment?')) {
            const updated = comments.filter(c => c.id !== id && c.parentId !== id);
            saveComments(updated);
        }
    };

    const handleReply = (id: string) => {
        setReplyTo(id);
        setEditingId(null);
    };

    const getCommentThread = (commentId: string): Comment[] => {
        return comments.filter(c => c.parentId === commentId);
    };

    const renderComment = (comment: Comment, level: number = 0) => {
        const thread = getCommentThread(comment.id);
        const isEditing = editingId === comment.id;

        return (
            <div key={comment.id} className="comment" style={{ marginLeft: `${level * 20}px` }}>
                <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-time">
                        {new Date(comment.createdOn).toLocaleString()}
                        {comment.updatedAt && ' (edited)'}
                    </span>
                </div>

                {isEditing ? (
                    <div className="comment-edit">
                        <textarea
                            ref={textareaRef}
                            className="comment-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                        />
                        <div className="comment-actions">
                            <button className="btn-primary" onClick={handleSaveEdit}>
                                Save
                            </button>
                            <button className="btn-secondary" onClick={() => setEditingId(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="comment-text">
                            {renderMarkdown(comment.text)}
                        </div>
                        <div className="comment-actions">
                            <button className="btn-link" onClick={() => handleReply(comment.id)}>
                                Reply
                            </button>
                            <button className="btn-link" onClick={() => handleEditComment(comment.id)}>
                                Edit
                            </button>
                            <button className="btn-link danger" onClick={() => handleDeleteComment(comment.id)}>
                                Delete
                            </button>
                        </div>
                    </>
                )}

                {thread.length > 0 && (
                    <div className="comment-thread">
                        {thread.map(reply => renderComment(reply, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const rootComments = comments.filter(c => !c.parentId);

    return (
        <div className="comments-overlay" onClick={onClose}>
            <div className="comments-panel" onClick={(e) => e.stopPropagation()}>
                <div className="comments-header">
                    <h3>Comments</h3>
                    <button className="close-button" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="comments-list">
                    {rootComments.length === 0 ? (
                        <div className="no-comments">No comments yet</div>
                    ) : (
                        rootComments.map(comment => renderComment(comment))
                    )}
                </div>

                <div className="comment-form">
                    {replyTo && (
                        <div className="reply-to">
                            Replying to{' '}
                            <strong>{comments.find(c => c.id === replyTo)?.author}</strong>
                            <button className="btn-link" onClick={() => setReplyTo(null)}>
                                Cancel
                            </button>
                        </div>
                    )}
                    <textarea
                        ref={!editingId ? textareaRef : undefined}
                        className="comment-textarea"
                        placeholder="Add a comment... (supports **bold**, *italic*, `code`, @mentions)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                    />
                    <div className="comment-form-actions">
                        <button className="btn-primary" onClick={handleAddComment}>
                            {replyTo ? 'Reply' : 'Comment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
