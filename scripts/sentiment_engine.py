import pandas as pd
import json
import os
import torch
from datetime import datetime
from transformers import pipeline

# --- CONFIGURATION ---
INPUT_DIR = '../server/data'
OUTPUT_FILE_DETAILED = '../server/data/enriched_comments_sentiment.csv'
OUTPUT_FILE_SUMMARY = '../server/data/platform_sentiment_summary.json'
OUTPUT_FILE_HISTORY = '../server/data/sentiment_history.csv'
MODEL_ID = "cardiffnlp/twitter-xlm-roberta-base-sentiment"

def update_history(summary_data):
    """Appends current health scores to a history CSV for the trend chart."""
    print("Updating sentiment history log...")

    file_exists = os.path.isfile(OUTPUT_FILE_HISTORY)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Check if this exact timestamp already exists to prevent duplicates
    if file_exists:
        existing_df = pd.read_csv(OUTPUT_FILE_HISTORY)
        if timestamp in existing_df['timestamp'].values:
            print(f"⚠️ Skipping history update - timestamp {timestamp} already exists")
            return

    history_rows = []
    for item in summary_data:
        history_rows.append({
            "timestamp": timestamp,
            "platform": item['platform'],
            "health_score": item['health_score']
        })

    if history_rows:
        history_df = pd.DataFrame(history_rows)
        # Append to CSV: header=False if file already exists
        history_df.to_csv(OUTPUT_FILE_HISTORY, mode='a', index=False, header=not file_exists)
        print(f"✅ History updated in: {OUTPUT_FILE_HISTORY}")

