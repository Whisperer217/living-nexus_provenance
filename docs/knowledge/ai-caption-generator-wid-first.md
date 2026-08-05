---
name: AI Caption Generator Workflow: WID First, Optional AI Captioning (Title/Genre Only)
use_when: When implementing or updating the AI Caption Generator feature, or any feature that involves AI processing of user-uploaded tracks.
---

The AI Caption Generator must **never run before a WID is generated**. Workflow: (1) Creator uploads track. (2) WID generates immediately. (3) After WID is confirmed, show an optional prompt for AI caption generation. (4) If 'Generate Caption' is chosen, only send the track title and genre to the AI - never send lyrics, audio content, or any creative work. (5) A permanent note 'Your lyrics are WID protected and never used for AI training.' must appear under the caption field.
