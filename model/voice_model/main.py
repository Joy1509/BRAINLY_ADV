import sys
import getpass
from voice_auth_system import VoiceAuthSystem
from utils import log_info, log_error, log_success, log_warning

def show_main_menu():
    """Display main menu options"""
    print("\n" + "="*50)
    print("     🎤 VOICE AUTHENTICATION SYSTEM 🎤")
    print("="*50)
    print("1. Register New User")
    print("2. Voice Login")
    print("3. Test Voice Recognition")
    print("4. List Users")
    print("5. User Statistics")
    print("6. Update Passphrase")
    print("7. Delete User")
    print("8. System Status")
    print("9. Exit")
    print("="*50)

def register_user(voice_auth: VoiceAuthSystem):
    """Register a new user with voice passphrase"""
    print("\n=== USER REGISTRATION ===")
    
    try:
        # Get user input
        username = input("Enter username: ").strip()
        if not username:
            print("Username cannot be empty!")
            return
        
        passphrase = input("Enter passphrase to speak (min 3 words recommended): ").strip()
        if not passphrase:
            print("Passphrase cannot be empty!")
            return
        
        password = getpass.getpass("Enter encryption password: ").strip()
        if not password:
            print("Password cannot be empty!")
            return
        
        print(f"\nRegistering user: {username}")
        print(f"Passphrase: '{passphrase}'")
        print("\nYou will be asked to speak the passphrase 3 times for better accuracy.")
        print("Make sure you're in a quiet environment with a working microphone.")
        
        input("Press Enter when ready to start recording...")
        
        # Register user
        success = voice_auth.register_user_voice(username, passphrase, password)
        
        if success:
            print(f"\n✅ SUCCESS: User '{username}' registered successfully!")
            print("You can now use voice login with this passphrase.")
        else:
            print("\n❌ FAILED: User registration failed. Please try again.")
            
    except KeyboardInterrupt:
        print("\nRegistration cancelled by user.")
    except Exception as e:
        log_error(f"Registration error: {e}")

def voice_login(voice_auth: VoiceAuthSystem):
    """Perform voice authentication login"""
    print("\n=== VOICE LOGIN ===")
    
    try:
        # Get user input
        username = input("Enter username: ").strip()
        if not username:
            print("Username cannot be empty!")
            return
        
        password = getpass.getpass("Enter encryption password: ").strip()
        if not password:
            print("Password cannot be empty!")
            return
        
        print(f"\nAuthentication for user: {username}")
        print("You will have up to 3 attempts to speak your passphrase.")
        print("Speak clearly and wait for the recording prompt.")
        
        input("Press Enter when ready to start authentication...")
        
        # Perform authentication
        result = voice_auth.authenticate_user_voice(username, password)
        
        if result["success"]:
            print(f"\n🎉 LOGIN SUCCESSFUL!")
            print(f"Welcome, {username}!")
            print(f"Confidence Score: {result['confidence']:.2f}")
        else:
            print(f"\n🔒 LOGIN FAILED")
            print(f"Reason: {result['message']}")
            
    except KeyboardInterrupt:
        print("\nLogin cancelled by user.")
    except Exception as e:
        log_error(f"Login error: {e}")

def test_voice_recognition(voice_auth: VoiceAuthSystem):
    """Test voice recognition without authentication"""
    print("\n=== VOICE RECOGNITION TEST ===")
    
    try:
        print("This will test your microphone and speech recognition.")
        print("Speak anything you want after the recording starts.")
        
        input("Press Enter to start voice test...")
        
        result = voice_auth.test_voice_recognition()
        
        if result:
            print(f"\n✅ Voice Test Successful!")
            print(f"Recognized Text: '{result}'")
        else:
            print("\n❌ Voice Test Failed!")
            print("Please check your microphone and try again.")
            
    except KeyboardInterrupt:
        print("\nVoice test cancelled by user.")
    except Exception as e:
        log_error(f"Voice test error: {e}")

def list_users(voice_auth: VoiceAuthSystem):
    """List all registered users"""
    print("\n=== REGISTERED USERS ===")
    
    try:
        users = voice_auth.list_registered_users()
        
        if users:
            print(f"Total registered users: {len(users)}")
            print("\nUsernames:")
            for i, username in enumerate(users, 1):
                print(f"{i}. {username}")
        else:
            print("No users registered yet.")
            
    except Exception as e:
        log_error(f"Error listing users: {e}")

