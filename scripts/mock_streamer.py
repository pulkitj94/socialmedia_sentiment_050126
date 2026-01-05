import pandas as pd
import random
import time
import requests
import os
import sys
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv

# Load API Key from your .env
load_dotenv(dotenv_path='../.env')
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- CONFIG ---
DATA_DIR = '../server/data'
REFRESH_URL = 'http://localhost:3001/api/sentiment/refresh'

def generate_ai_comments(scenario="normal", count=1):
    """Uses GPT to generate highly realistic social media comments."""
    prompts = {
        "normal": "Generate a mix of short positive and neutral social media comments for a sustainable clothing brand. Use some Hinglish.",
        "crisis": "Generate angry customer complaints about a website crash, broken items, or shipping delays for a brand.",
        "viral": "Generate highly excited, fan-girl style comments about a new sustainable collection launch. Use 'Love this!', 'Finally!', and lots of emojis."
    }
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": f"{prompts.get(scenario, 'normal')} Return {count} comments as a simple list, one per line. Max 15 words per comment. Use emojis."}]
        )
        return response.choices[0].message.content.strip().split('\n')
    except Exception as e:
        print(f"⚠️ OpenAI Error: {e}")
        return ["Great quality!", "When is the next sale?", "Delivery was slow."]

def update_csv(file_name, logic_func):
    path = os.path.join(DATA_DIR, file_name)
    if os.path.exists(path):
        df = pd.read_csv(path)
        df = logic_func(df)
        df.to_csv(path, index=False)
        return True
    return False

def run_simulation_cycle(scenario="normal"):
    print(f"🎬 [SCENARIO: {scenario.upper()}] - Updating all 8 CSVs...")

    # 1. UPDATE COMMENTS (Higher count for viral/crisis)
    comment_count = 10 if scenario == "viral" else (5 if scenario == "crisis" else 1)
    new_comment_texts = generate_ai_comments(scenario, count=comment_count)
    
    def comment_logic(df):
        new_rows = []
        for text in new_comment_texts:
            new_rows.append({
                "comment_id": f"C_{random.randint(5000, 9999)}",
                "post_id": f"POST_000{random.randint(1,4)}",
                "user_handle": f"user_{random.randint(100,999)}",
                "comment_text": text.strip(),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
        return pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
    
    update_csv('synthetic_comments_data.csv', comment_logic)

    # 2. UPDATE ORGANIC ENGAGEMENT (Growth/Crisis/Viral Logic)
    organic_files = ['facebook_organic_posts.csv', 'instagram_organic_posts.csv', 'linkedin_organic_posts.csv', 'twitter_organic_posts.csv']
    
    def organic_logic(df):
        idx = random.randint(0, len(df)-1)
        
        if scenario == "viral":
            # Massive spike for Viral Growth
            df.loc[idx, 'impressions'] += random.randint(5000, 15000)
            df.loc[idx, 'reach'] += random.randint(2000, 8000)
            df.loc[idx, 'likes'] += random.randint(800, 2500)
            df.loc[idx, 'shares'] += random.randint(100, 400)
        elif scenario == "crisis":
            # High impressions (bad news travels fast), but low likes
            df.loc[idx, 'impressions'] += random.randint(1000, 3000)
            df.loc[idx, 'reach'] += random.randint(500, 1500)
            df.loc[idx, 'likes'] += random.randint(0, 5)
        else:
            # Normal slow growth
            df.loc[idx, 'impressions'] += random.randint(20, 100)
            df.loc[idx, 'reach'] += random.randint(10, 50)
            df.loc[idx, 'likes'] += random.randint(5, 20)
            
        return df

    for f in organic_files: update_csv(f, organic_logic)

    # 3. UPDATE ADS PERFORMANCE
    ads_files = ['facebook_ads_ad_campaigns.csv', 'google_ads_ad_campaigns.csv', 'instagram_ads_ad_campaigns.csv']
    
    def ads_logic(df):
        idx = random.randint(0, len(df)-1)
        # Viral events usually drive organic traffic, but we simulate increased click interest
        click_bump = random.randint(200, 600) if scenario == "viral" else random.randint(5, 15)
        df.loc[idx, 'clicks'] += click_bump
        df.loc[idx, 'total_spend'] += round(random.uniform(2.0, 15.0), 2)
        return df

    for f in ads_files: update_csv(f, ads_logic)

    print(f"✅ Simulation Complete for {scenario}. Triggering Dashboard Refresh...")
    try: requests.post(REFRESH_URL, timeout=5)
    except: pass

if __name__ == "__main__":
    args = [a.replace('--', '') for a in sys.argv]
    
    if "once" in args or "normal" in args:
        run_simulation_cycle("normal")
    elif "crisis" in args:
        run_simulation_cycle("crisis")
    elif "viral" in args:
        run_simulation_cycle("viral")
    else:
        # CHANGED: Trigger time set to 120 seconds (2 minutes)
        print("🚀 Background Loop Started (Every 2 Minutes)...")
        while True:
            run_simulation_cycle("normal")
            time.sleep(3600)