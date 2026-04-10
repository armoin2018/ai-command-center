---
id: wp-comment
name: wpComment
description: Moderate WordPress comments — list, approve, reject, spam, reply, or delete comments.
keywords: [wordpress, comment, moderation, approve, spam, reply]
tools: [execute, read, edit, search]
agent: AI-ley WordPress
---

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md`

**Persona:** `personas/wordpress-developer.md`

## Task

Moderate WordPress comments:

### Actions

1. **List** — List comments with filters (status, post, author, search, per_page)
2. **Approve** — Approve a pending comment by ID
3. **Reject** — Mark a comment as rejected/trash
4. **Spam** — Mark a comment as spam
5. **Reply** — Reply to a comment by ID with new content
6. **Delete** — Permanently delete a comment by ID

### Comment Statuses

- **approved** — Visible on the site
- **hold** — Pending moderation
- **spam** — Marked as spam
- **trash** — In trash