def show_user_statistics(voice_auth: VoiceAuthSystem):
    """Show statistics for a specific user"""
    print("\n=== USER STATISTICS ===")
    
    try:
        username = input("Enter username: ").strip()
        if not username:
            print("Username cannot be empty!")
            return
        
        stats = voice_auth.get_user_statistics(username)
        
        if stats:
            print(f"\nStatistics for user: {username}")
            print("-" * 30)
            print(f"Registered: {stats['registered_at']}")
            print(f"Total login attempts: {stats['login_attempts']}")
            print(f"Successful logins: {stats['successful_logins']}")
            print(f"Success rate: {stats['success_rate']:.1f}%")
            if stats['last_successful_login']:
                print(f"Last successful login: {stats['last_successful_login']}")
        else:
            print(f"User '{username}' not found.")
            
    except Exception as e:
        log_error(f"Error getting user statistics: {e}")

def update_user_passphrase(voice_auth: VoiceAuthSystem):
    """Update passphrase for existing user"""
    print("\n=== UPDATE PASSPHRASE ===")
    
    try:
        username = input("Enter username: ").strip()
        if not username:
            print("Username cannot be empty!")
            return
        
        new_passphrase = input("Enter new passphrase: ").strip()
        if not new_passphrase:
            print("Passphrase cannot be empty!")
            return
        
        password = getpass.getpass("Enter encryption password: ").strip()
        if not password:
            print("Password cannot be empty!")
            return
        
        success = voice_auth.update_user_passphrase(username, new_passphrase, password)
        
        if success:
            print(f"✅ Passphrase updated successfully for user '{username}'")
        else:
            print(f"❌ Failed to update passphrase for user '{username}'")
            
    except Exception as e:
        log_error(f"Error updating passphrase: {e}")

def delete_user(voice_auth: VoiceAuthSystem):
    """Delete user and all associated data"""
    print("\n=== DELETE USER ===")
    
    try:
        username = input("Enter username to delete: ").strip()
        if not username:
            print("Username cannot be empty!")
            return
        
        # Confirmation
        confirm = input(f"Are you sure you want to delete user '{username}'? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("User deletion cancelled.")
            return
        
        success = voice_auth.delete_user(username)
        
        if success:
            print(f"✅ User '{username}' deleted successfully")
        else:
            print(f"❌ Failed to delete user '{username}'")
            
    except Exception as e:
        log_error(f"Error deleting user: {e}")

def show_system_status(voice_auth: VoiceAuthSystem):
    """Show current system status"""
    print("\n=== SYSTEM STATUS ===")
    
    try:
        status = voice_auth.get_system_status()
        
        print(f"System Ready: {'✅ Yes' if status['system_ready'] else '❌ No'}")
        print(f"Microphone Available: {'✅ Yes' if status['microphone_available'] else '❌ No'}")
        print(f"Available Engines: {', '.join(status['available_engines'])}")
        print(f"Registered Users: {status['registered_users']}")
        print(f"Data Directory: {status['data_directory']}")
        print(f"Audio Samples Directory: {status['audio_samples_directory']}")
        
    except Exception as e:
        log_error(f"Error getting system status: {e}")

def main():
    """Main application entry point"""
    try:
        print("Initializing Voice Authentication System...")
        voice_auth = VoiceAuthSystem()
        
        if not voice_auth.system_ready:
            print("❌ System initialization failed!")
            print("Please check your microphone and dependencies.")
            print("Run: pip install -r requirements.txt")
            return
        
        print("✅ System ready!")
        
        while True:
            try:
                show_main_menu()
                choice = input("Enter your choice (1-9): ").strip()
                
                if choice == '1':
                    register_user(voice_auth)
                elif choice == '2':
                    voice_login(voice_auth)
                elif choice == '3':
                    test_voice_recognition(voice_auth)
                elif choice == '4':
                    list_users(voice_auth)
                elif choice == '5':
                    show_user_statistics(voice_auth)
                elif choice == '6':
                    update_user_passphrase(voice_auth)
                elif choice == '7':
                    delete_user(voice_auth)
                elif choice == '8':
                    show_system_status(voice_auth)
                elif choice == '9':
                    print("\nGoodbye! 👋")
                    break
                else:
                    print("❌ Invalid choice. Please enter 1-9.")
                    
            except KeyboardInterrupt:
                print("\n\nExiting...")
                break
                
    except ImportError as e:
        log_error("Missing required library. Please run: pip install -r requirements.txt")
        log_error(f"Import error: {e}")
    except Exception as e:
        log_error(f"System error: {e}")
        print("Please check your system configuration and try again.")

if __name__ == "__main__":
    main()