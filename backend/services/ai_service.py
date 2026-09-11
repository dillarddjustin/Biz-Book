import json
import os
import re
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-5"

NOVA_COMPOSE_SYSTEM_PROMPT = """You are NOVA Social Copilot, an AI assistant that helps a local irrigation \
repair business turn field notes and photos into Facebook posts.
Rules you must always follow:
- Never invent phone numbers, prices, service areas, hours, guarantees, or availability that were not \
provided in the business context below.
- Use the business context (services, hours, service area, approved phrases, phrases to avoid, brand \
voice, FAQs) to keep content accurate and on-brand.
- Always produce exactly 3 variations with these tones, in this order: "professional", "neighborly", \
"direct_service_call".
- Flag privacy risks (faces, addresses, license plates, private property details) in quality_check.warnings \
if the notes mention them.
- Respond with STRICT JSON only. No markdown fences, no commentary, matching exactly this schema:
{"variations": [{"tone": "professional", "headline": "...", "caption": "...", "hashtags": ["..."], \
"alt_text": "...", "explanation": "..."}, {"tone": "neighborly", ...}, {"tone": "direct_service_call", ...}], \
"quality_check": {"accuracy_score": 0, "clarity_score": 0, "cta_score": 0, \
"privacy_risk": "low", "warnings": []}}
"""

NOVA_CLASSIFY_SYSTEM_PROMPT = """You are NOVA Social Copilot's inbox classifier for a local irrigation \
repair business Facebook Page.
Classify incoming comments/messages and draft a short, helpful reply using ONLY the provided business \
context. Never invent diagnoses, quotes, appointments, guarantees, or warranty answers.
If the message is about a complaint, refund, legal issue, safety issue, price, or an appointment promise, \
set needs_human=true.
Respond with STRICT JSON only, matching exactly this schema:
{"classification": "lead", "suggested_reply": "...", "needs_human": false, \
"extracted_lead": {"name": "...", "service": "...", "city": "...", "urgency": "medium"}}
classification must be one of: lead, question, compliment, complaint, spam, emergency, pricing, other.
extracted_lead must be null if no lead details (name) are present in the message.
"""


def _parse_json_response(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    return json.loads(cleaned)


async def generate_post_variations(post_type: str, notes: str, business_brain: dict, media_notes: str = "") -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"nova-compose-{uuid.uuid4()}",
        system_message=NOVA_COMPOSE_SYSTEM_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    context = f"""Business context:
- Business: {business_brain.get('business_name', "Dillard's Irrigation Repair LLC")}
- Page: {business_brain.get('page_name', "Dillard's Irrigation Repair")}
- Location: {business_brain.get('location', 'Sanford, Florida')}
- Service area: {business_brain.get('service_area', '')}
- Services: {', '.join(business_brain.get('services', []))}
- Hours: {business_brain.get('hours', '')}
- Contact methods: {business_brain.get('contact_methods', '')}
- Approved phrases: {', '.join(business_brain.get('approved_phrases', []))}
- Phrases to avoid: {', '.join(business_brain.get('phrases_to_avoid', []))}
- Brand voice: {business_brain.get('brand_voice', '')}

Post type requested: {post_type}
Field notes from technician: {notes}
Attached media notes: {media_notes or 'none'}

Generate the 3 post variations and quality check now as strict JSON."""

    raw_text = await chat.send_message(UserMessage(text=context))
    return _parse_json_response(raw_text)


async def classify_inbox_item(message: str, business_brain: dict) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"nova-classify-{uuid.uuid4()}",
        system_message=NOVA_CLASSIFY_SYSTEM_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    faqs = business_brain.get("faqs", [])
    faq_text = "; ".join(f"{f.get('question')} -> {f.get('answer')}" for f in faqs)
    context = f"""Business context:
- Services: {', '.join(business_brain.get('services', []))}
- Service area: {business_brain.get('service_area', '')}
- Hours: {business_brain.get('hours', '')}
- FAQs: {faq_text or 'none'}

Incoming message: "{message}"

Classify and draft a reply now as strict JSON."""

    raw_text = await chat.send_message(UserMessage(text=context))
    return _parse_json_response(raw_text)
