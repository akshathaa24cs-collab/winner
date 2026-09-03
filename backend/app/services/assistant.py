import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def generate_reply(
    message: str,
    language: str,
    api_url: str,
    api_key: str,
    model: str,
    ollama_url: str,
    ollama_model: str,
) -> tuple[str, str]:
    prompt = (
        "You are AgriSahayak, a concise agricultural assistant for Indian farmers. "
        f"Reply in {language}. Give practical, safe advice in under 60 words. Farmer says: {message}"
    )
    if api_key:
        payload = json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 120,
        }).encode()
        request = Request(api_url, data=payload, headers={
            "Content-Type": "application/json", "Authorization": f"Bearer {api_key}"
        })
        try:
            with urlopen(request, timeout=8) as response:
                result = json.loads(response.read())
                reply = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if reply:
                    return reply, "cloud-ai"
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError, IndexError, AttributeError):
            pass

    ollama_payload = json.dumps({"model": ollama_model, "prompt": prompt, "stream": False}).encode()
    ollama_request = Request(ollama_url, data=ollama_payload, headers={"Content-Type": "application/json"})
    try:
        with urlopen(ollama_request, timeout=3) as response:
            result = json.loads(response.read())
            reply = result.get("response", "").strip()
            if reply:
                return reply, "ollama"
    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError):
        pass

    return (
        "I can help with crop care, grading, and finding the best buyer for your harvest. "
        "Upload a clear crop photo so I can assess it next.",
        "local-fallback",
    )