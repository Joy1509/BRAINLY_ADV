#!/usr/bin/env python3
"""
Test script for voice authentication system
"""

import sys
import os

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

from voice_recorder import VoiceRecorder
from speech_converter import SpeechConverter
from utils import log_info, log_error

def test_microphone():
    """Test microphone functionality"""
    print("Testing microphone...")
    recorder = VoiceRecorder()
    
    if recorder.test_microphone():
        print("✅ Microphone test passed")
        return True
    else:
        print("❌ Microphone test failed")
        return False

def test_speech_engines():
    """Test speech recognition engines"""
    print("Testing speech recognition engines...")
    converter = SpeechConverter()
    
    engines = converter.get_available_engines()
    print(f"Available engines: {engines}")
    
    if engines:
        print("✅ Speech recognition engines available")
        return True
    else:
        print("❌ No speech recognition engines available")
        return False

def test_recording_and_recognition():
    """Test recording and recognition"""
    print("Testing recording and recognition...")
    print("Say 'hello' when prompted...")
    
    recorder = VoiceRecorder()
    converter = SpeechConverter()
    
    try:
        # Record audio
        audio_data = recorder.record_with_silence_detection(max_duration=5.0)
        
        if not audio_data:
            print("[FAIL] No audio recorded")
            return False
            
        print("Audio recorded successfully")
        
        # Try recognition with different engines
        for engine in converter.get_available_engines():
            print(f"Testing {engine} engine...")
            result = converter.audio_bytes_to_text(audio_data, engine)
            
            if result:
                print(f"[PASS] {engine}: '{result}'")
            else:
                print(f"[FAIL] {engine}: No result")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("VOICE AUTHENTICATION SYSTEM - TESTS")
    print("=" * 50)
    
    tests = [
        test_microphone,
        test_speech_engines,
        test_recording_and_recognition
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print("-" * 30)
        except Exception as e:
            print(f"[ERROR] Test error: {e}")
            print("-" * 30)
    
    print(f"\nTest Results: {passed}/{total} passed")
    
    if passed == total:
        print("All tests passed! The system is ready to use.")
    else:
        print("Some tests failed. Check the issues above.")

if __name__ == "__main__":
    main()