def run_full_pipeline():
    print("--- Starting AI Sentiment Pipeline ---")

    # 1. LOAD DATA
    comments_path = os.path.join(INPUT_DIR, 'synthetic_comments_data.csv')
    if not os.path.exists(comments_path):
        print(f"Error: {comments_path} not found.")
        return

    df = pd.read_csv(comments_path)
    if df.empty:
        print("Warning: synthetic_comments_data.csv is empty.")
        return
    
    # 2. INITIALIZE AI MODEL (XLM-RoBERTa)
    print(f"Loading Model: {MODEL_ID}...")
    sentiment_pipe = pipeline(
        "sentiment-analysis", 
        model=MODEL_ID, 
        tokenizer=MODEL_ID,
        use_fast=False,
        device=0 if torch.cuda.is_available() else -1
    )

    # 3. RUN ANALYSIS
    print(f"Analyzing {len(df)} comments. Processing...")
    texts = df['comment_text'].astype(str).tolist()
    results = sentiment_pipe(texts)

    # Standardizing labels (XLM-RoBERTa can return LABEL_0, etc., or direct text)
    label_map = {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive",
        "negative": "negative",
        "neutral": "neutral",
        "positive": "positive"
    }

    df['label'] = [label_map.get(r['label'], r['label']) for r in results]
    df['score'] = [round(r['score'], 4) for r in results]

    # 4. MAP PLATFORMS
    print("Mapping posts to platforms...")
    platforms = ['instagram', 'twitter', 'facebook', 'linkedin']
    post_to_platform = {}

    for p in platforms:
        file_path = os.path.join(INPUT_DIR, f'{p}_organic_posts.csv')
        if os.path.exists(file_path):
            temp_df = pd.read_csv(file_path)
            for pid in temp_df['post_id']:
                post_to_platform[pid] = p.capitalize()

    # Apply mapping, defaulting to 'General' if post_id is unknown
    df['platform'] = df['post_id'].map(post_to_platform).fillna('General')

    # 5. DETECT LANGUAGES
    print("Detecting languages...")
    import re

    def detect_language(text):
        """
        Improved language detection:
        - Handles Hinglish (mix of Hindi and English)
        - More robust for short text with emojis
        - Uses pattern matching for common Hinglish words
        """
        try:
            text_str = str(text).strip()

            # Remove emojis, numbers, and special characters for better detection
            # Emoji ranges: emoticons, symbols, pictographs, transport, flags
            emoji_pattern = r'[0-9]+\.|\U0001F600-\U0001F64F|\U0001F300-\U0001F5FF|\U0001F680-\U0001F6FF|\U0001F1E0-\U0001F1FF|\U00002702-\U000027B0|\U000024C2-\U0001F251|\U0001F900-\U0001F9FF|\U0001FA00-\U0001FA6F'
            clean_text = re.sub(emoji_pattern, '', text_str)
            clean_text = clean_text.strip()

            # If text is too short after cleaning, default to English
            if len(clean_text) < 3:
                return 'en'

            # Check for Devanagari script (Hindi characters)
            has_hindi_script = bool(re.search(r'[\u0900-\u097F]', text_str))

            # Common Hinglish/Hindi words (transliterated)
            hinglish_words = [
                'hai', 'hain', 'tha', 'thi', 'kar', 'kya', 'yeh', 'woh', 'mast',
                'ekdum', 'bohot', 'bahut', 'achha', 'accha', 'theek', 'thik',
                'karo', 'karna', 'kitna', 'kitne', 'aur', 'ka', 'ki', 'ke',
                'nahi', 'nahin', 'bilkul', 'sahi', 'galat', 'kuch', 'kab',
                'kahan', 'kaun', 'kyun', 'kaise', 'abhi', 'ab', 'phir',
                'dekho', 'dekh', 'sunna', 'suno', 'bola', 'boli', 'gaya',
                'gayi', 'lena', 'liya', 'dena', 'diya', 'kapde', 'comfy'
            ]

            # Convert to lowercase for matching
            text_lower = clean_text.lower()

            # Count Hinglish words
            hinglish_count = sum(1 for word in hinglish_words if f' {word} ' in f' {text_lower} ' or text_lower.startswith(word + ' ') or text_lower.endswith(' ' + word))

            # Check for English words (basic heuristic)
            english_words = text_lower.split()
            has_english = len(english_words) > 0

            # Classification logic
            if has_hindi_script and has_english:
                return 'hinglish'  # Mix of Hindi script and English
            elif has_hindi_script:
                return 'hi'  # Pure Hindi (Devanagari script)
            elif hinglish_count >= 2:
                return 'hinglish'  # Multiple Hinglish words detected
            elif hinglish_count == 1 and len(english_words) <= 5:
                return 'hinglish'  # Short text with Hinglish word
            else:
                return 'en'  # Default to English

        except Exception as e:
            print(f"Warning: Language detection error for text: {text[:50]}... - Error: {e}")
            return 'en'  # Default to English on error

    df['language'] = df['comment_text'].apply(detect_language)

    # Save detailed CSV for the Action Center
    df.to_csv(OUTPUT_FILE_DETAILED, index=False)
    print(f"✅ Detailed sentiment saved to: {OUTPUT_FILE_DETAILED}")

    # 6. GENERATE SUMMARY FOR FRONTEND
    print("Generating Platform Summary...")
    summary_data = []
    
    # Calculate health scores per platform (grouping by mapped platform)
    for platform, group in df.groupby('platform'):
        counts = group['label'].value_counts(normalize=True) * 100
        pos = counts.get('positive', 0)
        neg = counts.get('negative', 0)
        neu = counts.get('neutral', 0)
        
        # Health Score Logic: (Positive weight 1.0) + (Neutral weight 0.5)
        health_score = pos + (neu * 0.5)

        summary_data.append({
            "platform": platform,
            "health_score": round(health_score, 2),
            "distribution": {
                "positive": round(pos, 1),
                "neutral": round(neu, 1),
                "negative": round(neg, 1)
            },
            "total_comments": len(group)
        })

    # Save JSON summary for Gauges
    with open(OUTPUT_FILE_SUMMARY, 'w') as f:
        json.dump(summary_data, f, indent=4)
    
    # Update the history log for the Trend Chart
    update_history(summary_data)
    
    print(f"✅ Summary JSON saved to: {OUTPUT_FILE_SUMMARY}")
    print("--- Pipeline Complete ---")

if __name__ == "__main__":
    run_full_pipeline()