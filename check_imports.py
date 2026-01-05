try:
    from langdetect import detect
    print("langdetect is available")
except ImportError:
    print("langdetect is NOT available")
