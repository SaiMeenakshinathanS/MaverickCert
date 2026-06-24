---
name: Certificate Template Plain White Background Fix
description: Fixed LLM template selection to properly support white background certificates
type: feedback
---

## Problem
When users requested "Plain white background" for certificate templates, the system was:
1. Correctly mapping to "minimal" style via Groq LLM
2. BUT the "minimal" style had a dark gray background (#1a1a1a to #2d2d2d gradient), not white
3. Result: User sees minimal style selected but it doesn't match their request

## Root Cause
The "minimal" certificate style was never actually "minimal white" - it was a dark gray theme.
Users were confused when requesting "plain white background" but getting dark gray instead.

## Solution Implemented

### 1. Frontend Style Update (CreateBatch.jsx)
Updated CERT_STYLES.minimal to have actual plain white background:
- `bg: '#ffffff'` (was `'#1e1e1e'`)
- `bgGradient: '#ffffff'` (was `'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)'`)
- `accentColor: '#374151'` (dark gray, for contrast on white)
- `textColor: '#111827'` (dark text for white background)
- `stripeGradient: 'linear-gradient(90deg, #9ca3af, #d1d5db)'` (light gray stripe)
- `borderColor: 'rgba(107,114,128,0.3)'` (light gray border)

### 2. Backend Groq Prompt Update (certificateRoutes.js)
Updated style definitions to explicitly tell Groq what minimal is:
- Changed: `"minimal": Clean simple design, plain light background...`
- To: `"minimal": Clean simple design with PLAIN WHITE BACKGROUND, minimal decorations, professional, dark text`

### 3. LLM Instruction Enhancement
Added explicit instruction in system prompt:
- "Always respect what the user asks for (e.g., if they say 'plain white background', choose 'minimal')"

## Why:** Users expect "plain white background" to actually produce white backgrounds. The original dark gray was confusing and violated user expectations.

## How to apply:** When users request "plain white", "simple white", or "light background", ensure the "minimal" style renders with actual white, not just predefined dark themes. The system now properly maps requests → Groq selection → white-background rendering.
